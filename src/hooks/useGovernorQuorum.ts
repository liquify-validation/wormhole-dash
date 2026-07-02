import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchGovernorQuorum, GovernorQuorumInfo } from '../utils/api';

/**
 * Fetches cross-guardian governor status (via the env's public cloud function)
 * so enqueued VAAs can be checked against guardian quorum. Runs client-side and
 * is independent of the selected endpoint / backend mode.
 */
export function useGovernorQuorum(env: 'mainnet' | 'testnet') {
  const [info, setInfo] = useState<GovernorQuorumInfo>({ counts: {}, reporting: 0 });
  const cancelRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchGovernorQuorum(env);
      if (!cancelRef.current) setInfo(data);
    } catch {
      // Keep the previous snapshot on transient failures.
    }
  }, [env]);

  useEffect(() => {
    cancelRef.current = false;
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelRef.current = true;
      clearInterval(interval);
    };
  }, [load]);

  return info;
}
