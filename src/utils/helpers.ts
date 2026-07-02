import { formatDistanceToNow } from 'date-fns';
import type { Heartbeat } from '../types';

/** Map guardian address (lowercased, no 0x prefix) -> node name, from heartbeats. */
export function getGuardianNames(heartbeats: Heartbeat[]): Record<string, string> {
  const names: Record<string, string> = {};
  for (const hb of heartbeats) {
    if (hb.guardianAddr) {
      names[hb.guardianAddr.toLowerCase().replace(/^0x/, '')] = hb.nodeName || 'Unknown';
    }
  }
  return names;
}

/** Normalize a guardian address for cross-source matching (lowercased, no 0x prefix). */
export function normGuardianAddr(addr: string): string {
  return (addr || '').toLowerCase().replace(/^0x/, '');
}
export function timeAgo(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  if (!ts || ts === 0) return 'Never';
  // Wormhole timestamps are in nanoseconds
  const ms = ts > 1e15 ? ts / 1e6 : ts > 1e12 ? ts / 1e3 : ts * 1000;
  try {
    return formatDistanceToNow(new Date(ms), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

export function formatNumber(n: string | number): string {
  const num = typeof n === 'string' ? parseInt(n) : n;
  if (isNaN(num)) return '0';
  return num.toLocaleString();
}

export function shortenAddress(addr: string, chars = 6): string {
  if (!addr) return '';
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

export function getHealthColor(healthy: number, total: number): string {
  const ratio = healthy / total;
  if (ratio >= 0.9) return 'text-emerald-400';
  if (ratio >= 0.67) return 'text-amber-400';
  return 'text-red-400';
}

export function getHealthBg(healthy: number, total: number): string {
  const ratio = healthy / total;
  if (ratio >= 0.9) return 'bg-emerald-500/20 border-emerald-500/30';
  if (ratio >= 0.67) return 'bg-amber-500/20 border-amber-500/30';
  return 'bg-red-500/20 border-red-500/30';
}
