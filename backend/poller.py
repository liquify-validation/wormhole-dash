"""Background poller that fetches data from Wormhole APIs and caches results."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

import httpx

from config import (
    ENDPOINTS,
    GUARDIAN_RPC,
    WORMHOLESCAN,
    HEARTBEAT_INTERVAL,
    GOVERNOR_INTERVAL,
    WORMHOLESCAN_INTERVAL,
)

logger = logging.getLogger(__name__)


class DataCache:
    """Thread-safe in-memory cache for all polled data."""

    def __init__(self):
        self._data: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def set(self, endpoint_key: str, data_type: str, data: Any):
        async with self._lock:
            if endpoint_key not in self._data:
                self._data[endpoint_key] = {}
            self._data[endpoint_key][data_type] = {
                "data": data,
                "timestamp": time.time(),
            }

    async def get(self, endpoint_key: str, data_type: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._data.get(endpoint_key, {}).get(data_type)

    async def get_all(self, endpoint_key: str) -> Dict[str, Any]:
        async with self._lock:
            ep_data = self._data.get(endpoint_key, {})
            return {
                dtype: entry["data"]
                for dtype, entry in ep_data.items()
            }

    async def get_snapshot(self, endpoint_key: str) -> Dict[str, Any]:
        """Get a full snapshot suitable for sending to clients."""
        async with self._lock:
            ep_data = self._data.get(endpoint_key, {})
            snapshot = {}
            latest_ts = 0
            for dtype, entry in ep_data.items():
                snapshot[dtype] = entry["data"]
                latest_ts = max(latest_ts, entry["timestamp"])
            snapshot["_timestamp"] = latest_ts
            return snapshot


cache = DataCache()


def _parse_heartbeats(data: Any) -> List[Dict]:
    """Parse heartbeat response from various API formats."""
    heartbeats = []

    if isinstance(data, dict):
        if "entries" in data and isinstance(data["entries"], list):
            # Guardian gRPC: { entries: [{ verifiedHeartbeat: { heartbeat: ... } }] }
            for entry in data["entries"]:
                hb = (
                    entry.get("verifiedHeartbeat", {}).get("heartbeat")
                    if isinstance(entry, dict)
                    else None
                )
                if hb:
                    heartbeats.append(hb)
        elif "heartbeats" in data and isinstance(data["heartbeats"], list):
            # Cloud function: { heartbeats: [...flat objects...] }
            heartbeats = [h for h in data["heartbeats"] if h]
    elif isinstance(data, list):
        for entry in data:
            if isinstance(entry, dict):
                hb = entry.get("verifiedHeartbeat", {}).get("heartbeat", entry)
                if hb:
                    heartbeats.append(hb)

    heartbeats.sort(key=lambda h: h.get("nodeName", ""))
    return heartbeats


async def _fetch_json(client: httpx.AsyncClient, url: str) -> Any:
    """Fetch JSON from a URL with error handling."""
    resp = await client.get(url, timeout=15)
    resp.raise_for_status()
    return resp.json()


async def poll_heartbeats(client: httpx.AsyncClient, key: str, ep: dict):
    """Poll heartbeats for a single endpoint."""
    while True:
        try:
            if ep["type"] == "cloudfunction":
                url = f"{ep['url']}/guardian-heartbeats"
            else:
                url = f"{ep['url']}/v1/heartbeats"

            data = await _fetch_json(client, url)
            heartbeats = _parse_heartbeats(data)
            await cache.set(key, "heartbeats", heartbeats)
            logger.debug(f"[{key}] Fetched {len(heartbeats)} heartbeats")
        except Exception as e:
            logger.warning(f"[{key}] Heartbeat poll failed: {e}")

        await asyncio.sleep(HEARTBEAT_INTERVAL)


async def poll_guardian_set(client: httpx.AsyncClient, key: str, ep: dict):
    """Poll guardian set info."""
    while True:
        try:
            if ep["type"] == "cloudfunction":
                try:
                    data = await _fetch_json(client, f"{ep['url']}/guardian-set-info")
                except Exception:
                    data = await _fetch_json(
                        client, f"{GUARDIAN_RPC}/v1/guardianset/current"
                    )
            else:
                data = await _fetch_json(
                    client, f"{ep['url']}/v1/guardianset/current"
                )
            await cache.set(key, "guardianSet", data)
        except Exception as e:
            logger.warning(f"[{key}] Guardian set poll failed: {e}")

        await asyncio.sleep(GOVERNOR_INTERVAL)


async def poll_governor(client: httpx.AsyncClient, key: str, ep: dict):
    """Poll governor APIs (notionals, enqueued VAAs, tokens)."""
    base = ep["url"] if ep["type"] == "guardian" else GUARDIAN_RPC

    while True:
        try:
            notionals_data, enqueued_data, tokens_data = await asyncio.gather(
                _fetch_json(client, f"{base}/v1/governor/available_notional_by_chain"),
                _fetch_json(client, f"{base}/v1/governor/enqueued_vaas"),
                _fetch_json(client, f"{base}/v1/governor/token_list"),
                return_exceptions=True,
            )

            notionals = (
                notionals_data.get("entries", [])
                if isinstance(notionals_data, dict)
                else []
            )
            enqueued = (
                enqueued_data.get("entries", [])
                if isinstance(enqueued_data, dict)
                else []
            )
            tokens = (
                tokens_data.get("entries", [])
                if isinstance(tokens_data, dict)
                else []
            )

            await cache.set(key, "governor", {
                "notionals": notionals,
                "enqueuedVAAs": enqueued,
                "tokens": tokens,
            })
        except Exception as e:
            logger.warning(f"[{key}] Governor poll failed: {e}")

        await asyncio.sleep(GOVERNOR_INTERVAL)


async def poll_wormholescan(client: httpx.AsyncClient):
    """Poll Wormholescan APIs (shared across all endpoints)."""
    while True:
        try:
            scorecards, hourly, txs, flows = await asyncio.gather(
                _fetch_json(client, f"{WORMHOLESCAN}/scorecards"),
                _fetch_json(client, f"{WORMHOLESCAN}/last-txs"),
                _fetch_json(client, f"{WORMHOLESCAN}/transactions?page=0&pageSize=20"),
                _fetch_json(
                    client, f"{WORMHOLESCAN}/x-chain-activity?timeSpan=1d&by=notional"
                ),
                return_exceptions=True,
            )

            wormholescan_data = {
                "scorecards": scorecards if isinstance(scorecards, dict) else None,
                "hourlyCounts": hourly if isinstance(hourly, list) else [],
                "recentTxs": (
                    txs.get("transactions", []) if isinstance(txs, dict) else []
                ),
                "crossChainFlows": (
                    flows.get("txs", []) if isinstance(flows, dict) else []
                ),
            }

            # Store under a special "global" key since wormholescan data is shared
            await cache.set("__global__", "wormholescan", wormholescan_data)
            logger.debug("Fetched wormholescan data")
        except Exception as e:
            logger.warning(f"Wormholescan poll failed: {e}")

        await asyncio.sleep(WORMHOLESCAN_INTERVAL)


async def start_polling():
    """Start all background polling tasks."""
    client = httpx.AsyncClient(
        headers={"User-Agent": "WormholeDashboard/1.0"},
        follow_redirects=True,
    )

    tasks = []

    for key, ep in ENDPOINTS.items():
        tasks.append(asyncio.create_task(poll_heartbeats(client, key, ep)))
        tasks.append(asyncio.create_task(poll_guardian_set(client, key, ep)))
        tasks.append(asyncio.create_task(poll_governor(client, key, ep)))

    # Wormholescan is global (not per-endpoint)
    tasks.append(asyncio.create_task(poll_wormholescan(client)))

    logger.info(f"Started {len(tasks)} polling tasks for {len(ENDPOINTS)} endpoints")
    return tasks
