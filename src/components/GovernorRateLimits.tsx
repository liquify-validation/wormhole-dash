import { useMemo } from 'react';
import { Landmark } from 'lucide-react';
import type { GovernorNotional, GovernorEnqueuedVAA } from '../utils/api';
import { getChainName } from '../types';
import ChainLogo from './ChainLogo';

interface Props {
  notionals: GovernorNotional[];
  enqueuedVAAs: GovernorEnqueuedVAA[];
  loading: boolean;
}

/** Exact dollar amount with thousands separators, e.g. $18,561,065. */
function formatUSD(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(num)) return '$0';
  return `$${Math.round(num).toLocaleString()}`;
}

/** Tooltip text listing the withheld (enqueued) transactions for a chain. */
function withheldTooltip(list: GovernorEnqueuedVAA[]): string {
  const header = `${list.length} withheld transaction${list.length > 1 ? 's' : ''}:`;
  const lines = list
    .slice(0, 8)
    .map((v) => `• ${formatUSD(v.notionalValue)} — seq ${v.sequence} — releases ${new Date(v.releaseTime * 1000).toLocaleString()}`);
  if (list.length > 8) lines.push(`…and ${list.length - 8} more`);
  return [header, ...lines].join('\n');
}

export default function GovernorRateLimits({ notionals, enqueuedVAAs, loading }: Props) {
  // Withheld notional per chain = sum of that chain's enqueued VAA values.
  const withheldByChain = useMemo(() => {
    const map = new Map<number, number>();
    for (const v of enqueuedVAAs) {
      map.set(v.emitterChain, (map.get(v.emitterChain) || 0) + parseFloat(v.notionalValue || '0'));
    }
    return map;
  }, [enqueuedVAAs]);

  // Enqueued (withheld) transactions per chain, biggest first — for badges + tooltip.
  const stuckByChain = useMemo(() => {
    const map = new Map<number, GovernorEnqueuedVAA[]>();
    for (const v of enqueuedVAAs) {
      const arr = map.get(v.emitterChain);
      if (arr) arr.push(v);
      else map.set(v.emitterChain, [v]);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => parseFloat(b.notionalValue || '0') - parseFloat(a.notionalValue || '0'));
    }
    return map;
  }, [enqueuedVAAs]);

  // Chains with withheld txs, sorted by chainId — for the header badges.
  const enqueuedByChain = useMemo(
    () => Array.from(stuckByChain.entries())
      .map(([chainId, list]) => [chainId, list.length] as [number, number])
      .sort((a, b) => a[0] - b[0]),
    [stuckByChain],
  );

  const sorted = useMemo(
    () => [...notionals].sort((a, b) => a.chainId - b.chainId),
    [notionals],
  );

  if (loading && notionals.length === 0) {
    return (
      <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-800" />
          <div className="h-4 w-32 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10">
            <Landmark className="w-4 h-4 text-amber-400" />
          </span>
          Governor
          <span className="text-xs font-normal text-gray-500">({sorted.length} chains)</span>
        </h2>

        {/* Per-chain enqueued badges */}
        {enqueuedByChain.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {enqueuedByChain.map(([chainId, count]) => (
              <div
                key={chainId}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-800/60 border border-gray-700/40"
                title={`${getChainName(chainId)}: ${count} enqueued`}
              >
                <ChainLogo chainId={chainId} size={14} />
                <span className="text-[11px] font-mono text-amber-400">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate limit table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2 text-left font-medium">Chain</th>
              <th className="px-3 py-2 text-right font-medium">Limit</th>
              <th className="px-3 py-2 text-right font-medium">Big Transaction</th>
              <th className="px-3 py-2 text-right font-medium">Remaining</th>
              <th className="px-3 py-2 text-right font-medium">Withheld</th>
              <th className="px-3 py-2 text-left font-medium w-40">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {sorted.map((n) => {
              const limit = parseFloat(n.notionalLimit);
              const remaining = parseFloat(n.remainingAvailableNotional);
              const used = Math.max(limit - remaining, 0);
              const pct = limit > 0 ? (used / limit) * 100 : 0;
              const withheld = withheldByChain.get(n.chainId) || 0;
              const stuck = stuckByChain.get(n.chainId) || [];
              const barColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';

              return (
                <tr key={n.chainId} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ChainLogo chainId={n.chainId} size={18} />
                      <span className="text-xs text-gray-300 whitespace-nowrap">
                        {getChainName(n.chainId)}{' '}
                        <span className="text-gray-600">({n.chainId})</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-gray-300 whitespace-nowrap">
                    {formatUSD(limit)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-gray-400 whitespace-nowrap">
                    {formatUSD(n.bigTransactionSize)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-emerald-400 whitespace-nowrap">
                    {formatUSD(remaining)}
                  </td>
                  <td
                    title={stuck.length ? withheldTooltip(stuck) : undefined}
                    className={`px-3 py-2 text-right text-xs font-mono whitespace-nowrap ${
                      withheld > 0 ? 'text-amber-400 cursor-help underline decoration-dotted decoration-amber-400/40 underline-offset-2' : 'text-gray-600'
                    }`}
                  >
                    {formatUSD(withheld)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-700/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-gray-500 w-8 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="text-center py-6 text-gray-600 text-xs">No governor rate limits available</div>
        )}
      </div>
    </div>
  );
}
