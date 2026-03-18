import { useState, useMemo } from 'react';
import { TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import type { Heartbeat } from '../types';
import { getChainName } from '../types';
import ChainLogo from './ChainLogo';

interface Props {
  heartbeats: Heartbeat[];
}

interface ChainLag {
  chainId: number;
  chainName: string;
  guardianHeight: number;
  maxHeight: number;
  lag: number;
}

interface GuardianLagInfo {
  name: string;
  address: string;
  totalLag: number;
  chainsBehind: number;
  chainLags: ChainLag[];
}

const LAG_THRESHOLD = 100;

function lagColor(lag: number): string {
  if (lag <= LAG_THRESHOLD) return 'text-emerald-400';
  if (lag <= 500) return 'text-amber-400';
  return 'text-red-400';
}

function lagBgColor(lag: number): string {
  if (lag <= LAG_THRESHOLD) return 'bg-emerald-500';
  if (lag <= 500) return 'bg-amber-500';
  return 'bg-red-500';
}

function lagLabel(lag: number): string {
  if (lag <= LAG_THRESHOLD) return 'In sync';
  if (lag <= 500) return `${lag.toLocaleString()} behind`;
  return `${lag.toLocaleString()} behind`;
}

export default function GuardianLag({ heartbeats }: Props) {
  const [expandedGuardian, setExpandedGuardian] = useState<string | null>(null);

  const { guardians, maxTotalLag, allInSync } = useMemo(() => {
    // Step 1: Find max height per chain across all guardians
    const maxHeights = new Map<number, number>();
    heartbeats.forEach((hb) => {
      hb.networks?.forEach((n) => {
        const height = parseInt(n.height) || 0;
        const current = maxHeights.get(n.id) || 0;
        if (height > current) maxHeights.set(n.id, height);
      });
    });

    // Step 2: Compute per-guardian lag info
    const guardians: GuardianLagInfo[] = heartbeats.map((hb) => {
      const name = hb.nodeName || 'Unknown';
      const address = hb.guardianAddr || name;

      const chainLags: ChainLag[] = [];
      let totalLag = 0;
      let chainsBehind = 0;

      // Build a map of this guardian's networks
      const networkMap = new Map<number, number>();
      hb.networks?.forEach((n) => {
        networkMap.set(n.id, parseInt(n.height) || 0);
      });

      // Compute lag for each chain that has a max height
      maxHeights.forEach((maxH, chainId) => {
        const guardianHeight = networkMap.get(chainId) || 0;
        const lag = guardianHeight > 0 ? maxH - guardianHeight : 0;

        if (guardianHeight > 0) {
          chainLags.push({
            chainId,
            chainName: getChainName(chainId),
            guardianHeight,
            maxHeight: maxH,
            lag,
          });

          if (lag > LAG_THRESHOLD) {
            totalLag += lag;
            chainsBehind++;
          }
        }
      });

      // Sort chain lags by lag descending
      chainLags.sort((a, b) => b.lag - a.lag);

      return { name, address, totalLag, chainsBehind, chainLags };
    });

    // Step 3: Sort guardians by total lag ascending
    guardians.sort((a, b) => a.totalLag - b.totalLag);

    const maxTotalLag = guardians.length > 0 ? Math.max(...guardians.map((g) => g.totalLag)) : 0;
    const allInSync = guardians.every((g) => g.totalLag === 0);

    return { guardians, maxTotalLag, allInSync };
  }, [heartbeats]);

  if (heartbeats.length === 0) return null;

  const inSyncCount = guardians.filter((g) => g.totalLag === 0).length;

  const toggleExpanded = (address: string) => {
    setExpandedGuardian((prev) => (prev === address ? null : address));
  };

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      {/* Header */}
      <h2 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
        <TrendingDown className="w-4 h-4 text-cyan-500" />
        Guardian Lag Monitor
      </h2>
      <p className="text-[10px] text-gray-500 mb-4">
        {inSyncCount} of {guardians.length} guardians fully in sync
      </p>

      {/* All in sync message */}
      {allInSync ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/40 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
            </div>
            <p className="text-emerald-400 text-sm font-medium">All guardians in sync</p>
            <p className="text-gray-500 text-[10px] mt-1">
              Every guardian is at the leading block height on all chains
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {guardians.map((guardian) => {
            const isExpanded = expandedGuardian === guardian.address;
            const lagBarWidth = maxTotalLag > 0 ? (guardian.totalLag / maxTotalLag) * 100 : 0;
            const chainsWithLag = guardian.chainLags.filter((cl) => cl.lag > LAG_THRESHOLD);

            return (
              <div key={guardian.address} className="rounded-lg overflow-hidden">
                {/* Collapsed row */}
                <button
                  onClick={() => toggleExpanded(guardian.address)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800/30 transition-colors text-left"
                >
                  {/* Expand/collapse icon */}
                  <div className="text-gray-500 shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Guardian name */}
                  <span className="text-[11px] text-gray-300 truncate min-w-[120px] max-w-[180px]" title={guardian.name}>
                    {guardian.name}
                  </span>

                  {/* Total lag */}
                  <span className={`text-[11px] font-mono shrink-0 ${lagColor(guardian.totalLag)}`}>
                    {guardian.totalLag === 0 ? 'In sync' : `${guardian.totalLag.toLocaleString()} blocks`}
                  </span>

                  {/* Chains behind count */}
                  {guardian.chainsBehind > 0 && (
                    <span className="text-[10px] text-gray-500 shrink-0">
                      ({guardian.chainsBehind} chain{guardian.chainsBehind !== 1 ? 's' : ''})
                    </span>
                  )}

                  {/* Visual lag indicator bar */}
                  <div className="flex-1 h-1.5 bg-gray-800/50 rounded-full overflow-hidden ml-auto min-w-[60px] max-w-[120px]">
                    <div
                      className={`h-full rounded-full transition-all ${lagBgColor(guardian.totalLag)}`}
                      style={{ width: `${guardian.totalLag === 0 ? 0 : Math.max(lagBarWidth, 4)}%` }}
                    />
                  </div>
                </button>

                {/* Expanded section */}
                {isExpanded && chainsWithLag.length > 0 && (
                  <div className="px-3 pb-3 pt-1 ml-7">
                    <div className="rounded-lg bg-gray-800/30 border border-gray-700/30 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="text-[9px] uppercase tracking-wider text-gray-500 border-b border-gray-700/30">
                            <th className="text-left px-3 py-1.5">Chain</th>
                            <th className="text-right px-3 py-1.5">Guardian Height</th>
                            <th className="text-right px-3 py-1.5">Max Height</th>
                            <th className="text-right px-3 py-1.5">Behind</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chainsWithLag.map((cl) => (
                            <tr
                              key={cl.chainId}
                              className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/20 transition-colors"
                            >
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                  <ChainLogo chainId={cl.chainId} size={14} />
                                  <span className="text-[10px] text-gray-400">{cl.chainName}</span>
                                </div>
                              </td>
                              <td className="text-right px-3 py-1.5">
                                <span className="text-[10px] font-mono text-gray-400">
                                  {cl.guardianHeight.toLocaleString()}
                                </span>
                              </td>
                              <td className="text-right px-3 py-1.5">
                                <span className="text-[10px] font-mono text-gray-400">
                                  {cl.maxHeight.toLocaleString()}
                                </span>
                              </td>
                              <td className="text-right px-3 py-1.5">
                                <span className={`text-[10px] font-mono font-semibold ${lagColor(cl.lag)}`}>
                                  -{cl.lag.toLocaleString()} {lagLabel(cl.lag) === 'Slight' ? '(Slight)' : ''}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Expanded but all in sync */}
                {isExpanded && chainsWithLag.length === 0 && (
                  <div className="px-3 pb-3 pt-1 ml-7">
                    <p className="text-[10px] text-emerald-400">Fully in sync on all chains</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
