import { ArrowRight, ExternalLink } from 'lucide-react';
import type { RecentTransaction } from '../utils/api';
import { getChainName } from '../types';
import ChainLogo from './ChainLogo';

interface Props {
  transactions: RecentTransaction[];
  loading: boolean;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  return `${Math.round(diff / 3600000)}h ago`;
}

export default function LiveFeed({ transactions, loading }: Props) {
  if (loading && transactions.length === 0) {
    return (
      <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
        <div className="animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 bg-gray-800/40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        Live Message Feed
        <span className="text-[10px] font-normal text-gray-600">Recent cross-chain messages</span>
      </h2>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {transactions.map((tx) => {
          const toChain = tx.standardizedProperties?.toChain;
          const appIds = tx.standardizedProperties?.appIds;
          const appName = appIds && appIds.length > 0 ? appIds[0] : null;

          return (
            <div
              key={tx.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors group"
            >
              {/* Source chain */}
              <div className="flex items-center gap-1.5 min-w-[90px]">
                <ChainLogo chainId={tx.emitterChain} size={18} />
                <span className="text-xs text-gray-300 truncate">{getChainName(tx.emitterChain)}</span>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />

              {/* Dest chain */}
              <div className="flex items-center gap-1.5 min-w-[90px]">
                {toChain ? (
                  <>
                    <ChainLogo chainId={toChain} size={18} />
                    <span className="text-xs text-gray-300 truncate">{getChainName(toChain)}</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">—</span>
                )}
              </div>

              {/* App name */}
              {appName && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400 border border-gray-600/30 shrink-0 hidden sm:block">
                  {appName.replace(/_/g, ' ')}
                </span>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Time */}
              <span className="text-[10px] text-gray-500 shrink-0">
                {timeAgo(tx.timestamp)}
              </span>

              {/* Link */}
              <a
                href={`https://wormholescan.io/#/tx/${tx.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-gray-700/50 text-gray-600 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
