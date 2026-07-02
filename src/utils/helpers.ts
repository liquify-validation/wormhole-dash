import { formatDistanceToNow } from 'date-fns';
import type { Heartbeat } from '../types';

/**
 * Number of guardians actively syncing each chain, keyed by chainId. A guardian
 * counts as active on a chain when its heartbeat reports a block height > 0 for
 * that chain — the same "healthy guardian" definition used in the chain overview.
 */
export function getGuardiansPerChain(heartbeats: Heartbeat[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const hb of heartbeats) {
    for (const net of hb.networks || []) {
      if ((parseInt(net.height) || 0) > 0) {
        counts[net.id] = (counts[net.id] || 0) + 1;
      }
    }
  }
  return counts;
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
