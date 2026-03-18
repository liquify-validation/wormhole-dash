import { DollarSign, MessageSquare, ArrowLeftRight, Lock } from 'lucide-react';
import type { Scorecard } from '../utils/api';

interface Props {
  scorecards: Scorecard | null;
  loading: boolean;
}

function formatBigNum(val: string | undefined): string {
  if (!val) return '—';
  const num = parseFloat(val);
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
  return num.toLocaleString();
}

export default function NetworkScorecards({ scorecards, loading }: Props) {
  if (loading && !scorecards) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-3 w-16 bg-gray-800 rounded" />
              <div className="h-6 w-24 bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!scorecards) return null;

  const cards = [
    {
      label: 'Total Value Locked',
      value: `$${formatBigNum(scorecards.tvl)}`,
      icon: Lock,
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: '24h Volume',
      value: `$${formatBigNum(scorecards['24h_volume'])}`,
      sub: `7d: $${formatBigNum(scorecards['7d_volume'])}`,
      icon: DollarSign,
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: '24h Messages',
      value: formatBigNum(scorecards['24h_messages']),
      sub: `Total: ${formatBigNum(scorecards.total_messages)}`,
      icon: MessageSquare,
      textColor: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
    },
    {
      label: 'Total Transactions',
      value: formatBigNum(scorecards.total_tx_count),
      sub: `Vol: $${formatBigNum(scorecards.total_volume)}`,
      icon: ArrowLeftRight,
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-4 hover:border-gray-700/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`w-4 h-4 ${card.textColor}`} />
            </div>
          </div>
          <div className={`text-xl font-bold ${card.textColor}`}>{card.value}</div>
          <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          {card.sub && (
            <div className="text-[10px] text-gray-600 mt-0.5">{card.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
