import { useMemo, useState, useEffect } from 'react';
import { ListChecks, Check, X, Loader2, ExternalLink, Copy } from 'lucide-react';
import type { GovernorEnqueuedVAA, DelegatedGuardianConfigMap } from '../utils/api';
import { fetchSignedVAAExists, vaaKey } from '../utils/api';
import type { NetworkEndpoint } from '../types';
import { getChainName } from '../types';
import { shortenAddress } from '../utils/helpers';
import ChainLogo from './ChainLogo';

interface Props {
  enqueuedVAAs: GovernorEnqueuedVAA[];
  /** endpoint used to look up whether each VAA has a signed (quorum) VAA yet */
  endpoint: NetworkEndpoint;
  /** per-chain delegate guardian config (which guardians watch a chain + quorum) */
  delegatedGuardians: DelegatedGuardianConfigMap;
  /** vaaKey -> guardian addresses (lowercased, no 0x) that have signed/enqueued it */
  signersByVaa: Record<string, string[]>;
  /** guardian address (lowercased, no 0x) -> node name */
  guardianNames: Record<string, string>;
  loading: boolean;
}

function formatUSD(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(num)) return '$0';
  return `$${Math.round(num).toLocaleString()}`;
}

/**
 * "Has Quorum?" cell — checks whether a fully-signed VAA exists for this message
 * (a quorum of guardians has signed it). Re-checks periodically until it appears,
 * mirroring the official dashboard's EnqueuedVAAChecker.
 */
function QuorumCell({ endpoint, vaa }: { endpoint: NetworkEndpoint; vaa: GovernorEnqueuedVAA }) {
  const [hasQuorum, setHasQuorum] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      const result = await fetchSignedVAAExists(
        endpoint,
        vaa.emitterChain,
        vaa.emitterAddress,
        vaa.sequence,
      );
      if (cancelled) return;
      setHasQuorum(result);
      // Keep polling until the signed VAA shows up.
      if (!result) timer = setTimeout(check, 60000);
    };

    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [endpoint, vaa.emitterChain, vaa.emitterAddress, vaa.sequence]);

  if (hasQuorum === null) {
    return (
      <span title="Checking for a signed VAA…">
        <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
      </span>
    );
  }
  return hasQuorum ? (
    <span title="A signed VAA exists — a quorum of guardians has signed it">
      <Check className="w-4 h-4 text-emerald-400" />
    </span>
  ) : (
    <span title="No signed VAA yet — awaiting guardian quorum">
      <X className="w-4 h-4 text-red-400" />
    </span>
  );
}

// Conventional guardiand admin socket path; operators adjust if theirs differs.
const ADMIN_SOCKET = '/run/guardiand/admin.socket';

/**
 * The guardiand command an operator runs to reobserve a stuck message. The CLI
 * accepts the tx hash as hex (0x…) or base58, so the raw txHash works for EVM and
 * Solana/Sui alike.
 */
function reobserveCommand(v: GovernorEnqueuedVAA): string {
  return `guardiand admin send-observation-request --socket ${ADMIN_SOCKET} ${v.emitterChain} ${v.txHash}`;
}

/** Copy-to-clipboard button for a VAA's reobserve command. */
function ReobserveButton({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — no-op.
    }
  };

  return (
    <button
      onClick={onCopy}
      title={`Copy reobserve command:\n${command}`}
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-1 rounded-md bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Reobserve'}
    </button>
  );
}

