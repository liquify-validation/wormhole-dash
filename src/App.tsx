import { useState, useMemo, useEffect, useCallback } from 'react';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import type { NetworkEndpoint } from './types';
import { NETWORK_ENDPOINTS } from './utils/api';
import { useBackend } from './hooks/useBackend';
import { useHeartbeats } from './hooks/useHeartbeats';
import { useGuardianSet } from './hooks/useGuardianSet';
import { useGovernor } from './hooks/useGovernor';
import { useGovernorQuorum } from './hooks/useGovernorQuorum';
import { usePerformanceHistory } from './hooks/usePerformanceHistory';
import { useWormholescan } from './hooks/useWormholescan';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import ChainOverview from './components/ChainOverview';
import GuardianCard from './components/GuardianCard';
import GuardianTable from './components/GuardianTable';
import VersionChart from './components/VersionChart';
import NetworkSearch from './components/NetworkSearch';
import LoadingState from './components/LoadingState';
import GovernorStatus from './components/GovernorStatus';
import GuardianSetInfo from './components/GuardianSetInfo';
import ChainDetailTable from './components/ChainDetailTable';
import GovernorTokens from './components/GovernorTokens';
import GovernorRateLimits from './components/GovernorRateLimits';
import GovernorEnqueued from './components/GovernorEnqueued';
import NetworkLatency from './components/NetworkLatency';
import GuardianFeatures from './components/GuardianFeatures';
import PerformanceMonitor from './components/PerformanceMonitor';
import NetworkScorecards from './components/NetworkScorecards';
import MessageVolumeChart from './components/MessageVolumeChart';
import LiveFeed from './components/LiveFeed';
import CrossChainFlows from './components/CrossChainFlows';
import GuardianChainMatrix from './components/GuardianChainMatrix';
import DataExport from './components/DataExport';
import GuardianLag from './components/GuardianLag';

type Tab = 'overview' | 'guardians' | 'chains' | 'governor' | 'performance' | 'network';

const VALID_TABS: Tab[] = ['overview', 'network', 'guardians', 'chains', 'governor', 'performance'];

function getTabFromHash(): Tab {
  const hash = window.location.hash.replace('#', '');
  return VALID_TABS.includes(hash as Tab) ? (hash as Tab) : 'overview';
}

// Check if backend mode is enabled via env var
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

