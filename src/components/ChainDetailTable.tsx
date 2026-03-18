import { useMemo, useState } from 'react';
import { ArrowUpDown, TrendingUp } from 'lucide-react';
import type { Heartbeat } from '../types';
import { getChainName, getChainColor } from '../types';
import ChainLogo from './ChainLogo';

interface ChainDetail {
  chainId: number;
  name: string;
  color: string;
  maxHeight: number;
  minHeight: number;
  avgHeight: number;
  healthyGuardians: number;
  totalGuardians: number;
  heightSpread: number;
  maxSafeHeight: number;
  maxFinalizedHeight: number;
  totalErrors: number;
  contractAddress: string;
}

interface Props {
  heartbeats: Heartbeat[];
}

type SortKey = 'name' | 'health' | 'height' | 'spread' | 'errors' | 'guardians';

export default function ChainDetailTable({ heartbeats }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const chains = useMemo(() => {
    const map = new Map<number, {
      heights: number[];
      safeHeights: number[];
      finalizedHeights: number[];
      errors: number;
      contractAddress: string;
      total: number;
      healthy: number;
    }>();

    heartbeats.forEach((hb) => {
      hb.networks?.forEach((n) => {
        const h = parseInt(n.height) || 0;
        if (!map.has(n.id)) {
          map.set(n.id, { heights: [], safeHeights: [], finalizedHeights: [], errors: 0, contractAddress: '', total: 0, healthy: 0 });
        }
        const entry = map.get(n.id)!;
        entry.heights.push(h);
        entry.safeHeights.push(parseInt(n.safeHeight) || 0);
        entry.finalizedHeights.push(parseInt(n.finalizedHeight) || 0);
        entry.errors += parseInt(n.errorCount) || 0;
        if (n.contractAddress) entry.contractAddress = n.contractAddress;
        entry.total++;
        if (h > 0) entry.healthy++;
      });
    });

    const result: ChainDetail[] = [];
    map.forEach((v, chainId) => {
      const validHeights = v.heights.filter((h) => h > 0);
      const max = Math.max(...v.heights);
      const min = validHeights.length > 0 ? Math.min(...validHeights) : 0;
      const avg = validHeights.length > 0 ? validHeights.reduce((s, h) => s + h, 0) / validHeights.length : 0;

      result.push({
        chainId,
        name: getChainName(chainId),
        color: getChainColor(chainId),
        maxHeight: max,
        minHeight: min,
        avgHeight: Math.round(avg),
        healthyGuardians: v.healthy,
        totalGuardians: v.total,
        heightSpread: validHeights.length > 1 ? max - min : 0,
        maxSafeHeight: Math.max(...v.safeHeights),
        maxFinalizedHeight: Math.max(...v.finalizedHeights),
        totalErrors: v.errors,
        contractAddress: v.contractAddress,
      });
    });

    return result;
  }, [heartbeats]);

  const sorted = useMemo(() => {
    return [...chains].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'health': cmp = (a.healthyGuardians / a.totalGuardians) - (b.healthyGuardians / b.totalGuardians); break;
        case 'height': cmp = a.maxHeight - b.maxHeight; break;
        case 'spread': cmp = a.heightSpread - b.heightSpread; break;
        case 'errors': cmp = a.totalErrors - b.totalErrors; break;
        case 'guardians': cmp = a.healthyGuardians - b.healthyGuardians; break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [chains, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortHeader = ({ label, k, className = '' }: { label: string; k: SortKey; className?: string }) => (
    <th
      className={`px-3 py-2 text-left text-[10px] uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300 transition-colors select-none ${className}`}
      onClick={() => handleSort(k)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? 'text-cyan-400' : 'text-gray-600'}`} />
      </span>
    </th>
  );

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50">
      <div className="p-5 pb-3">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-cyan-500/10">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </span>
          Chain Details
          <span className="text-xs font-normal text-gray-500">({chains.length} chains)</span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/40">
            <tr>
              <SortHeader label="Chain" k="name" />
              <SortHeader label="Guardians" k="guardians" />
              <SortHeader label="Health" k="health" />
              <SortHeader label="Latest Height" k="height" />
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-gray-500">Safe</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-gray-500">Finalized</th>
              <SortHeader label="Spread" k="spread" />
              <SortHeader label="Errors" k="errors" />
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-gray-500">Contract</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {sorted.map((c) => {
              const pct = c.totalGuardians > 0 ? (c.healthyGuardians / c.totalGuardians) * 100 : 0;
              const healthColor = pct >= 90 ? 'text-emerald-400' : pct >= 67 ? 'text-amber-400' : 'text-red-400';
              return (
                <tr key={c.chainId} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <ChainLogo chainId={c.chainId} size={18} />
                      <span className="text-xs font-medium text-gray-200">{c.name}</span>
                      <span className="text-[10px] font-mono text-gray-600">#{c.chainId}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400">
                    {c.healthyGuardians}/{c.totalGuardians}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-1.5 rounded-full bg-gray-700/50 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct >= 90 ? '#10b981' : pct >= 67 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className={`text-[10px] font-medium ${healthColor}`}>{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono text-gray-400">
                    {c.maxHeight.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono text-gray-500">
                    {c.maxSafeHeight > 0 ? c.maxSafeHeight.toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono text-gray-500">
                    {c.maxFinalizedHeight > 0 ? c.maxFinalizedHeight.toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-mono ${c.heightSpread > 100 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {c.heightSpread > 0 ? `\u00B1${c.heightSpread.toLocaleString()}` : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-mono ${c.totalErrors > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {c.totalErrors > 0 ? c.totalErrors.toLocaleString() : '0'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-mono text-gray-600 max-w-[120px] truncate block" title={c.contractAddress}>
                      {c.contractAddress ? `${c.contractAddress.slice(0, 10)}...` : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
