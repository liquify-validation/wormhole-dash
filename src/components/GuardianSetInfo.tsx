import { useState } from 'react';
import { Users, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import type { Heartbeat } from '../types';
import { shortenAddress } from '../utils/helpers';

interface Props {
  guardianSet: { index: number; addresses: string[] } | null;
  heartbeats: Heartbeat[];
  loading: boolean;
}

export default function GuardianSetInfo({ guardianSet, heartbeats, loading }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  if (loading || !guardianSet) return null;

  const quorum = Math.floor((guardianSet.addresses.length * 2) / 3) + 1;

  const copyToClipboard = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  // Match guardian addresses to heartbeat names
  const guardianInfo = guardianSet.addresses.map((addr, i) => {
    const hb = heartbeats.find(
      (h) => h.guardianAddr?.toLowerCase() === addr.toLowerCase()
    );
    return {
      index: i,
      address: addr,
      name: hb?.nodeName || null,
      version: hb?.version || null,
      hasHeartbeat: !!hb,
    };
  });

  const activeCount = guardianInfo.filter((g) => g.hasHeartbeat).length;

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50">
      <div
        className="p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-500/10">
              <Users className="w-4 h-4 text-violet-400" />
            </span>
            Guardian Set #{guardianSet.index}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">{activeCount}/{guardianSet.addresses.length} active</span>
              <span className="text-gray-600">&middot;</span>
              <span className="text-gray-500">Quorum: {quorum}</span>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>

        {/* Mini visualization - dots for each guardian */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {guardianInfo.map((g) => (
            <div
              key={g.index}
              className={`flex-1 min-w-[20px] max-w-[60px] h-4 rounded-sm transition-all ${
                g.hasHeartbeat
                  ? 'bg-emerald-500/60 hover:bg-emerald-500'
                  : 'bg-red-500/40 hover:bg-red-500/60'
              }`}
              title={g.name || g.address}
            />
          ))}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800/50 px-5 pb-5">
          <div className="mt-3 space-y-1 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-[auto,1fr,1fr,auto,auto] gap-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium px-1 pb-1">
              <span>#</span>
              <span>Address</span>
              <span>Name</span>
              <span>Version</span>
              <span>Status</span>
            </div>
            {guardianInfo.map((g) => (
              <div
                key={g.index}
                className="grid grid-cols-[auto,1fr,1fr,auto,auto] gap-3 items-center px-1 py-1.5 rounded-lg hover:bg-gray-800/30 transition-colors"
              >
                <span className="text-[10px] text-gray-600 font-mono w-4 text-right">
                  {g.index}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-mono text-gray-400 truncate">
                    {shortenAddress(g.address, 8)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(g.address);
                    }}
                    className="p-0.5 rounded hover:bg-gray-700/50 text-gray-600 hover:text-gray-400 transition-colors shrink-0"
                  >
                    {copiedAddr === g.address ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <span className="text-xs text-gray-300 truncate">
                  {g.name || <span className="text-gray-600 italic">Unknown</span>}
                </span>
                <span className="text-[10px] font-mono text-gray-500">
                  {g.version?.split('/')[1] || g.version || '—'}
                </span>
                <div className="flex items-center justify-end">
                  {g.hasHeartbeat ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      Missing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
