import { useMemo, useState } from 'react';
import { Puzzle, ChevronDown, ChevronUp, Check, X, Info } from 'lucide-react';
import type { Heartbeat } from '../types';

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'ethCall': 'Allows querying EVM contract state cross-chain via Wormhole queries (CCQ). Enables read-only calls to Ethereum-compatible chains.',
  'ntt': 'Native Token Transfers — framework for transferring native tokens across chains without wrapping, preserving token properties.',
  'governor': 'Rate-limiting mechanism that caps the notional value of transfers per chain per day to protect against exploits.',
  'ibc-translator': 'Bridges Wormhole messages to/from IBC-enabled Cosmos chains, translating between Wormhole and IBC protocols.',
  'accountant': 'On-chain accounting system (on Wormchain) that tracks token balances across chains to ensure no tokens are minted without backing.',
  'gateway': 'Wormhole Gateway — Cosmos-SDK chain (Wormchain) that acts as a routing hub for Cosmos ecosystem cross-chain transfers.',
  'ibcReceiver': 'Receives and processes inbound IBC messages from Cosmos chains, converting them into Wormhole observations.',
  'wormchainNodeName': 'Indicates the guardian runs a Wormchain (Gateway) full node, enabling direct on-chain verification.',
  'processor': 'Core VAA processing engine — handles observation, attestation, and signing of cross-chain messages.',
  'db': 'Persistent database for storing signed VAAs and guardian state, enabling historical queries and recovery.',
  'publicRpc': 'Exposes a public gRPC/REST endpoint for external clients to query guardian state and submit observations.',
  'publicWeb': 'Serves the public-facing web API for querying signed VAAs and network status.',
};

function getFeatureDescription(feature: string): string {
  return FEATURE_DESCRIPTIONS[feature] || 'Guardian protocol feature. No additional description available.';
}

interface Props {
  heartbeats: Heartbeat[];
}

export default function GuardianFeatures({ heartbeats }: Props) {
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const { adoption, guardianFeatures } = useMemo(() => {
    const allFeatures = new Set<string>();
    const guardianFeatures: { name: string; features: Set<string> }[] = [];

    heartbeats.forEach((hb) => {
      const feats = new Set<string>();
      hb.features?.forEach((f) => {
        const baseName = f.split(':')[0];
        allFeatures.add(baseName);
        feats.add(baseName);
      });
      guardianFeatures.push({
        name: hb.nodeName || hb.guardianAddr,
        features: feats,
      });
    });

    const adoption = Array.from(allFeatures)
      .sort()
      .map((f) => {
        const supported = guardianFeatures.filter((g) => g.features.has(f));
        const missing = guardianFeatures.filter((g) => !g.features.has(f));
        return {
          feature: f,
          count: supported.length,
          total: guardianFeatures.length,
          pct: guardianFeatures.length > 0 ? (supported.length / guardianFeatures.length) * 100 : 0,
          supported: supported.map((g) => g.name),
          missing: missing.map((g) => g.name),
        };
      })
      .sort((a, b) => b.count - a.count);

    return { adoption, guardianFeatures };
  }, [heartbeats]);

  if (adoption.length === 0) return null;

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-teal-500/10">
            <Puzzle className="w-4 h-4 text-teal-400" />
          </span>
          Feature Adoption
        </h2>
        <span className="text-[10px] text-gray-600">
          {adoption.length} features across {guardianFeatures.length} guardians
        </span>
      </div>

      <div className="space-y-1.5">
        {adoption.map((a) => {
          const isExpanded = expandedFeature === a.feature;
          const statusColor =
            a.pct === 100
              ? 'text-emerald-400'
              : a.pct >= 67
                ? 'text-amber-400'
                : 'text-red-400';
          const barColor =
            a.pct === 100
              ? 'bg-emerald-500/60'
              : a.pct >= 67
                ? 'bg-amber-500/60'
                : 'bg-red-500/60';
          const statusLabel =
            a.pct === 100 ? 'Full' : a.pct >= 67 ? 'Partial' : 'Low';

          return (
            <div key={a.feature}>
              <div
                onClick={() => setExpandedFeature(isExpanded ? null : a.feature)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  isExpanded ? 'bg-gray-800/40' : 'hover:bg-gray-800/30'
                }`}
              >
                {/* Feature name + info tooltip */}
                <div className="relative group/tip flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-mono text-gray-300">
                    {a.feature}
                  </span>
                  <Info className="w-3 h-3 text-gray-600 group-hover/tip:text-gray-400 transition-colors" />
                  <div className="pointer-events-none absolute left-0 bottom-full mb-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-30">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl w-64">
                      <div className="text-[11px] font-semibold text-gray-200 mb-1">{a.feature}</div>
                      <div className="text-[10px] text-gray-400 leading-relaxed">{getFeatureDescription(a.feature)}</div>
                      <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800" />
                    </div>
                  </div>
                </div>

                {/* Bar */}
                <div className="flex-1 h-3 rounded-full bg-gray-800/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${a.pct}%` }}
                  />
                </div>

                {/* Count + status */}
                <span className="text-xs font-mono text-gray-400 shrink-0">
                  {a.count}/{a.total}
                </span>
                <span className={`text-[10px] font-medium w-12 text-right shrink-0 ${statusColor}`}>
                  {statusLabel}
                </span>

                {/* Expand arrow */}
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                )}
              </div>

              {/* Expanded: show who has it and who doesn't */}
              {isExpanded && (
                <div className="ml-3 mr-3 mt-1 mb-2 px-3 py-2.5 rounded-lg bg-gray-800/20 border border-gray-800/40 animate-slide-in">
                  {a.missing.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
                        Not supported ({a.missing.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {a.missing.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"
                          >
                            <X className="w-2.5 h-2.5" />
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
                      Supported ({a.supported.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {a.supported.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        >
                          <Check className="w-2.5 h-2.5" />
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
