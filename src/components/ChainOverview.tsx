import { useMemo, useState } from 'react';
import { X, TrendingUp, AlertTriangle, PenTool, Clock } from 'lucide-react';
import type { Heartbeat } from '../types';
import { getChainName, getChainColor } from '../types';
import type { DelegatedGuardianConfigMap } from '../utils/api';
import { normGuardianAddr } from '../utils/helpers';
import ChainLogo from './ChainLogo';

interface ChainStats {
  id: number;
  name: string;
  color: string;
  maxHeight: number;
  minHeight: number;
  healthyGuardians: number;
  totalGuardians: number;
  heights: number[];
  guardianDetails: GuardianDetail[];
}

interface GuardianDetail {
  name: string;
  guardianAddr: string;
  height: number;
  safeHeight: number;
  finalizedHeight: number;
  errorCount: number;
  contractAddress: string;
  lastSignedAt: number;
}

interface Props {
  heartbeats: Heartbeat[];
  delegatedGuardians?: DelegatedGuardianConfigMap;
  guardianNames?: Record<string, string>;
}

/** Placeholder row for a delegate guardian that isn't reporting this chain at all. */
function makePlaceholderGuardian(addr: string, names: Record<string, string>): GuardianDetail {
  return {
    name: names[addr] || `${addr.slice(0, 8)}…`,
    guardianAddr: addr,
    height: 0,
    safeHeight: 0,
    finalizedHeight: 0,
    errorCount: 0,
    contractAddress: '',
    lastSignedAt: 0,
  };
}

