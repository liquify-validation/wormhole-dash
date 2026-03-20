import { useMemo } from 'react';
import { Zap } from 'lucide-react';
import type { Heartbeat } from '../types';

interface Props {
  heartbeats: Heartbeat[];
}

export default function NetworkLatency({ heartbeats }: Props) {
  const stats = useMemo(() => {
    const now = Date.now();
    const latencies: { name: string; latencyMs: number; counter: number; bootDays: number }[] = [];

    heartbeats.forEach((hb) => {
      const ts = parseInt(hb.timestamp);
      if (!ts) return;
      // Timestamps are in nanoseconds
      const hbMs = ts > 1e15 ? ts / 1e6 : ts > 1e12 ? ts / 1e3 : ts * 1000;
      const latency = now - hbMs;

      const bootTs = parseInt(hb.bootTimestamp);
      const bootMs = bootTs > 1e15 ? bootTs / 1e6 : bootTs > 1e12 ? bootTs / 1e3 : bootTs * 1000;
      const bootDays = (now - bootMs) / (1000 * 60 * 60 * 24);

      latencies.push({
        name: hb.nodeName || 'Unknown',
        latencyMs: latency,
        counter: parseInt(hb.counter) || 0,
        bootDays: Math.max(0, bootDays),
      });
    });

    latencies.sort((a, b) => a.latencyMs - b.latencyMs);

    const avgLatency = latencies.length > 0
      ? latencies.reduce((s, l) => s + l.latencyMs, 0) / latencies.length
      : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies.map((l) => l.latencyMs)) : 0;
    const minLatency = latencies.length > 0 ? Math.min(...latencies.map((l) => l.latencyMs)) : 0;
    const avgUptime = latencies.length > 0
      ? latencies.reduce((s, l) => s + l.bootDays, 0) / latencies.length
      : 0;

    return { latencies, avgLatency, maxLatency, minLatency, avgUptime };
  }, [heartbeats]);

  if (stats.latencies.length === 0) return null;

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <span className="p-1.5 rounded-lg bg-cyan-500/10">
          <Zap className="w-4 h-4 text-cyan-400" />
        </span>
        Guardian Heartbeat Latency
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="rounded-lg bg-gray-800/40 p-2 text-center">
          <div className="text-sm font-bold text-emerald-400">{formatLatency(stats.minLatency)}</div>
          <div className="text-[10px] text-gray-500">Fastest</div>
        </div>
        <div className="rounded-lg bg-gray-800/40 p-2 text-center">
          <div className="text-sm font-bold text-cyan-400">{formatLatency(stats.avgLatency)}</div>
          <div className="text-[10px] text-gray-500">Average</div>
        </div>
        <div className="rounded-lg bg-gray-800/40 p-2 text-center">
          <div className="text-sm font-bold text-amber-400">{formatLatency(stats.maxLatency)}</div>
          <div className="text-[10px] text-gray-500">Slowest</div>
        </div>
        <div className="rounded-lg bg-gray-800/40 p-2 text-center">
          <div className="text-sm font-bold text-violet-400">{stats.avgUptime.toFixed(1)}d</div>
          <div className="text-[10px] text-gray-500">Avg Uptime</div>
        </div>
      </div>

      {/* Latency bars */}
      <div className="space-y-1.5">
        {stats.latencies.map((g) => {
          const maxBar = stats.maxLatency || 1;
          const pct = Math.min((g.latencyMs / maxBar) * 100, 100);
          const barColor = g.latencyMs < 5000 ? '#10b981' : g.latencyMs < 15000 ? '#f59e0b' : '#ef4444';

          return (
            <div key={g.name} className="flex items-center gap-2" title={`Uptime: ${g.bootDays.toFixed(0)} days`}>
              <span className="text-[10px] text-gray-400 w-28 truncate shrink-0">{g.name}</span>
              <div className="flex-1 min-w-0 h-2 rounded-full bg-gray-800/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
              <span className="text-[10px] font-mono text-gray-500 w-12 text-right shrink-0">
                {formatLatency(g.latencyMs)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
