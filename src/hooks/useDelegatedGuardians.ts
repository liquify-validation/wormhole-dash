import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDelegatedGuardianConfig, DelegatedGuardianConfigMap } from '../utils/api';

/**
 * Per-chain delegate guardian config (which guardians watch a chain and the
 * quorum threshold), read from the mainnet delegated-guardian contract. Changes
 * rarely, so it polls infrequently. Empty on testnet.
 */
export function useDelegatedGuardians(env: 'mainnet' | 'testnet') {
  const [config, setConfig] = useState<DelegatedGuardianConfigMap>({});
  const cancelRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchDelegatedGuardianConfig(env);
      if (!cancelRef.current) setConfig(data);
    } catch {
      // Keep the previous snapshot on transient failures.
    }
  }, [env]);

  useEffect(() => {
    cancelRef.current = false;
    setConfig({});
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelRef.current = true;
      clearInterval(interval);
    };
  }, [load]);

  return config;
}
