"""FastAPI backend for Wormhole Guardian Dashboard.

Polls Wormhole APIs centrally, caches results, and pushes updates
to connected frontend clients via WebSocket.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import ENDPOINTS
from poller import cache, start_polling

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wormhole Dashboard Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track connected WebSocket clients
clients: Set[WebSocket] = set()


# ── Lifecycle ───────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await start_polling()
    asyncio.create_task(broadcast_loop())
    logger.info("Backend started — polling and broadcasting")


# ── REST endpoints (fallback / health) ──────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "time": time.time()}


@app.get("/api/endpoints")
async def get_endpoints():
    """Return list of available endpoints."""
    return [
        {"key": key, **{k: v for k, v in ep.items()}}
        for key, ep in ENDPOINTS.items()
    ]


@app.get("/api/data/{endpoint_key}")
async def get_data(endpoint_key: str):
    """REST fallback: get cached data for a specific endpoint."""
    if endpoint_key not in ENDPOINTS:
        return JSONResponse({"error": "Unknown endpoint"}, status_code=404)

    snapshot = await cache.get_snapshot(endpoint_key)
    wormholescan = await cache.get("__global__", "wormholescan")

    return {
        "endpoint": endpoint_key,
        **snapshot,
        "wormholescan": wormholescan["data"] if wormholescan else None,
    }


# ── WebSocket ───────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    clients.add(ws)
    logger.info(f"Client connected ({len(clients)} total)")

    # Send current endpoint list
    await ws.send_json({
        "type": "endpoints",
        "data": [
            {"key": key, **{k: v for k, v in ep.items()}}
            for key, ep in ENDPOINTS.items()
        ],
    })

    # Default to mainnet cloud function
    selected_endpoint = "mainnet_cf"

    # Send initial data immediately
    await send_snapshot(ws, selected_endpoint)

    try:
        while True:
            msg = await ws.receive_text()
            try:
                payload = json.loads(msg)
                if payload.get("type") == "switch_endpoint":
                    new_key = payload.get("endpoint")
                    if new_key in ENDPOINTS:
                        selected_endpoint = new_key
                        await send_snapshot(ws, selected_endpoint)
                        logger.debug(f"Client switched to {new_key}")
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        clients.discard(ws)
        logger.info(f"Client disconnected ({len(clients)} total)")
    except Exception as e:
        clients.discard(ws)
        logger.warning(f"WebSocket error: {e}")


async def send_snapshot(ws: WebSocket, endpoint_key: str):
    """Send a full data snapshot to a single client."""
    snapshot = await cache.get_snapshot(endpoint_key)
    wormholescan = await cache.get("__global__", "wormholescan")

    await ws.send_json({
        "type": "snapshot",
        "endpoint": endpoint_key,
        **snapshot,
        "wormholescan": wormholescan["data"] if wormholescan else None,
    })


async def broadcast_loop():
    """Periodically broadcast fresh data to all connected clients.

    Each client gets data for the default endpoint. In a more advanced
    setup, we'd track per-client endpoint selection.
    """
    # For simplicity, broadcast all endpoints' data and let clients pick.
    while True:
        await asyncio.sleep(5)  # Broadcast every 5 seconds

        if not clients:
            continue

        # Build a combined payload with all endpoints
        all_data = {}
        for key in ENDPOINTS:
            all_data[key] = await cache.get_snapshot(key)

        wormholescan = await cache.get("__global__", "wormholescan")

        message = {
            "type": "update",
            "endpoints": all_data,
            "wormholescan": wormholescan["data"] if wormholescan else None,
            "timestamp": time.time(),
        }

        stale = set()
        for ws in clients.copy():
            try:
                await ws.send_json(message)
            except Exception:
                stale.add(ws)

        clients.difference_update(stale)
        if stale:
            logger.info(f"Cleaned {len(stale)} stale client(s)")


# ── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
