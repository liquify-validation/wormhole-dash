import { Globe, Settings, RefreshCw } from 'lucide-react';
import type { NetworkEndpoint } from '../types';
import { NETWORK_ENDPOINTS } from '../utils/api';

interface Props {
  endpoint: NetworkEndpoint;
  onEndpointChange: (ep: NetworkEndpoint) => void;
  lastUpdated: Date | null;
  loading: boolean;
}

export default function Header({ endpoint, onEndpointChange, lastUpdated, loading }: Props) {
  return (
    <header className="glass sticky top-0 z-50 border-b border-gray-800/50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/liquify-logo.png"
                alt="Liquify"
                className="w-10 h-10 rounded-xl shadow-lg"
              />
              {!loading && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-gray-950" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                Wormhole Guardian
              </h1>
              <p className="text-xs text-gray-500">Network Monitor</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Endpoint selector */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={endpoint.endpoint}
                onChange={(e) => {
                  const ep = NETWORK_ENDPOINTS.find((n) => n.endpoint === e.target.value);
                  if (ep) onEndpointChange(ep);
                }}
                className="bg-gray-800/80 border border-gray-700/50 text-sm rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              >
                {NETWORK_ENDPOINTS.map((ep) => (
                  <option key={ep.endpoint} value={ep.endpoint}>
                    {ep.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              {lastUpdated && (
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              )}
            </div>

            {/* Settings placeholder */}
            <button className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors text-gray-400 hover:text-gray-300">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
