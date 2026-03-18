import { useState, useMemo } from 'react';
import { Shield, Wifi, Link2, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { Heartbeat } from '../types';
import { getChainName } from '../types';
import ChainLogo from './ChainLogo';

interface Props {
  heartbeats: Heartbeat[];
}

interface Issue {
  guardianName: string;
  guardianAddr: string;
  chainId: number;
  chainName: string;
  height: string;
  errorCount: string;
}

export default function StatsBar({ heartbeats }: Props) {
  const [issuesExpanded, setIssuesExpanded] = useState(false);

  const totalGuardians = heartbeats.length;
  const allChainIds = new Set<number>();
  let healthyChainCount = 0;
  let totalNetworkEntries = 0;

  const issues: Issue[] = [];

  heartbeats.forEach((hb) => {
    hb.networks?.forEach((n) => {
      allChainIds.add(n.id);
      totalNetworkEntries++;
      if (parseInt(n.height) > 0) {
        healthyChainCount++;
      } else {
        issues.push({
          guardianName: hb.nodeName || 'Unknown',
          guardianAddr: hb.guardianAddr,
          chainId: n.id,
          chainName: getChainName(n.id),
          height: n.height,
          errorCount: n.errorCount,
        });
      }
    });
  });

  // Group issues by chain for summary
  const issuesByChain = useMemo(() => {
    const map = new Map<number, { chainName: string; guardians: string[] }>();
    issues.forEach((issue) => {
      if (!map.has(issue.chainId)) {
        map.set(issue.chainId, { chainName: issue.chainName, guardians: [] });
      }
      map.get(issue.chainId)!.guardians.push(issue.guardianName);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].guardians.length - a[1].guardians.length);
  }, [issues]);

  const uniqueVersions = new Set(heartbeats.map((h) => h.version));
  const unhealthyNetworks = totalNetworkEntries - healthyChainCount;

  const stats = [
    {
      label: 'Active Guardians',
      value: totalGuardians,
      icon: Shield,
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Chains Monitored',
      value: allChainIds.size,
      icon: Link2,
      textColor: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
    },
    {
      label: 'Healthy Links',
      value: healthyChainCount,
      icon: Wifi,
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-4 hover:border-gray-700/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.textColor}`} />
              </div>
              {stat.label === 'Active Guardians' && uniqueVersions.size > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-mono">
                  {uniqueVersions.size} version{uniqueVersions.size !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className={`text-2xl font-bold ${stat.textColor}`}>
              {stat.value.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}

        {/* Issues card - clickable/expandable */}
        <div
          className={`glow-card rounded-xl bg-gray-900/60 border p-4 transition-all duration-300 ${
            unhealthyNetworks > 0
              ? 'border-red-500/30 hover:border-red-500/50 cursor-pointer'
              : 'border-gray-800/50 hover:border-gray-700/50'
          }`}
          onClick={() => unhealthyNetworks > 0 && setIssuesExpanded(!issuesExpanded)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${unhealthyNetworks > 0 ? 'bg-red-500/10' : 'bg-gray-500/10'}`}>
              <AlertTriangle className={`w-4 h-4 ${unhealthyNetworks > 0 ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            {unhealthyNetworks > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-red-400/60">
                  {issuesByChain.length} chain{issuesByChain.length !== 1 ? 's' : ''}
                </span>
                {issuesExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-red-400/60" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-red-400/60" />
                )}
              </div>
            )}
          </div>
          <div className={`text-2xl font-bold ${unhealthyNetworks > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {unhealthyNetworks.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Issues Detected</div>
        </div>
      </div>

      {/* Expanded issues panel */}
      {issuesExpanded && unhealthyNetworks > 0 && (
        <div className="glow-card rounded-xl bg-gray-900/60 border border-red-500/20 overflow-hidden animate-slide-in">
          <div className="flex items-center justify-between px-4 py-3 bg-red-500/5 border-b border-red-500/10">
            <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Issue Details
              <span className="text-xs font-normal text-gray-500">
                ({unhealthyNetworks} unhealthy link{unhealthyNetworks !== 1 ? 's' : ''} across {issuesByChain.length} chain{issuesByChain.length !== 1 ? 's' : ''})
              </span>
            </h3>
            <button
              onClick={(e) => { e.stopPropagation(); setIssuesExpanded(false); }}
              className="p-1 rounded-lg hover:bg-gray-800/50 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {issuesByChain.map(([chainId, data]) => (
              <div key={chainId} className="rounded-lg bg-gray-800/30 border border-gray-800/50 p-3">
                <div className="flex items-center gap-2.5 mb-2">
                  <ChainLogo chainId={chainId} size={22} />
                  <span className="text-sm font-medium text-gray-200">{data.chainName}</span>
                  <span className="text-[10px] font-mono text-gray-600">#{chainId}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                    {data.guardians.length} guardian{data.guardians.length !== 1 ? 's' : ''} down
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.guardians.map((name) => (
                    <span
                      key={name}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-gray-800/80 text-gray-400 border border-gray-700/50"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