export default function GovernorEnqueued({
  enqueuedVAAs,
  endpoint,
  delegatedGuardians,
  signersByVaa,
  guardianNames,
  loading,
}: Props) {
  // Overdue first, then soonest release time.
  const sorted = useMemo(
    () => [...enqueuedVAAs].sort((a, b) => a.releaseTime - b.releaseTime),
    [enqueuedVAAs],
  );
  const signersLoaded = Object.keys(signersByVaa).length > 0;

  if (loading && enqueuedVAAs.length === 0) return null;

  return (
    <div className="glow-card rounded-xl bg-gray-900/60 border border-gray-800/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10">
            <ListChecks className="w-4 h-4 text-amber-400" />
          </span>
          Enqueued VAAs
          <span className="text-xs font-normal text-gray-500">({sorted.length})</span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2 text-left font-medium">Chain</th>
              <th className="px-3 py-2 text-left font-medium">Emitter</th>
              <th className="px-3 py-2 text-left font-medium">Sequence</th>
              <th className="px-3 py-2 text-center font-medium">Has Quorum?</th>
              <th className="px-3 py-2 text-left font-medium">Delegate Signers</th>
              <th className="px-3 py-2 text-left font-medium">Transaction Hash</th>
              <th className="px-3 py-2 text-left font-medium">Release Time</th>
              <th className="px-3 py-2 text-right font-medium">Notional Value</th>
              <th className="px-3 py-2 text-center font-medium">Reobserve</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {sorted.map((v, i) => {
              const releaseDate = new Date(v.releaseTime * 1000);
              const isOverdue = releaseDate.getTime() < Date.now();
              const vaaUrl = `https://wormholescan.io/#/tx/${v.emitterChain}/${v.emitterAddress}/${v.sequence}`;

              // Delegate-guardian signing progress for this VAA.
              const cfg = delegatedGuardians[v.emitterChain];
              const signed = new Set(signersByVaa[vaaKey(v.emitterChain, v.emitterAddress, v.sequence)] || []);
              const missing = cfg ? cfg.keys.filter((k) => !signed.has(k)) : [];
              const signedCount = cfg ? cfg.keys.length - missing.length : 0;

              return (
                <tr key={`${v.emitterChain}-${v.emitterAddress}-${v.sequence}-${i}`} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ChainLogo chainId={v.emitterChain} size={16} />
                      <span className="text-xs text-gray-300 whitespace-nowrap">
                        {getChainName(v.emitterChain)}{' '}
                        <span className="text-gray-600">({v.emitterChain})</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-mono text-gray-500" title={v.emitterAddress}>
                      {shortenAddress(v.emitterAddress, 8)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={vaaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
                    >
                      {v.sequence}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">
                      <QuorumCell endpoint={endpoint} vaa={v} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {!cfg ? (
                      <span className="text-[10px] text-gray-600" title="Not a delegate-guardian chain">—</span>
                    ) : !signersLoaded ? (
                      <span className="text-[10px] text-gray-600">…</span>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap max-w-[260px]">
                        <span
                          className={`text-[10px] font-mono ${
                            signedCount >= cfg.threshold ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                          title={`${signedCount} signed of ${cfg.keys.length} delegates (quorum ${cfg.threshold})`}
                        >
                          {signedCount}/{cfg.keys.length}
                        </span>
                        {missing.map((k) => (
                          <span
                            key={k}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 whitespace-nowrap"
                            title={`${guardianNames[k] || k} has not signed`}
                          >
                            {guardianNames[k] || `${k.slice(0, 6)}…`}
                          </span>
                        ))}
                        {missing.length === 0 && (
                          <span className="text-[9px] text-emerald-400/80">all signed</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {v.txHash ? (
                      <a
                        href={`https://wormholescan.io/#/tx/${v.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {shortenAddress(v.txHash, 8)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[11px] whitespace-nowrap ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                      {releaseDate.toLocaleString()}
                      {isOverdue && <span className="ml-1 text-red-500">(overdue)</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-amber-400 whitespace-nowrap">
                    {formatUSD(v.notionalValue)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {v.txHash ? (
                      <ReobserveButton command={reobserveCommand(v)} />
                    ) : (
                      <span className="text-[10px] text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-xs">
            No VAAs are currently enqueued by the governor
          </div>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800/40 flex items-center justify-between gap-3 flex-wrap text-[11px] text-gray-500">
          <span>{sorted.length} {sorted.length === 1 ? 'Row' : 'Rows'}</span>
          <span className="text-gray-600">
            Reobserve commands assume the admin socket at{' '}
            <code className="text-gray-500">{ADMIN_SOCKET}</code> — adjust for your setup.
          </span>
        </div>
      )}
    </div>
  );
}
