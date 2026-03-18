import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, PenTool, Timer } from 'lucide-react';
import type { Heartbeat } from '../types';
import type { PerformanceData } from '../hooks/usePerformanceHistory';
import { getChainName } from '../types';
import ChainLogo from './ChainLogo';

interface Props {
  heartbeats: Heartbeat[];
  performance: PerformanceData;
}

const CHART_COLORS = [
  '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#6366f1', '#14b8a6', '#f43f5e', '#84cc16', '#0ea5e9',
  '#a855f7', '#22d3ee', '#fb923c', '#4ade80', '#e879f9',
  '#38bdf8', '#facc15', '#34d399', '#f472b6', '#818cf8',
];

export default function PerformanceMonitor({ heartbeats, performance }: Props) {
  // Counter rate ranking
  const counterRanking = useMemo(() => {
    return heartbeats
      .map((hb) => ({
        name: hb.nodeName || 'Unknown',
        addr: hb.guardianAddr,
        counter: parseInt(hb.counter) || 0,
        rate: performance.counterRates.get(hb.guardianAddr) || 0,
        signingChains: performance.signingActivity.get(hb.guardianAddr) || 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [heartbeats, performance]);

  // Signing activity by chain
  const chainSigningActivity = useMemo(() => {
    const chainMap = new Map<number, { total: number; signing: number; guardians: string[] }>();
    const now = Date.now();
    const recentThreshold = now - 300000;

    heartbeats.forEach((hb) => {
      hb.networks?.forEach((n) => {
        if (!chainMap.has(n.id)) {
          chainMap.set(n.id, { total: 0, signing: 0, guardians: [] });
        }
        const entry = chainMap.get(n.id)!;
        entry.total++;
        const ts = parseInt(n.lastObservationSignedAt);
        if (ts) {
          const ms = ts > 1e15 ? ts / 1e6 : ts > 1e12 ? ts / 1e3 : ts * 1000;
          if (ms > recentThreshold) {
            entry.signing++;
            entry.guardians.push(hb.nodeName || 'Unknown');
          }
        }
      });
    });

    return Array.from(chainMap.entries())
      .map(([id, data]) => ({ chainId: id, ...data }))
      .filter((c) => c.signing > 0)
      .sort((a, b) => b.signing - a.signing);
  }, [heartbeats]);

  // Counter history chart data
  const chartData = useMemo(() => {
    if (performance.snapshots.length < 2) return [];

    const names = new Set<string>();
    performance.snapshots.forEach((s) => s.guardians.forEach((g) => names.add(g.name)));

    return performance.snapshots.map((s) => {
      const point: Record<string, number | string> = {
        time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      s.guardians.forEach((g) => {
        point[g.name] = g.counter;
      });
      return point;
    });
  }, [performance.snapshots]);

  const guardianNames = useMemo(() => {
    const names = new Set<string>();
    performance.snapshots.forEach((s) => s.guardians.forEach((g) => names.add(g.name)));
    return Array.from(names).sort();
  }, [performance.snapshots]);

  const maxRate = Math.max(...counterRanking.map((g) => g.rate), 1);
  const hasRateData = counterRanking.some((g) => g.rate > 0);
  const trackingDuration = performance.snapshots.length >= 2
    ? Math.round((performance.snapshots[performance.snapshots.length - 1].timestamp - performance.snapshots[0].timestamp) / 1000)
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-500">Avg Counter Rate</span>
          </div>
          <div className="text-xl font-bold text-cyan-400">
            {hasRateData
              ? (counterRanking.reduce((s, g) => s + g.rate, 0) / counterRanking.length).toFixed(1)
              : '—'}
          </div>
          <div className="text-[10px] text-gray-600">heartbeats/min</div>
        </div>
        <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-500">Highest Rate</span>
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {hasRateData ? counterRanking[0]?.rate.toFixed(1) : '—'}
          </div>
          <div className="text-[10px] text-gray-600 truncate">{counterRanking[0]?.name || '—'}</div>
        </div>
        <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <PenTool className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-gray-500">Active Signing</span>
          </div>
          <div className="text-xl font-bold text-violet-400">
            {chainSigningActivity.length}
          </div>
          <div className="text-[10px] text-gray-600">chains (last 5m)</div>
        </div>
        <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-500">Tracking</span>
          </div>
          <div className="text-xl font-bold text-amber-400">
            {trackingDuration > 60 ? `${Math.floor(trackingDuration / 60)}m ${trackingDuration % 60}s` : `${trackingDuration}s`}
          </div>
          <div className="text-[10px] text-gray-600">{performance.snapshots.length} samples</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Counter rate ranking */}
        <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500" />
            Heartbeat Counter Rate
          </h3>
          <p className="text-[10px] text-gray-600 mb-4">
            {hasRateData
              ? 'Heartbeats per minute measured over tracking period'
              : 'Collecting data... rates will appear after ~20 seconds'}
          </p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {counterRanking.map((g, i) => (
              <div key={g.addr} className="flex items-center gap-2 group">
                <span className="text-[10px] text-gray-600 w-4 text-right shrink-0">{i + 1}</span>
                <span className="text-[10px] text-gray-400 w-28 truncate shrink-0">{g.name}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-800/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: hasRateData ? `${(g.rate / maxRate) * 100}%` : '0%',
                      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-gray-500 w-14 text-right shrink-0">
                  {hasRateData ? `${g.rate.toFixed(1)}/m` : '—'}
                </span>
                <span className="text-[10px] font-mono text-gray-600 w-16 text-right shrink-0">
                  #{g.counter.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signing activity by chain */}
        <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500" />
            Recent Signing Activity
          </h3>
          <p className="text-[10px] text-gray-600 mb-4">Chains with observations signed in the last 5 minutes</p>

          {chainSigningActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-xs">
              No recent signing activity detected
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {chainSigningActivity.map((c) => {
                const pct = c.total > 0 ? (c.signing / c.total) * 100 : 0;
                return (
                  <div key={c.chainId} className="rounded-lg bg-gray-800/30 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <ChainLogo chainId={c.chainId} size={18} />
                        <span className="text-xs text-gray-300">{getChainName(c.chainId)}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {c.signing}/{c.total} guardians
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-700/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500/60 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Counter history chart */}
      {chartData.length > 1 && (
        <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500" />
            Heartbeat Counter Over Time
          </h3>
          <p className="text-[10px] text-gray-600 mb-4">Live counter progression (auto-records every 10s)</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#6b7280', fontSize: 9 }}
                  axisLine={{ stroke: '#374151' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontSize: '10px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                  itemStyle={{ padding: '1px 0' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }}
                  iconSize={8}
                />
                {guardianNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
