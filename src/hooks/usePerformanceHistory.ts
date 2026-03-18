import { useState, useEffect, useCallback, useRef } from 'react';
import type { Heartbeat } from '../types';

export interface GuardianSnapshot {
  timestamp: number;
  guardians: {
    name: string;
    addr: string;
    counter: number;
    healthyChains: number;
    totalChains: number;
    signingChains: number; // chains with recent lastObservationSignedAt
  }[];
}

export interface PerformanceData {
  snapshots: GuardianSnapshot[];
  // Derived metrics per guardian
  counterRates: Map<string, number>; // counter increase per minute
  signingActivity: Map<string, number>; // chains actively signing
}

const MAX_SNAPSHOTS = 60; // Keep ~10 minutes of data at 10s intervals

export function usePerformanceHistory(heartbeats: Heartbeat[]): PerformanceData {
  const [snapshots, setSnapshots] = useState<GuardianSnapshot[]>([]);
  const lastSnapshotRef = useRef<number>(0);

  const recordSnapshot = useCallback(() => {
    if (heartbeats.length === 0) return;
    const now = Date.now();
    // Only record every ~10 seconds
    if (now - lastSnapshotRef.current < 8000) return;
    lastSnapshotRef.current = now;

    const snapshot: GuardianSnapshot = {
      timestamp: now,
      guardians: heartbeats.map((hb) => {
        const healthyChains = hb.networks?.filter((n) => parseInt(n.height) > 0).length || 0;
        const totalChains = hb.networks?.length || 0;
        const recentThreshold = now - 300000; // 5 minutes
        const signingChains = hb.networks?.filter((n) => {
          const ts = parseInt(n.lastObservationSignedAt);
          if (!ts) return false;
          const ms = ts > 1e15 ? ts / 1e6 : ts > 1e12 ? ts / 1e3 : ts * 1000;
          return ms > recentThreshold;
        }).length || 0;

        return {
          name: hb.nodeName || 'Unknown',
          addr: hb.guardianAddr,
          counter: parseInt(hb.counter) || 0,
          healthyChains,
          totalChains,
          signingChains,
        };
      }),
    };

    setSnapshots((prev) => {
      const next = [...prev, snapshot];
      if (next.length > MAX_SNAPSHOTS) next.shift();
      return next;
    });
  }, [heartbeats]);

  useEffect(() => {
    recordSnapshot();
  }, [recordSnapshot]);

  // Calculate derived metrics
  const counterRates = new Map<string, number>();
  const signingActivity = new Map<string, number>();

  if (snapshots.length >= 2) {
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const durationMin = (last.timestamp - first.timestamp) / 60000;

    if (durationMin > 0) {
      last.guardians.forEach((g) => {
        const firstG = first.guardians.find((fg) => fg.addr === g.addr);
        if (firstG) {
          const rate = (g.counter - firstG.counter) / durationMin;
          counterRates.set(g.addr, Math.max(0, rate));
        }
        signingActivity.set(g.addr, g.signingChains);
      });
    }
  } else if (snapshots.length === 1) {
    snapshots[0].guardians.forEach((g) => {
      signingActivity.set(g.addr, g.signingChains);
    });
  }

  return { snapshots, counterRates, signingActivity };
}
