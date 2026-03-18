import { useState, useEffect, useCallback, useRef } from 'react';
import type { NetworkEndpoint } from '../types';
import {
  fetchGovernorNotionals,
  fetchGovernorEnqueuedVAAs,
  fetchGovernorTokens,
  GovernorNotional,
  GovernorEnqueuedVAA,
  GovernorToken,
} from '../utils/api';

export interface GovernorState {
  notionals: GovernorNotional[];
  enqueuedVAAs: GovernorEnqueuedVAA[];
  tokens: GovernorToken[];
  loading: boolean;
  error: string | null;
}

export function useGovernor(endpoint: NetworkEndpoint) {
  const [state, setState] = useState<GovernorState>({
    notionals: [],
    enqueuedVAAs: [],
    tokens: [],
    loading: true,
    error: null,
  });
  const cancelRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const [notionals, enqueuedVAAs, tokens] = await Promise.all([
        fetchGovernorNotionals(endpoint),
        fetchGovernorEnqueuedVAAs(endpoint),
        fetchGovernorTokens(endpoint),
      ]);
      if (cancelRef.current) return;
      setState({ notionals, enqueuedVAAs, tokens, loading: false, error: null });
    } catch (err) {
      if (cancelRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch governor data',
      }));
    }
  }, [endpoint]);

  useEffect(() => {
    cancelRef.current = false;
    setState({ notionals: [], enqueuedVAAs: [], tokens: [], loading: true, error: null });
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelRef.current = true;
      clearInterval(interval);
    };
  }, [load]);

  return state;
}
