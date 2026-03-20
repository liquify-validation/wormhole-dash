import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { HourlyCount } from '../utils/api';

interface Props {
  hourlyCounts: HourlyCount[];
}

export default function MessageVolumeChart({ hourlyCounts }: Props) {
  const data = useMemo(() => {
    return [...hourlyCounts]
      .reverse()
      .map((h) => {
        const d = new Date(h.time);
        return {
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: h.count,
        };
      });
  }, [hourlyCounts]);

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.messages, 0);
  const avg = Math.round(total / data.length);
  const max = Math.max(...data.map((d) => d.messages));
  const min = Math.min(...data.map((d) => d.messages));

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-violet-500/10">
            <BarChart3 className="w-4 h-4 text-violet-400" />
          </span>
          Message Throughput (24h)
        </h2>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-gray-500">Avg: <span className="text-gray-400 font-mono">{avg}/hr</span></span>
          <span className="text-gray-500">Peak: <span className="text-emerald-400 font-mono">{max}/hr</span></span>
          <span className="text-gray-500">Low: <span className="text-amber-400 font-mono">{min}/hr</span></span>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="msgGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [`${Number(value).toLocaleString()} messages`, 'Volume']}
            />
            <Area
              type="monotone"
              dataKey="messages"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#msgGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
