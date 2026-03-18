import { Download } from 'lucide-react';
import type { Heartbeat } from '../types';

interface Props {
  heartbeats: Heartbeat[];
}

const FIVE_MINUTES_NS = 5n * 60n * 1_000_000_000n;

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function DataExport({ heartbeats }: Props) {
  const handleExport = () => {
    const nowNs = BigInt(Date.now()) * 1_000_000n;

    const headers = [
      'Guardian Name',
      'Guardian Address',
      'Version',
      'Heartbeat Counter',
      'Number of Networks',
      'Healthy Chains (signed in 5min)',
      'Total Height (sum)',
      'Timestamp',
    ];

    const rows = heartbeats.map((hb) => {
      const healthyChains = hb.networks.filter((n) => {
        if (!n.lastObservationSignedAt || n.lastObservationSignedAt === '0') return false;
        try {
          const signedAt = BigInt(n.lastObservationSignedAt);
          return nowNs - signedAt < FIVE_MINUTES_NS;
        } catch {
          return false;
        }
      }).length;

      const totalHeight = hb.networks.reduce((sum, n) => {
        const h = parseInt(n.height, 10);
        return sum + (isNaN(h) ? 0 : h);
      }, 0);

      return [
        escapeCSV(hb.nodeName),
        escapeCSV(hb.guardianAddr),
        escapeCSV(hb.version),
        hb.counter,
        String(hb.networks.length),
        String(healthyChains),
        String(totalHeight),
        hb.timestamp,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `wormhole-guardians-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="px-3 py-1.5 text-xs rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors flex items-center gap-1.5"
    >
      <Download className="w-3.5 h-3.5" />
      Export CSV
    </button>
  );
}
