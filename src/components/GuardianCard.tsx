import { useState } from 'react';
import {
  Heart,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Hash,
  Layers,
} from 'lucide-react';
import type { Heartbeat } from '../types';
import { getChainName, getChainColor } from '../types';
import { timeAgo, formatNumber, shortenAddress } from '../utils/helpers';
import ChainLogo from './ChainLogo';

interface Props {
  heartbeat: Heartbeat;
  index: number;
}

export default function GuardianCard({ heartbeat, index }: Props) {
  const [expanded, setExpanded] = useState(false);

  const healthyNetworks = heartbeat.networks?.filter(
    (n) => parseInt(n.height) > 0
  ).length || 0;
  const totalNetworks = heartbeat.networks?.length || 0;
  const healthPct = totalNetworks > 0 ? (healthyNetworks / totalNetworks) * 100 : 0;

  const healthColor =
    healthPct >= 90
      ? 'text-emerald-400'
      : healthPct >= 67
        ? 'text-amber-400'
        : 'text-red-400';
  const healthRing =
    healthPct >= 90
      ? 'ring-emerald-500/30'
      : healthPct >= 67
        ? 'ring-amber-500/30'
        : 'ring-red-500/30';
  const healthBg =
    healthPct >= 90
      ? 'bg-emerald-500'
      : healthPct >= 67
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div
      className={`animate-slide-in glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Health indicator ring */}
            <div className={`relative w-10 h-10 rounded-full ring-2 ${healthRing} flex items-center justify-center bg-gray-800/80`}>
              <Heart className={`w-4 h-4 ${healthColor}`} />
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${healthBg}`}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-200">
                {heartbeat.nodeName || 'Unknown Guardian'}
              </h3>
              <span className="text-[10px] font-mono text-gray-500">
                {shortenAddress(heartbeat.guardianAddr)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${healthColor}`}>
              {healthPct.toFixed(0)}%
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="truncate">{timeAgo(heartbeat.timestamp)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Cpu className="w-3 h-3 text-gray-500" />
            <span className="truncate font-mono">{heartbeat.version?.split('/')[1] || heartbeat.version || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Layers className="w-3 h-3 text-gray-500" />
            <span>{healthyNetworks}/{totalNetworks} chains</span>
          </div>
        </div>

        {/* Chain health mini bar */}
        <div className="mt-3 flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-gray-800/50">
          {heartbeat.networks
            ?.slice()
            .sort((a, b) => a.id - b.id)
            .map((n) => (
              <div
                key={n.id}
                className="h-full transition-all duration-300"
                style={{
                  flex: 1,
                  backgroundColor:
                    parseInt(n.height) > 0
                      ? getChainColor(n.id)
                      : '#374151',
                  opacity: parseInt(n.height) > 0 ? 0.8 : 0.3,
                }}
                title={`${getChainName(n.id)}: ${formatNumber(n.height)}`}
              />
            ))}
        </div>
      </div>

      {/* Expanded chain details */}
      {expanded && (
        <div className="border-t border-gray-800/50 px-4 pb-4">
          <div className="mt-3 space-y-1 max-h-80 overflow-y-auto">
            <div className="grid grid-cols-[1fr,auto,auto] gap-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium px-2 pb-1">
              <span>Chain</span>
              <span>Height</span>
              <span>Status</span>
            </div>
            {heartbeat.networks
              ?.slice()
              .sort((a, b) => a.id - b.id)
              .map((n) => {
                const healthy = parseInt(n.height) > 0;
                return (
                  <div
                    key={n.id}
                    className="grid grid-cols-[1fr,auto,auto] gap-2 items-center px-2 py-1.5 rounded-lg hover:bg-gray-800/30 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <ChainLogo chainId={n.id} size={16} />
                      <span className="text-gray-300">{getChainName(n.id)}</span>
                      <span className="text-gray-600 font-mono text-[10px]">#{n.id}</span>
                    </div>
                    <span className="font-mono text-gray-400 text-right">
                      {formatNumber(n.height)}
                    </span>
                    <div className="flex items-center justify-end">
                      {healthy ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Hash className="w-3 h-3 text-emerald-400" />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Guardian address & P2P */}
          <div className="mt-3 pt-3 border-t border-gray-800/30 space-y-1">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-gray-500">Address:</span>
              <code className="text-gray-400 font-mono break-all">{heartbeat.guardianAddr}</code>
            </div>
            {heartbeat.p2pNodeAddr && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-gray-500">P2P:</span>
                <code className="text-gray-400 font-mono break-all">{heartbeat.p2pNodeAddr}</code>
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-gray-500">Boot:</span>
              <span className="text-gray-400">{timeAgo(heartbeat.bootTimestamp)}</span>
            </div>
            {heartbeat.features && heartbeat.features.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] mt-1 flex-wrap">
                <span className="text-gray-500">Features:</span>
                {heartbeat.features.map((f) => (
                  <span
                    key={f}
                    className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
