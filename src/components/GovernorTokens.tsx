import { useMemo, useState } from 'react';
import { Coins, Search, X } from 'lucide-react';
import type { GovernorToken } from '../utils/api';
import { getChainName } from '../types';
import ChainLogo from './ChainLogo';

interface Props {
  tokens: GovernorToken[];
  loading: boolean;
}

export default function GovernorTokens({ tokens, loading }: Props) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [selectedChain, setSelectedChain] = useState<number | null>(null);

  const tokensByChain = useMemo(() => {
    const map = new Map<number, number>();
    tokens.forEach((t) => {
      map.set(t.originChainId, (map.get(t.originChainId) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([chainId, count]) => ({ chainId, name: getChainName(chainId), count }))
      .sort((a, b) => b.count - a.count);
  }, [tokens]);

  const filtered = useMemo(() => {
    let result = tokens;

    // Apply chain filter
    if (selectedChain !== null) {
      result = result.filter((t) => t.originChainId === selectedChain);
    }

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.originAddress.toLowerCase().includes(q) ||
          getChainName(t.originChainId).toLowerCase().includes(q)
      );
    }

    return result;
  }, [tokens, search, selectedChain]);

  const displayed = showAll ? filtered : filtered.slice(0, 50);

  if (loading && tokens.length === 0) return null;

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-pink-500/10">
            <Coins className="w-4 h-4 text-pink-400" />
          </span>
          Governor Token Registry
          <span className="text-xs font-normal text-gray-500">
            ({filtered.length}{selectedChain !== null || search ? ` of ${tokens.length}` : ''} tokens)
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {selectedChain !== null && (
            <button
              onClick={() => setSelectedChain(null)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
            >
              <ChainLogo chainId={selectedChain} size={12} />
              {getChainName(selectedChain)}
              <X className="w-3 h-3" />
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search tokens..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowAll(false); }}
              className="bg-gray-800/60 border border-gray-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 w-40"
            />
          </div>
        </div>
      </div>

      {/* Chain distribution - clickable filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tokensByChain.map((c) => {
          const isActive = selectedChain === c.chainId;
          return (
            <button
              key={c.chainId}
              onClick={() => {
                setSelectedChain(isActive ? null : c.chainId);
                setShowAll(false);
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-gray-800/40 border-gray-700/30 text-gray-400 hover:border-gray-600/50 hover:text-gray-300'
              }`}
            >
              <ChainLogo chainId={c.chainId} size={14} />
              <span className="text-[10px]">{c.name}</span>
              <span className={`text-[10px] font-mono ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>{c.count}</span>
            </button>
          );
        })}
      </div>

      {/* Token table */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-800/40 sticky top-0">
            <tr>
              <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-gray-500">Chain</th>
              <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-gray-500">Token Address</th>
              <th className="px-3 py-1.5 text-right text-[10px] uppercase tracking-wider text-gray-500">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/20">
            {displayed.map((t, i) => (
              <tr key={i} className="hover:bg-gray-800/20 transition-colors">
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <ChainLogo chainId={t.originChainId} size={14} />
                    <span className="text-[10px] text-gray-400">{getChainName(t.originChainId)}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <span className="text-[10px] font-mono text-gray-500 truncate max-w-[200px] block">
                    {t.originAddress}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <span className="text-[10px] font-mono text-gray-400">
                    ${t.price < 0.01 ? t.price.toExponential(2) : t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-6 text-gray-600 text-xs">No tokens match your filters</div>
      )}

      {filtered.length > 50 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Show all {filtered.length} tokens
        </button>
      )}
      {showAll && filtered.length > 50 && (
        <button
          onClick={() => setShowAll(false)}
          className="mt-3 text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          Show fewer
        </button>
      )}
    </div>
  );
}
