import { useState, useEffect, useCallback, useRef } from 'react';
import type { Heartbeat, NetworkEndpoint } from '../types';
import { fetchHeartbeats } from '../utils/api';

export interface HeartbeatState {
  heartbeats: Heartbeat[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useHeartbeats(endpoint: NetworkEndpoint) {
  const [state, setState] = useState<HeartbeatState>({
    heartbeats: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });
  const cancelRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchHeartbeats(endpoint);
      if (cancelRef.current) return;

      let heartbeats: Heartbeat[] = [];
      if (data?.entries) {
        // Guardian gRPC endpoint: { entries: [{ verifiedHeartbeat: { heartbeat: ... } }] }
        heartbeats = data.entries
          .map((e: { verifiedHeartbeat?: { heartbeat?: Heartbeat } }) =>
            e?.verifiedHeartbeat?.heartbeat
          )
          .filter(Boolean) as Heartbeat[];
      } else if (data?.heartbeats && Array.isArray(data.heartbeats)) {
        // Cloud function endpoint: { heartbeats: [...flat heartbeat objects...] }
        heartbeats = data.heartbeats.filter(Boolean) as Heartbeat[];
      } else if (Array.isArray(data)) {
        heartbeats = data
          .map((e: { verifiedHeartbeat?: { heartbeat?: Heartbeat } }) =>
            e?.verifiedHeartbeat?.heartbeat || e
          )
          .filter(Boolean) as Heartbeat[];
      }

      heartbeats.sort((a, b) => a.nodeName.localeCompare(b.nodeName));

      setState({
        heartbeats,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err) {
      if (cancelRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch heartbeats',
      }));
    }
  }, [endpoint]);

  useEffect(() => {
    cancelRef.current = false;
    setState({ heartbeats: [], loading: true, error: null, lastUpdated: null });
    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelRef.current = true;
      clearInterval(interval);
    };
  }, [load]);

  return state;
}