/** The per-guardian height/status table used inside a chain's detail panel. */
function GuardianDetailTable({
  rows,
  maxHeight,
  now,
}: {
  rows: GuardianDetail[];
  maxHeight: number;
  now: number;
}) {
  return (
    <div className="overflow-x-auto max-h-80 overflow-y-auto">
      <table className="w-full">
        <thead className="bg-gray-800/40 sticky top-0">
          <tr>
            <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-gray-500">Guardian</th>
            <th className="px-3 py-1.5 text-right text-[10px] uppercase tracking-wider text-gray-500">Height</th>
            <th className="px-3 py-1.5 text-right text-[10px] uppercase tracking-wider text-gray-500">Safe</th>
            <th className="px-3 py-1.5 text-right text-[10px] uppercase tracking-wider text-gray-500">Finalized</th>
            <th className="px-3 py-1.5 text-right text-[10px] uppercase tracking-wider text-gray-500">Behind</th>
            <th className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wider text-gray-500">Last Signed</th>
            <th className="px-3 py-1.5 text-right text-[10px] uppercase tracking-wider text-gray-500">Errors</th>
            <th className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wider text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/20">
          {rows.map((g) => {
            const behind = maxHeight - g.height;
            const isDown = g.height === 0;
            const isBehind = !isDown && behind > 10;

            let lastSignedAgo = '—';
            let signedRecently = false;
            if (g.lastSignedAt) {
              const ms = g.lastSignedAt > 1e15 ? g.lastSignedAt / 1e6 : g.lastSignedAt > 1e12 ? g.lastSignedAt / 1e3 : g.lastSignedAt * 1000;
              const ago = now - ms;
              signedRecently = ago < 300000;
              if (ago < 60000) lastSignedAgo = `${Math.round(ago / 1000)}s ago`;
              else if (ago < 3600000) lastSignedAgo = `${Math.round(ago / 60000)}m ago`;
              else if (ago < 86400000) lastSignedAgo = `${Math.round(ago / 3600000)}h ago`;
              else lastSignedAgo = `${Math.round(ago / 86400000)}d ago`;
            }

            return (
              <tr key={g.guardianAddr || g.name} className={`hover:bg-gray-800/20 transition-colors ${isDown ? 'opacity-50' : ''}`}>
                <td className="px-3 py-1.5 text-xs text-gray-300">{g.name}</td>
                <td className="px-3 py-1.5 text-right text-xs font-mono text-gray-400">
                  {g.height > 0 ? g.height.toLocaleString() : '—'}
                </td>
                <td className="px-3 py-1.5 text-right text-[10px] font-mono text-gray-500">
                  {g.safeHeight > 0 ? g.safeHeight.toLocaleString() : '—'}
                </td>
                <td className="px-3 py-1.5 text-right text-[10px] font-mono text-gray-500">
                  {g.finalizedHeight > 0 ? g.finalizedHeight.toLocaleString() : '—'}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {isDown ? (
                    <span className="text-xs text-red-400">DOWN</span>
                  ) : behind === 0 ? (
                    <span className="text-[10px] text-emerald-400">latest</span>
                  ) : (
                    <span className={`text-xs font-mono ${isBehind ? 'text-amber-400' : 'text-gray-500'}`}>
                      -{behind.toLocaleString()}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-center">
                  <span className={`text-[10px] ${signedRecently ? 'text-emerald-400' : 'text-gray-600'}`}>
                    {lastSignedAgo}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <span className={`text-xs font-mono ${g.errorCount > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                    {g.errorCount > 0 ? g.errorCount : '0'}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-center">
                  {isDown ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      <AlertTriangle className="w-3 h-3" /> Down
                    </span>
                  ) : isBehind ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Clock className="w-3 h-3" /> Behind
                    </span>
                  ) : signedRecently ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <PenTool className="w-3 h-3" /> Signing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
                      <TrendingUp className="w-3 h-3" /> OK
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ChainOverview({ heartbeats, delegatedGuardians = {}, guardianNames = {} }: Props) {
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);

  const chainStats = useMemo(() => {
    const chains = new Map<number, ChainStats>();

    heartbeats.forEach((hb) => {
      hb.networks?.forEach((n) => {
        const height = parseInt(n.height) || 0;
        if (!chains.has(n.id)) {
          chains.set(n.id, {
            id: n.id,
            name: getChainName(n.id),
            color: getChainColor(n.id),
            maxHeight: 0,
            minHeight: Infinity,
            healthyGuardians: 0,
            totalGuardians: 0,
            heights: [],
            guardianDetails: [],
          });
        }
        const stats = chains.get(n.id)!;
        stats.totalGuardians++;
        stats.heights.push(height);
        if (height > stats.maxHeight) stats.maxHeight = height;
        if (height > 0 && height < stats.minHeight) stats.minHeight = height;
        if (height > 0) stats.healthyGuardians++;

        stats.guardianDetails.push({
          name: hb.nodeName || 'Unknown',
          guardianAddr: hb.guardianAddr || '',
          height,
          safeHeight: parseInt(n.safeHeight) || 0,
          finalizedHeight: parseInt(n.finalizedHeight) || 0,
          errorCount: parseInt(n.errorCount) || 0,
          contractAddress: n.contractAddress || '',
          lastSignedAt: parseInt(n.lastObservationSignedAt) || 0,
        });
      });
    });

    // Fix minHeight for chains with no valid heights
    chains.forEach((stats) => {
      if (stats.minHeight === Infinity) stats.minHeight = 0;
      stats.guardianDetails.sort((a, b) => b.height - a.height);
    });

    return Array.from(chains.values()).sort((a, b) => a.id - b.id);
  }, [heartbeats]);

  const selectedChain = selectedChainId !== null
    ? chainStats.find((c) => c.id === selectedChainId) || null
    : null;

  if (chainStats.length === 0) return null;

  const now = Date.now();

  return (
    <div className="space-y-3">
      <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500" />
          Chain Health Overview
          <span className="text-[10px] font-normal text-gray-600">(click a chain for details)</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {chainStats.map((chain) => {
            const pct = chain.totalGuardians > 0
              ? (chain.healthyGuardians / chain.totalGuardians) * 100
              : 0;
            const isSelected = selectedChainId === chain.id;
            const statusColor = isSelected
              ? 'border-cyan-500/60 ring-1 ring-cyan-500/20'
              : pct >= 90
                ? 'border-emerald-500/40'
                : pct >= 67
                  ? 'border-amber-500/40'
                  : 'border-red-500/40';

            return (
              <div
                key={chain.id}
                onClick={() => setSelectedChainId(isSelected ? null : chain.id)}
                className={`rounded-lg bg-gray-800/40 border ${statusColor} p-3 hover:bg-gray-800/60 transition-all group cursor-pointer ${
                  isSelected ? 'bg-gray-800/70' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ChainLogo chainId={chain.id} size={18} />
                  <span className="text-xs font-medium text-gray-300 truncate">
                    {chain.name}
                  </span>
                </div>

                <div className="h-1 rounded-full bg-gray-700/50 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct >= 90 ? '#10b981' : pct >= 67 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">
                    {chain.healthyGuardians}/{chain.totalGuardians}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 group-hover:text-gray-400 transition-colors">
                    {chain.maxHeight.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chain detail panel */}
      {selectedChain && (
        <div className="glow-card rounded-xl bg-gray-900/60 border border-cyan-500/20 animate-slide-in">
          {/* Detail header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
            <div className="flex items-center gap-3">
              <ChainLogo chainId={selectedChain.id} size={28} />
              <div>
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  {selectedChain.name}
                  <span className="text-[10px] font-mono text-gray-500">Chain #{selectedChain.id}</span>
                </h3>
                {selectedChain.guardianDetails[0]?.contractAddress && (
                  <span className="text-[10px] font-mono text-gray-500">
                    {selectedChain.guardianDetails[0].contractAddress}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedChainId(null)}
              className="p-1.5 rounded-lg hover:bg-gray-800/50 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-4 border-b border-gray-800/30">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-400">
                {selectedChain.healthyGuardians}/{selectedChain.totalGuardians}
              </div>
              <div className="text-[10px] text-gray-500">Healthy Guardians</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-cyan-400 font-mono">
                {selectedChain.maxHeight.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500">Latest Height</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold font-mono ${
                selectedChain.maxHeight - selectedChain.minHeight > 100 ? 'text-amber-400' : 'text-gray-300'
              }`}>
                {selectedChain.minHeight > 0
                  ? `\u00B1${(selectedChain.maxHeight - selectedChain.minHeight).toLocaleString()}`
                  : '—'}
              </div>
              <div className="text-[10px] text-gray-500">Height Spread</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-violet-400">
                {selectedChain.guardianDetails.filter((g) => {
                  if (!g.lastSignedAt) return false;
                  const ms = g.lastSignedAt > 1e15 ? g.lastSignedAt / 1e6 : g.lastSignedAt > 1e12 ? g.lastSignedAt / 1e3 : g.lastSignedAt * 1000;
                  return now - ms < 300000;
                }).length}
              </div>
              <div className="text-[10px] text-gray-500">Signed (5m)</div>
            </div>
          </div>

          {/* Guardian detail table(s) */}
          <div className="px-5 py-4 space-y-5">
            {(() => {
              const cfg = delegatedGuardians[selectedChain.id];
              if (cfg && cfg.keys.length > 0) {
                const byAddr = new Map(
                  selectedChain.guardianDetails.map((g) => [normGuardianAddr(g.guardianAddr), g]),
                );
                const delegateSet = new Set(cfg.keys);
                const delegateRows = cfg.keys.map(
                  (k) => byAddr.get(k) || makePlaceholderGuardian(k, guardianNames),
                );
                const canonicalRows = selectedChain.guardianDetails.filter(
                  (g) => !delegateSet.has(normGuardianAddr(g.guardianAddr)),
                );
                return (
                  <>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        Delegate Guardians
                        <span className="text-[10px] font-normal text-cyan-400/80">
                          ({cfg.threshold}/{cfg.keys.length} quorum)
                        </span>
                      </h4>
                      <GuardianDetailTable rows={delegateRows} maxHeight={selectedChain.maxHeight} now={now} />
                    </div>
                    {canonicalRows.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                          Canonical Guardians
                          <span className="text-[10px] font-normal text-gray-600">({canonicalRows.length})</span>
                        </h4>
                        <GuardianDetailTable rows={canonicalRows} maxHeight={selectedChain.maxHeight} now={now} />
                      </div>
                    )}
                  </>
                );
              }
              return (
                <GuardianDetailTable
                  rows={selectedChain.guardianDetails}
                  maxHeight={selectedChain.maxHeight}
                  now={now}
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
