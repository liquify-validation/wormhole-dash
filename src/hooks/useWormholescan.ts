import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchScorecards,
  fetchHourlyCounts,
  fetchRecentTransactions,
  fetchCrossChainFlows,
  Scorecard,
  HourlyCount,
  RecentTransaction,
  CrossChainFlow,
} from '../utils/api';

export interface WormholescanState {
  scorecards: Scorecard | null;
  hourlyCounts: HourlyCount[];
  recentTxs: RecentTransaction[];
  crossChainFlows: CrossChainFlow[];
  loading: boolean;
  error: string | null;
}

export function useWormholescan() {
  const [state, setState] = useState<WormholescanState>({
    scorecards: null,
    hourlyCounts: [],
    recentTxs: [],
    crossChainFlows: [],
    loading: true,
    error: null,
  });
  const cancelRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const [scorecards, hourlyCounts, recentTxs, crossChainFlows] = await Promise.all([
        fetchScorecards(),
        fetchHourlyCounts(),
        fetchRecentTransactions(),
        fetchCrossChainFlows(),
      ]);
      if (cancelRef.current) return;
      setState({ scorecards, hourlyCounts, recentTxs, crossChainFlows, loading: false, error: null });
    } catch (err) {
      if (cancelRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch wormholescan data',
      }));
    }
  }, []);

  useEffect(() => {
    cancelRef.current = false;
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelRef.current = true;
      clearInterval(interval);
    };
  }, [load]);

  return state;
}
