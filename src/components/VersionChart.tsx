import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Heartbeat } from '../types';

interface Props {
  heartbeats: Heartbeat[];
}

const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#14b8a6'];

export default function VersionChart({ heartbeats }: Props) {
  const versionData = useMemo(() => {
    const counts = new Map<string, number>();
    heartbeats.forEach((hb) => {
      const ver = hb.version?.split('/')[1] || hb.version || 'Unknown';
      counts.set(ver, (counts.get(ver) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [heartbeats]);

  if (versionData.length === 0) return null;

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
        Version Distribution
      </h2>
      <div className="flex items-center gap-8">
        <div className="w-44 h-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={versionData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {versionData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                itemStyle={{ color: '#d1d5db' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2.5">
          {versionData.map((v, i) => (
            <div key={v.name} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-sm font-mono text-gray-400 flex-1 truncate">
                {v.name}
              </span>
              <span className="text-sm font-semibold text-gray-300">
                {v.value}
              </span>
              <div className="w-24 h-2 rounded-full bg-gray-800/50 overflow-hidden hidden sm:block">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(v.value / heartbeats.length) * 100}%`,
                    backgroundColor: COLORS[i % COLORS.length],
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
