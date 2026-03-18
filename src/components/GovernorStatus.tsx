import { useMemo, useState } from 'react';
import { Landmark, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { GovernorNotional, GovernorEnqueuedVAA } from '../utils/api';
import { getChainName } from '../types';
import ChainLogo from './ChainLogo';

interface Props {
  notionals: GovernorNotional[];
  enqueuedVAAs: GovernorEnqueuedVAA[];
  loading: boolean;
}

function formatUSD(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

export default function GovernorStatus({ notionals, enqueuedVAAs, loading }: Props) {
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => {
    return [...notionals].sort((a, b) => {
      const usedA = parseFloat(a.notionalLimit) - parseFloat(a.remainingAvailableNotional);
      const usedB = parseFloat(b.notionalLimit) - parseFloat(b.remainingAvailableNotional);
      const pctA = usedA / parseFloat(a.notionalLimit);
      const pctB = usedB / parseFloat(b.notionalLimit);
      return pctB - pctA;
    });
  }, [notionals]);

  const totalLimit = useMemo(() => notionals.reduce((s, n) => s + parseFloat(n.notionalLimit), 0), [notionals]);
  const totalRemaining = useMemo(() => notionals.reduce((s, n) => s + parseFloat(n.remainingAvailableNotional), 0), [notionals]);
  const totalUsedPct = totalLimit > 0 ? ((totalLimit - totalRemaining) / totalLimit) * 100 : 0;

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
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50">
      {/* Header */}
      <div
        className="p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10">
              <Landmark className="w-4 h-4 text-amber-400" />
            </span>
            Governor Rate Limits
            {enqueuedVAAs.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {enqueuedVAAs.length} enqueued
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-gray-500">Total Capacity Used</div>
              <div className="text-sm font-semibold text-gray-300">{totalUsedPct.toFixed(1)}%</div>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-gray-800/40 p-2.5">
            <div className="text-lg font-bold text-gray-200">{formatUSD(totalLimit)}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Limit</div>
          </div>
          <div className="rounded-lg bg-gray-800/40 p-2.5">
            <div className="text-lg font-bold text-emerald-400">{formatUSD(totalRemaining)}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Remaining</div>
          </div>
          <div className="rounded-lg bg-gray-800/40 p-2.5">
            <div className="text-lg font-bold text-amber-400">{formatUSD(totalLimit - totalRemaining)}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Used (24h)</div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-800/50 px-5 pb-5">
          {/* Per-chain notionals */}
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-[1fr,auto,auto,1fr] gap-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium px-1 pb-1">
              <span>Chain</span>
              <span>Limit</span>
              <span>Remaining</span>
              <span>Usage</span>
            </div>
            {sorted.map((n) => {
              const limit = parseFloat(n.notionalLimit);
              const remaining = parseFloat(n.remainingAvailableNotional);
              const used = limit - remaining;
              const pct = limit > 0 ? (used / limit) * 100 : 0;
              const barColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';

              return (
                <div
                  key={n.chainId}
                  className="grid grid-cols-[1fr,auto,auto,1fr] gap-3 items-center px-1 py-2 rounded-lg hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ChainLogo chainId={n.chainId} size={18} />
                    <span className="text-xs text-gray-300">{getChainName(n.chainId)}</span>
                  </div>
                  <span className="text-xs font-mono text-gray-400 text-right">{formatUSD(limit)}</span>
                  <span className="text-xs font-mono text-gray-400 text-right">{formatUSD(remaining)}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-gray-700/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 w-10 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enqueued VAAs */}
          {enqueuedVAAs.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Enqueued VAAs ({enqueuedVAAs.length})
              </h3>
              <div className="space-y-2">
                {enqueuedVAAs.map((vaa, i) => {
                  const releaseDate = new Date(vaa.releaseTime * 1000);
                  const isOverdue = releaseDate < new Date();
                  return (
                    <div key={i} className="rounded-lg bg-gray-800/40 border border-gray-700/30 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <ChainLogo chainId={vaa.emitterChain} size={16} />
                          <span className="text-xs text-gray-300">{getChainName(vaa.emitterChain)}</span>
                          <span className="text-[10px] font-mono text-gray-500">seq: {vaa.sequence}</span>
                        </div>
                        <span className="text-xs font-semibold text-amber-400">{formatUSD(vaa.notionalValue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className={isOverdue ? 'text-red-400' : 'text-gray-500'}>
                            Release: {releaseDate.toLocaleString()}
                            {isOverdue && ' (overdue)'}
                          </span>
                        </div>
                        {vaa.txHash && (
                          <a
                            href={`https://wormholescan.io/#/tx/${vaa.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
