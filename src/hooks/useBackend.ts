import { useState, useEffect, useCallback, useRef } from 'react';
import type { Heartbeat } from '../types';
import type {
  GovernorNotional,
  GovernorEnqueuedVAA,
  GovernorToken,
  Scorecard,
  HourlyCount,
  RecentTransaction,
  CrossChainFlow,
} from '../utils/api';

function getDefaultWsUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }
  return 'ws://localhost:8080/ws';
}

function getDefaultRestUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return 'http://localhost:8080';
}

const WS_URL = import.meta.env.VITE_WS_URL || getDefaultWsUrl();
const REST_URL = import.meta.env.VITE_API_URL || getDefaultRestUrl();

interface BackendEndpoint {
  key: string;
  name: string;
  url: string;
  type: string;
  env: string;
}

interface BackendState {
  connected: boolean;
  endpoints: BackendEndpoint[];
  selectedEndpoint: string;
  heartbeats: Heartbeat[];
  guardianSet: { index: number; addresses: string[] } | null;
  governor: {
    notionals: GovernorNotional[];
    enqueuedVAAs: GovernorEnqueuedVAA[];
    tokens: GovernorToken[];
  };
  wormholescan: {
    scorecards: Scorecard | null;
    hourlyCounts: HourlyCount[];
    recentTxs: RecentTransaction[];
    crossChainFlows: CrossChainFlow[];
  };
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

function parseGuardianSet(data: unknown): { index: number; addresses: string[] } | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const gsi = d.guardianSet as Record<string, unknown> | undefined;
  if (gsi) {
    return {
      index: Number(gsi.index || 0),
      addresses: (gsi.addresses as string[]) || [],
    };
  }
  return null;
}

export function useBackend() {
  const [state, setState] = useState<BackendState>({
    connected: false,
    endpoints: [],
    selectedEndpoint: 'mainnet_cf',
    heartbeats: [],
    guardianSet: null,
    governor: { notionals: [], enqueuedVAAs: [], tokens: [] },
    wormholescan: {
      scorecards: null,
      hourlyCounts: [],
      recentTxs: [],
      crossChainFlows: [],
    },
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const selectedEndpointRef = useRef(state.selectedEndpoint);

  // Keep ref in sync
  selectedEndpointRef.current = state.selectedEndpoint;

  const processUpdate = useCallback((data: Record<string, unknown>) => {
    const ep = selectedEndpointRef.current;

    // Handle "update" type (broadcast with all endpoints)
    if (data.type === 'update') {
      const endpoints = data.endpoints as Record<string, Record<string, unknown>>;
      const epData = endpoints?.[ep];
      const wormholescan = data.wormholescan as BackendState['wormholescan'] | null;

      if (epData) {
        const heartbeats = (epData.heartbeats || []) as Heartbeat[];
        const guardianSet = parseGuardianSet(epData.guardianSet);
        const gov = (epData.governor || {}) as Record<string, unknown>;

        setState((prev) => ({
          ...prev,
          heartbeats: heartbeats.length > 0 ? heartbeats : prev.heartbeats,
          guardianSet: guardianSet || prev.guardianSet,
          governor: {
            notionals: (gov.notionals as GovernorNotional[]) || prev.governor.notionals,
            enqueuedVAAs: (gov.enqueuedVAAs as GovernorEnqueuedVAA[]) || prev.governor.enqueuedVAAs,
            tokens: (gov.tokens as GovernorToken[]) || prev.governor.tokens,
          },
          wormholescan: wormholescan || prev.wormholescan,
          loading: false,
          lastUpdated: new Date(),
        }));
      }
      return;
    }

    // Handle "snapshot" type (initial data for selected endpoint)
    if (data.type === 'snapshot') {
      const heartbeats = (data.heartbeats || []) as Heartbeat[];
      const guardianSet = parseGuardianSet(data.guardianSet);
      const gov = (data.governor || {}) as Record<string, unknown>;
      const wormholescan = data.wormholescan as BackendState['wormholescan'] | null;

      setState((prev) => ({
        ...prev,
        heartbeats: heartbeats.length > 0 ? heartbeats : prev.heartbeats,
        guardianSet: guardianSet || prev.guardianSet,
        governor: {
          notionals: (gov.notionals as GovernorNotional[]) || prev.governor.notionals,
          enqueuedVAAs: (gov.enqueuedVAAs as GovernorEnqueuedVAA[]) || prev.governor.enqueuedVAAs,
          tokens: (gov.tokens as GovernorToken[]) || prev.governor.tokens,
        },
        wormholescan: wormholescan || prev.wormholescan,
        loading: false,
        lastUpdated: new Date(),
      }));
      return;
    }

    // Handle "endpoints" type
    if (data.type === 'endpoints') {
      setState((prev) => ({
        ...prev,
        endpoints: data.data as BackendEndpoint[],
      }));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, connected: true, error: null }));
      // Send the currently selected endpoint
      ws.send(JSON.stringify({
        type: 'switch_endpoint',
        endpoint: selectedEndpointRef.current,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        processUpdate(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, connected: false }));
      // Reconnect after 3 seconds
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      setState((prev) => ({
        ...prev,
        error: 'WebSocket connection failed — retrying...',
      }));
      ws.close();
    };
  }, [processUpdate]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Switch endpoint
  const switchEndpoint = useCallback((key: string) => {
    setState((prev) => ({ ...prev, selectedEndpoint: key, loading: true }));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'switch_endpoint',
        endpoint: key,
      }));
    }
  }, []);

  // Fallback: if WebSocket fails, try REST
  useEffect(() => {
    if (state.connected || !state.error) return;

    const fallback = async () => {
      try {
        const res = await fetch(`${REST_URL}/api/data/${state.selectedEndpoint}`);
        if (res.ok) {
          const data = await res.json();
          processUpdate({ type: 'snapshot', ...data });
        }
      } catch {
        // REST also failed, WebSocket will keep retrying
      }
    };

    const interval = setInterval(fallback, 10000);
    fallback();
    return () => clearInterval(interval);
  }, [state.connected, state.error, state.selectedEndpoint, processUpdate]);

  return {
    ...state,
    switchEndpoint,
  };
}
