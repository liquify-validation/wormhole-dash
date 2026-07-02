import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchGovernorSigners } from '../utils/api';

/**
 * Map of enqueued-VAA key -> guardian addresses that currently hold it enqueued
 * (i.e. have observed & signed it). Sourced from the env cloud function's
 * cross-guardian governor status, independent of the selected endpoint.
 */
export function useGovernorSigners(env: 'mainnet' | 'testnet') {
  const [signers, setSigners] = useState<Record<string, string[]>>({});
  const cancelRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchGovernorSigners(env);
      if (!cancelRef.current) setSigners(data);
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

  return signers;
}
