import { ArrowUpDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { Heartbeat } from '../types';
import { timeAgo, shortenAddress } from '../utils/helpers';

interface Props {
  heartbeats: Heartbeat[];
}

type SortKey = 'name' | 'version' | 'chains' | 'health' | 'lastBeat' | 'counter';

export default function GuardianTable({ heartbeats }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    return [...heartbeats].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.nodeName.localeCompare(b.nodeName);
          break;
        case 'version':
          cmp = (a.version || '').localeCompare(b.version || '');
          break;
        case 'chains':
          cmp = (a.networks?.length || 0) - (b.networks?.length || 0);
          break;
        case 'health': {
          const ha = a.networks?.filter((n) => parseInt(n.height) > 0).length || 0;
          const hb2 = b.networks?.filter((n) => parseInt(n.height) > 0).length || 0;
          cmp = ha - hb2;
          break;
        }
        case 'lastBeat':
          cmp = parseInt(a.timestamp || '0') - parseInt(b.timestamp || '0');
          break;
        case 'counter':
          cmp = parseInt(a.counter || '0') - parseInt(b.counter || '0');
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [heartbeats, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300 transition-colors select-none"
      onClick={() => handleSort(k)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? 'text-cyan-400' : 'text-gray-600'}`} />
      </span>
    </th>
  );

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/40">
            <tr>
              <SortHeader label="Guardian" k="name" />
              <SortHeader label="Version" k="version" />
              <SortHeader label="Chains" k="chains" />
              <SortHeader label="Healthy" k="health" />
              <SortHeader label="Last Heartbeat" k="lastBeat" />
              <SortHeader label="Counter" k="counter" />
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-gray-500">
                Address
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {sorted.map((hb) => {
              const healthy = hb.networks?.filter((n) => parseInt(n.height) > 0).length || 0;
              const total = hb.networks?.length || 0;
              const pct = total > 0 ? (healthy / total) * 100 : 0;
              const healthColor =
                pct >= 90 ? 'text-emerald-400' : pct >= 67 ? 'text-amber-400' : 'text-red-400';

              return (
                <tr
                  key={hb.guardianAddr}
                  className="hover:bg-gray-800/20 transition-colors"
                >
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-200">
                    {hb.nodeName || 'Unknown'}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono text-gray-400">
                    {hb.version?.split('/')[1] || hb.version || 'N/A'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400">{total}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-gray-700/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              pct >= 90 ? '#10b981' : pct >= 67 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${healthColor}`}>
                        {healthy}/{total}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400">
                    {timeAgo(hb.timestamp)}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono text-gray-500">
                    {parseInt(hb.counter || '0').toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono text-gray-500">
                    {shortenAddress(hb.guardianAddr)}
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