export default function App() {
  const [endpoint, setEndpoint] = useState<NetworkEndpoint>(NETWORK_ENDPOINTS[0]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [tab, setTab] = useState<Tab>(getTabFromHash);

  const setTabWithHash = useCallback((t: Tab) => {
    setTab(t);
    window.location.hash = t === 'overview' ? '' : t;
  }, []);

  useEffect(() => {
    const onHashChange = () => setTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // ── Backend mode (WebSocket) ──────────────────────────────────────────
  const backend = useBackend();

  // ── Direct mode (fallback: each client polls APIs) ────────────────────
  const directHeartbeats = useHeartbeats(endpoint);
  const directGuardianSet = useGuardianSet(endpoint);
  const directGovernor = useGovernor(endpoint);
  const directWormholescan = useWormholescan();

  // ── Choose data source ────────────────────────────────────────────────
  const usingBackend = USE_BACKEND && backend.connected;

  const heartbeats = usingBackend ? backend.heartbeats : directHeartbeats.heartbeats;
  const loading = usingBackend ? backend.loading : directHeartbeats.loading;
  const error = usingBackend ? backend.error : directHeartbeats.error;
  const lastUpdated = usingBackend ? backend.lastUpdated : directHeartbeats.lastUpdated;
  const guardianSet = usingBackend ? backend.guardianSet : directGuardianSet.guardianSet;
  const gsLoading = usingBackend ? backend.loading : directGuardianSet.loading;
  const notionals = usingBackend ? backend.governor.notionals : directGovernor.notionals;
  const enqueuedVAAs = usingBackend ? backend.governor.enqueuedVAAs : directGovernor.enqueuedVAAs;
  const tokens = usingBackend ? backend.governor.tokens : directGovernor.tokens;
  const govLoading = usingBackend ? backend.loading : directGovernor.loading;
  const wormholescan = usingBackend
    ? { ...backend.wormholescan, loading: backend.loading }
    : directWormholescan;

  // Cross-guardian governor status (for enqueued-VAA quorum). Env-scoped and
  // independent of the selected endpoint / data source.
  const governorQuorum = useGovernorQuorum(endpoint.env);
  const guardianCount = guardianSet?.addresses.length || heartbeats.length || 19;
  const quorumThreshold = Math.floor((guardianCount * 2) / 3) + 1;

  const performance = usePerformanceHistory(heartbeats);

  // Sync endpoint switching
  const handleEndpointChange = useCallback(
    (ep: NetworkEndpoint) => {
      setEndpoint(ep);
      if (USE_BACKEND) {
        // Map NetworkEndpoint to backend key
        const keyMap: Record<string, string> = {
          'https://europe-west3-wormhole-message-db-mainnet.cloudfunctions.net': 'mainnet_cf',
          'https://guardian.mainnet.xlabs.xyz': 'mainnet_xlabs',
          'https://wormhole-v2-mainnet-api.mcf.rocks': 'mainnet_mcf',
          'https://wormhole-v2-mainnet-api.chainlayer.network': 'mainnet_chainlayer',
          'https://europe-west3-wormhole-message-db-testnet.cloudfunctions.net': 'testnet_cf',
          'https://guardian.testnet.xlabs.xyz': 'testnet_xlabs',
        };
        const key = keyMap[ep.endpoint];
        if (key) backend.switchEndpoint(key);
      }
    },
    [backend.switchEndpoint],
  );

  const filtered = useMemo(() => {
    if (!search) return heartbeats;
    const q = search.toLowerCase();
    return heartbeats.filter(
      (hb) =>
        hb.nodeName?.toLowerCase().includes(q) ||
        hb.guardianAddr?.toLowerCase().includes(q) ||
        hb.version?.toLowerCase().includes(q)
    );
  }, [heartbeats, search]);

  if (loading && heartbeats.length === 0) {
    return <LoadingState />;
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'network', label: 'Network' },
    { key: 'guardians', label: 'Guardians', count: heartbeats.length },
    { key: 'chains', label: 'Chains' },
    { key: 'governor', label: 'Governor', count: enqueuedVAAs.length > 0 ? enqueuedVAAs.length : undefined },
    { key: 'performance', label: 'Performance' },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <Header
        endpoint={endpoint}
        onEndpointChange={handleEndpointChange}
        lastUpdated={lastUpdated}
        loading={loading}
      />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Connection mode indicator */}
        {USE_BACKEND && (
          <div className={`flex items-center gap-2 text-[10px] px-3 py-1.5 rounded-lg w-fit ${
            usingBackend
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {usingBackend ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {usingBackend ? 'Connected to backend' : 'Direct mode (backend unavailable)'}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats - always visible */}
        <StatsBar heartbeats={heartbeats} />

        {/* Tab navigation */}
        <div className="flex items-center gap-1 border-b border-gray-800/50 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTabWithHash(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                tab === t.key
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gray-800 text-gray-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <NetworkScorecards scorecards={wormholescan.scorecards} loading={wormholescan.loading} />
            <ChainOverview heartbeats={heartbeats} />
            <GuardianSetInfo
              guardianSet={guardianSet}
              heartbeats={heartbeats}
              loading={gsLoading}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <VersionChart heartbeats={heartbeats} />
              <GovernorStatus
                notionals={notionals}
                enqueuedVAAs={enqueuedVAAs}
                loading={govLoading}
              />
            </div>
            <GuardianChainMatrix heartbeats={heartbeats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GuardianLag heartbeats={heartbeats} />
              <NetworkLatency heartbeats={heartbeats} />
            </div>
            <GuardianFeatures heartbeats={heartbeats} />
          </div>
        )}

        {/* Network tab */}
        {tab === 'network' && (
          <div className="space-y-6">
            <NetworkScorecards scorecards={wormholescan.scorecards} loading={wormholescan.loading} />
            <MessageVolumeChart hourlyCounts={wormholescan.hourlyCounts} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LiveFeed transactions={wormholescan.recentTxs} loading={wormholescan.loading} />
              <CrossChainFlows flows={wormholescan.crossChainFlows} loading={wormholescan.loading} />
            </div>
          </div>
        )}

        {/* Guardians tab */}
        {tab === 'guardians' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <NetworkSearch
                  search={search}
                  onSearchChange={setSearch}
                  view={view}
                  onViewChange={setView}
                  count={filtered.length}
                />
              </div>
              <DataExport heartbeats={heartbeats} />
            </div>

            <GuardianChainMatrix heartbeats={heartbeats} />
            <GuardianLag heartbeats={heartbeats} />

            {view === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((hb, i) => (
                  <GuardianCard key={hb.guardianAddr} heartbeat={hb} index={i} />
                ))}
              </div>
            ) : (
              <GuardianTable heartbeats={filtered} />
            )}

            {filtered.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">No guardians found</p>
                {search && (
                  <p className="text-xs mt-1">Try adjusting your search query</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chains tab */}
        {tab === 'chains' && (
          <div className="space-y-6">
            <ChainOverview heartbeats={heartbeats} />
            <ChainDetailTable heartbeats={heartbeats} />
          </div>
        )}

        {/* Governor tab */}
        {tab === 'governor' && (
          <div className="space-y-6">
            <GovernorRateLimits
              notionals={notionals}
              enqueuedVAAs={enqueuedVAAs}
              loading={govLoading}
            />
            <GovernorEnqueued
              enqueuedVAAs={enqueuedVAAs}
              quorumCounts={governorQuorum.counts}
              quorumThreshold={quorumThreshold}
              loading={govLoading}
            />
            <GovernorTokens tokens={tokens} loading={govLoading} />
          </div>
        )}

        {/* Performance tab */}
        {tab === 'performance' && (
          <PerformanceMonitor heartbeats={heartbeats} performance={performance} />
        )}

        {/* Footer */}
        <footer className="text-center py-6 text-xs text-gray-600 border-t border-gray-800/30">
          Wormhole Guardian Dashboard &middot; Data refreshes every 10s &middot;{' '}
          <a
            href="https://github.com/wormhole-foundation/wormhole"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-cyan-400 transition-colors"
          >
            GitHub
          </a>
        </footer>
      </main>
    </div>
  );
}
