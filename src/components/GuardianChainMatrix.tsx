import { useMemo } from 'react';
import { Grid3x3 } from 'lucide-react';
import type { Heartbeat } from '../types';
import { getChainName } from '../types';
import ChainLogo from './ChainLogo';

type CellStatus = 'signing' | 'ok' | 'behind';

interface MatrixCell {
  status: CellStatus | null;
  height: number;
  guardianName: string;
  chainName: string;
  chainId: number;
}

interface Props {
  heartbeats: Heartbeat[];
}

const STATUS_COLORS: Record<CellStatus, string> = {
  signing: 'bg-cyan-500',
  ok: 'bg-emerald-500',
  behind: 'bg-amber-500',
};

const STATUS_LABELS: Record<CellStatus, string> = {
  signing: 'Signing',
  ok: 'OK',
  behind: 'Behind',
};

export default function GuardianChainMatrix({ heartbeats }: Props) {
  const { chainIds, guardianNames, matrix } = useMemo(() => {
    // Collect all unique chain IDs
    const chainIdSet = new Set<number>();
    heartbeats.forEach((hb) => {
      hb.networks?.forEach((n) => chainIdSet.add(n.id));
    });
    const chainIds = Array.from(chainIdSet).sort((a, b) => a - b);

    // Compute max height per chain
    const maxHeights = new Map<number, number>();
    heartbeats.forEach((hb) => {
      hb.networks?.forEach((n) => {
        const height = parseInt(n.height) || 0;
        const current = maxHeights.get(n.id) || 0;
        if (height > current) maxHeights.set(n.id, height);
      });
    });

    // Build the matrix: guardians (rows) x chains (columns)
    const guardianNames: string[] = [];
    const matrix: MatrixCell[][] = [];
    const now = Date.now();

    heartbeats.forEach((hb) => {
      const name = hb.nodeName || 'Unknown';
      guardianNames.push(name);

      // Index this guardian's networks by chain ID
      const networkMap = new Map<number, (typeof hb.networks)[number]>();
      hb.networks?.forEach((n) => networkMap.set(n.id, n));

      const row: MatrixCell[] = chainIds.map((chainId) => {
        const network = networkMap.get(chainId);
        const chainName = getChainName(chainId);

        if (!network) {
          return { status: null, height: 0, guardianName: name, chainName, chainId };
        }

        const height = parseInt(network.height) || 0;
        const lastSigned = parseInt(network.lastObservationSignedAt) || 0;

        // Determine if signed recently (within 5 minutes)
        // lastObservationSignedAt is a nanosecond timestamp string
        let signedRecently = false;
        if (lastSigned > 0) {
          const ms = lastSigned > 1e15 ? lastSigned / 1e6 : lastSigned > 1e12 ? lastSigned / 1e3 : lastSigned * 1000;
          signedRecently = now - ms < 300000;
        }

        if (signedRecently) {
          return { status: 'signing' as CellStatus, height, guardianName: name, chainName, chainId };
        }

        // Check if significantly behind max height (more than 100 blocks)
        const maxH = maxHeights.get(chainId) || 0;
        if (height > 0 && maxH - height > 100) {
          return { status: 'behind' as CellStatus, height, guardianName: name, chainName, chainId };
        }

        return { status: 'ok' as CellStatus, height, guardianName: name, chainName, chainId };
      });

      matrix.push(row);
    });

    return { chainIds, guardianNames, matrix, maxHeights };
  }, [heartbeats]);

  if (heartbeats.length === 0 || chainIds.length === 0) return null;

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <Grid3x3 className="w-4 h-4 text-cyan-500" />
        Guardian × Chain Matrix
        <span className="text-[10px] font-normal text-gray-600">
          ({guardianNames.length} guardians × {chainIds.length} chains)
        </span>
      </h2>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        {(['signing', 'ok', 'behind'] as CellStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${STATUS_COLORS[status]}`} />
            <span className="text-[10px] text-gray-500">{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto">
        <table className="border-collapse w-full table-fixed">
          {/* Chain header row */}
          <thead>
            <tr>
              {/* Guardian name column header */}
              <th className="sticky left-0 z-10 bg-gray-900/90 backdrop-blur-sm px-2 py-1 text-left text-[10px] uppercase tracking-wider text-gray-500" style={{ width: 120 }}>
                Guardian
              </th>
              {chainIds.map((chainId) => (
                <th key={chainId} className="px-0.5 pb-1 pt-0 align-bottom">
                  <div className="flex flex-col items-center gap-0.5">
                    <ChainLogo chainId={chainId} size={14} />
                    <span
                      className="text-[8px] text-gray-500 whitespace-nowrap block"
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        maxHeight: 60,
                        overflow: 'hidden',
                      }}
                    >
                      {getChainName(chainId)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {matrix.map((row, gi) => (
              <tr key={guardianNames[gi]} className="hover:bg-gray-800/20 transition-colors">
                {/* Guardian name */}
                <td className="sticky left-0 z-10 bg-gray-900/90 backdrop-blur-sm px-2 py-0.5">
                  <span className="text-[10px] text-gray-400 block truncate max-w-[120px]" title={guardianNames[gi]}>
                    {guardianNames[gi]}
                  </span>
                </td>
                {/* Chain cells */}
                {row.map((cell, ci) => (
                  <td key={chainIds[ci]} className="px-0.5 py-0.5">
                    {cell.status === null ? (
                      <div className="h-5" />
                    ) : (
                      <div className="group relative flex items-center justify-center">
                        <div
                          className={`w-full h-5 rounded-sm ${STATUS_COLORS[cell.status]} transition-all hover:scale-110 hover:ring-1 hover:ring-white/30 cursor-default`}
                        />
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
                          <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                            <div className="text-[10px] font-semibold text-gray-200">{cell.guardianName}</div>
                            <div className="text-[10px] text-gray-400">{cell.chainName} (#{cell.chainId})</div>
                            <div className="text-[10px] text-gray-400">
                              Height: {cell.height > 0 ? cell.height.toLocaleString() : '—'}
                            </div>
                            <div className="text-[10px] mt-0.5">
                              <span
                                className={
                                  cell.status === 'signing'
                                    ? 'text-cyan-400'
                                    : cell.status === 'ok'
                                      ? 'text-emerald-400'
                                      : 'text-amber-400'
                                }
                              >
                                {STATUS_LABELS[cell.status]}
                              </span>
                            </div>
                            {/* Arrow */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800" />
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
