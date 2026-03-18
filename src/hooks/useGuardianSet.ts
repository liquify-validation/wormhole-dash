import { useState, useEffect } from 'react';
import type { NetworkEndpoint } from '../types';
import { fetchGuardianSet } from '../utils/api';

interface GuardianSetState {
  guardianSet: { index: number; addresses: string[] } | null;
  loading: boolean;
  error: string | null;
}

export function useGuardianSet(endpoint: NetworkEndpoint) {
  const [state, setState] = useState<GuardianSetState>({
    guardianSet: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchGuardianSet(endpoint);
        if (cancelled) return;

        const guardianSet = data?.guardianSet || data;
        setState({
          guardianSet: {
            index: guardianSet?.index || 0,
            addresses: guardianSet?.addresses || [],
          },
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          guardianSet: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch guardian set',
        });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [endpoint]);

  return state;
}
