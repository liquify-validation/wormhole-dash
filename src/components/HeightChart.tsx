import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Heartbeat } from '../types';
import { getChainName, getChainColor } from '../types';

interface Props {
  heartbeats: Heartbeat[];
}

export default function HeightChart({ heartbeats }: Props) {
  const data = useMemo(() => {
    const chains = new Map<number, { maxHeight: number; guardians: number }>();

    heartbeats.forEach((hb) => {
      hb.networks?.forEach((n) => {
        const height = parseInt(n.height) || 0;
        const existing = chains.get(n.id);
        if (!existing) {
          chains.set(n.id, { maxHeight: height, guardians: height > 0 ? 1 : 0 });
        } else {
          if (height > existing.maxHeight) existing.maxHeight = height;
          if (height > 0) existing.guardians++;
        }
      });
    });

    return Array.from(chains.entries())
      .map(([id, stats]) => ({
        name: getChainName(id),
        id,
        height: stats.maxHeight,
        guardians: stats.guardians,
        color: getChainColor(id),
      }))
      .filter((d) => d.height > 0)
      .sort((a, b) => b.guardians - a.guardians)
      .slice(0, 20);
  }, [heartbeats]);

  if (data.length === 0) return null;

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" />
        Guardian Coverage by Chain (Top 20)
      </h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
            <XAxis
              type="number"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={75}
            />
            <Tooltip
              contentStyle={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              itemStyle={{ color: '#d1d5db' }}
              formatter={(value) => [`${value} guardians`, 'Coverage']}
            />
            <Bar dataKey="guardians" radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
