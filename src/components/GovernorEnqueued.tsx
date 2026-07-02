import { useMemo } from 'react';
import { ListChecks, Check, X, ExternalLink } from 'lucide-react';
import type { GovernorEnqueuedVAA } from '../utils/api';
import { enqueuedKey } from '../utils/api';
import { getChainName } from '../types';
import { shortenAddress } from '../utils/helpers';
import ChainLogo from './ChainLogo';

interface Props {
  enqueuedVAAs: GovernorEnqueuedVAA[];
  /** `${chainId}:${normalizedEmitter}:${sequence}` -> # of guardians that enqueued it */
  quorumCounts: Record<string, number>;
  /** chainId -> # of guardians delegated to that chain (quorum is computed against this) */
  guardiansPerChain: Record<number, number>;
  /** fallback delegated-guardian count for chains missing from guardiansPerChain */
  fallbackGuardianCount: number;
  loading: boolean;
}

/** Guardians needed for quorum given the number delegated to a chain (⌊2/3·n⌋ + 1). */
function quorumOf(delegated: number): number {
  return Math.floor((delegated * 2) / 3) + 1;
}

function formatUSD(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(num)) return '$0';
  return `$${Math.round(num).toLocaleString()}`;
}

export default function GovernorEnqueued({
  enqueuedVAAs,
  quorumCounts,
  guardiansPerChain,
  fallbackGuardianCount,
  loading,
}: Props) {
  // Overdue first, then soonest release time.
  const sorted = useMemo(
    () => [...enqueuedVAAs].sort((a, b) => a.releaseTime - b.releaseTime),
    [enqueuedVAAs],
  );

  if (loading && enqueuedVAAs.length === 0) return null;

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10">
            <ListChecks className="w-4 h-4 text-amber-400" />
          </span>
          Enqueued VAAs
          <span className="text-xs font-normal text-gray-500">({sorted.length})</span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2 text-left font-medium">Chain</th>
              <th className="px-3 py-2 text-left font-medium">Emitter</th>
              <th className="px-3 py-2 text-left font-medium">Sequence</th>
              <th className="px-3 py-2 text-center font-medium">Has Quorum?</th>
              <th className="px-3 py-2 text-left font-medium">Transaction Hash</th>
              <th className="px-3 py-2 text-left font-medium">Release Time</th>
              <th className="px-3 py-2 text-right font-medium">Notional Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {sorted.map((v, i) => {
              const key = enqueuedKey(v.emitterChain, v.emitterAddress, v.sequence);
              const count = quorumCounts[key];
              const delegated = guardiansPerChain[v.emitterChain] || fallbackGuardianCount;
              const threshold = quorumOf(delegated);
              const hasQuorum = count !== undefined && count >= threshold;
              const releaseDate = new Date(v.releaseTime * 1000);
              const isOverdue = releaseDate.getTime() < Date.now();
              const vaaUrl = `https://wormholescan.io/#/tx/${v.emitterChain}/${v.emitterAddress}/${v.sequence}`;

              return (
                <tr key={`${key}-${i}`} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ChainLogo chainId={v.emitterChain} size={16} />
                      <span className="text-xs text-gray-300 whitespace-nowrap">
                        {getChainName(v.emitterChain)}{' '}
                        <span className="text-gray-600">({v.emitterChain})</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-mono text-gray-500" title={v.emitterAddress}>
                      {shortenAddress(v.emitterAddress, 8)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={vaaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
                    >
                      {v.sequence}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <div
                      className="flex justify-center"
                      title={
                        count === undefined
                          ? 'No cross-guardian data'
                          : `${count}/${threshold} enqueued (${delegated} guardians delegated to ${getChainName(v.emitterChain)})`
                      }
                    >
                      {hasQuorum ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <X className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {v.txHash ? (
                      <a
                        href={`https://wormholescan.io/#/tx/${v.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {shortenAddress(v.txHash, 8)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[11px] whitespace-nowrap ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                      {releaseDate.toLocaleString()}
                      {isOverdue && <span className="ml-1 text-red-500">(overdue)</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-amber-400 whitespace-nowrap">
                    {formatUSD(v.notionalValue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-xs">
            No VAAs are currently enqueued by the governor
          </div>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800/40 text-[11px] text-gray-500">
          {sorted.length} {sorted.length === 1 ? 'Row' : 'Rows'}
        </div>
      )}
    </div>
  );
}
