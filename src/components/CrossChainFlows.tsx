import { useMemo, useState } from 'react';
import { ArrowRight, GitBranch } from 'lucide-react';
import type { CrossChainFlow } from '../utils/api';
import { getChainName } from '../types';
import ChainLogo from './ChainLogo';

interface Props {
  flows: CrossChainFlow[];
  loading: boolean;
}

function formatVol(val: string): string {
  const num = parseFloat(val);
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  if (num > 0) return `$${num.toFixed(0)}`;
  return '$0';
}

export default function CrossChainFlows({ flows, loading }: Props) {
  const [expandedChain, setExpandedChain] = useState<number | null>(null);

  const sorted = useMemo(() => {
    return [...flows]
      .filter((f) => parseFloat(f.volume) > 0)
      .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume));
  }, [flows]);

  const maxVol = sorted.length > 0 ? parseFloat(sorted[0].volume) : 1;

  if (loading && flows.length === 0) return null;

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <span className="p-1.5 rounded-lg bg-pink-500/10">
          <GitBranch className="w-4 h-4 text-pink-400" />
        </span>
        Cross-Chain Value Flow (24h)
        <span className="text-xs font-normal text-gray-500">by source chain</span>
      </h2>

      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {sorted.map((flow) => {
          const vol = parseFloat(flow.volume);
          const pct = (vol / maxVol) * 100;
          const isExpanded = expandedChain === flow.chain;
          const destinations = flow.destinations
            .filter((d) => parseFloat(d.volume) > 0)
            .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume));

          return (
            <div key={flow.chain}>
              <div
                onClick={() => setExpandedChain(isExpanded ? null : flow.chain)}
                className={`flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-800/30 transition-colors cursor-pointer ${
                  isExpanded ? 'bg-gray-800/30' : ''
                }`}
              >
                <ChainLogo chainId={flow.chain} size={20} />
                <span className="text-xs text-gray-300 w-24 truncate shrink-0">
                  {getChainName(flow.chain)}
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-gray-800/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-pink-500/60 to-violet-500/60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-400 w-20 text-right shrink-0">
                  {formatVol(flow.volume)}
                </span>
                <span className="text-[10px] text-gray-600 w-8 text-right shrink-0">
                  {destinations.length}
                </span>
              </div>

              {/* Expanded destinations */}
              {isExpanded && destinations.length > 0 && (
                <div className="ml-8 pl-4 border-l border-gray-800/50 mt-1 mb-2 space-y-1 animate-slide-in">
                  {destinations.map((dest) => (
                    <div key={dest.chain} className="flex items-center gap-2 px-2 py-1">
                      <ArrowRight className="w-3 h-3 text-gray-600" />
                      <ChainLogo chainId={dest.chain} size={16} />
                      <span className="text-[10px] text-gray-400 w-20 truncate">
                        {getChainName(dest.chain)}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-gray-800/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-500/40"
                          style={{ width: `${dest.percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-gray-500 w-16 text-right">
                        {formatVol(dest.volume)}
                      </span>
                      <span className="text-[10px] text-gray-600 w-10 text-right">
                        {dest.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
