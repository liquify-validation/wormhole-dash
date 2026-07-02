import axios from 'axios';
import type { NetworkEndpoint } from '../types';

export const NETWORK_ENDPOINTS: NetworkEndpoint[] = [
  {
    name: 'Mainnet (Cloud Function)',
    endpoint: 'https://europe-west3-wormhole-message-db-mainnet.cloudfunctions.net',
    type: 'cloudfunction',
    env: 'mainnet',
  },
  {
    name: 'Mainnet (xLabs)',
    endpoint: 'https://guardian.mainnet.xlabs.xyz',
    type: 'guardian',
    env: 'mainnet',
  },
  {
    name: 'Mainnet (MCF)',
    endpoint: 'https://wormhole-v2-mainnet-api.mcf.rocks',
    type: 'guardian',
    env: 'mainnet',
  },
  {
    name: 'Mainnet (ChainLayer)',
    endpoint: 'https://wormhole-v2-mainnet-api.chainlayer.network',
    type: 'guardian',
    env: 'mainnet',
  },
  {
    name: 'Testnet (Cloud Function)',
    endpoint: 'https://europe-west3-wormhole-message-db-testnet.cloudfunctions.net',
    type: 'cloudfunction',
    env: 'testnet',
  },
  {
    name: 'Testnet (xLabs)',
    endpoint: 'https://guardian.testnet.xlabs.xyz',
    type: 'guardian',
    env: 'testnet',
  },
];

// Default selected endpoint. MCF is a valid-cert guardian RPC that serves the
// full governor REST API directly in the browser (unlike the cloud function,
// whose governor fallback path the browser can't reach).
export const DEFAULT_ENDPOINT: NetworkEndpoint =
  NETWORK_ENDPOINTS.find((e) => e.endpoint === 'https://wormhole-v2-mainnet-api.mcf.rocks') ??
  NETWORK_ENDPOINTS[0];

// Browser-reachable guardian RPCs (valid TLS cert + CORS) used to serve the
// /v1/governor/* and /v1/guardianset REST APIs when the selected endpoint is a
// cloud function (cloud functions don't expose those REST endpoints). The xlabs
// hosts are intentionally excluded: their TLS cert SAN doesn't match the request
// host, so the browser rejects them (the backend poller bypasses this with an
// insecure client, but the browser can't).
const GUARDIAN_RPC_FALLBACK: Record<'mainnet' | 'testnet', string[]> = {
  mainnet: [
    'https://wormhole-v2-mainnet-api.mcf.rocks',
    'https://wormhole-v2-mainnet-api.chainlayer.network',
  ],
  testnet: ['https://guardian.testnet.xlabs.xyz'],
};

/** Ordered list of guardian RPC bases to try for REST governor/guardianset calls. */
function guardianRpcBases(endpoint: NetworkEndpoint): string[] {
  return endpoint.type === 'guardian'
    ? [endpoint.endpoint]
    : GUARDIAN_RPC_FALLBACK[endpoint.env];
}

/** GET a `{ entries: [...] }` governor endpoint, trying each fallback base in order. */
async function fetchGovernorEntries<T>(endpoint: NetworkEndpoint, path: string): Promise<T[]> {
  const bases = guardianRpcBases(endpoint);
  let lastErr: unknown;
  for (const base of bases) {
    try {
      const res = await axios.get(`${base}${path}`);
      return res.data?.entries || [];
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('No reachable guardian RPC for governor data');
}

export async function fetchHeartbeats(endpoint: NetworkEndpoint) {
  if (endpoint.type === 'cloudfunction') {
    const res = await axios.get(`${endpoint.endpoint}/guardian-heartbeats`);
    return res.data;
  } else {
    const res = await axios.get(`${endpoint.endpoint}/v1/heartbeats`);
    return res.data;
  }
}

export async function fetchGuardianSet(endpoint: NetworkEndpoint) {
  if (endpoint.type === 'cloudfunction') {
    // Cloud functions may not have this; fallback to guardian RPC
    try {
      const res = await axios.get(`${endpoint.endpoint}/guardian-set-info`);
      return res.data;
    } catch {
      const res = await axios.get(`${guardianRpcBases(endpoint)[0]}/v1/guardianset/current`);
      return res.data;
    }
  } else {
    const res = await axios.get(`${endpoint.endpoint}/v1/guardianset/current`);
    return res.data;
  }
}

export interface GovernorNotional {
  chainId: number;
  remainingAvailableNotional: string;
  notionalLimit: string;
  bigTransactionSize: string;
}

export interface GovernorEnqueuedVAA {
  emitterChain: number;
  emitterAddress: string;
  sequence: string;
  releaseTime: number;
  notionalValue: string;
  txHash: string;
}

export interface GovernorToken {
  originChainId: number;
  originAddress: string;
  price: number;
}

export async function fetchGovernorNotionals(endpoint: NetworkEndpoint): Promise<GovernorNotional[]> {
  return fetchGovernorEntries<GovernorNotional>(endpoint, '/v1/governor/available_notional_by_chain');
}

export async function fetchGovernorEnqueuedVAAs(endpoint: NetworkEndpoint): Promise<GovernorEnqueuedVAA[]> {
  return fetchGovernorEntries<GovernorEnqueuedVAA>(endpoint, '/v1/governor/enqueued_vaas');
}

export async function fetchGovernorTokens(endpoint: NetworkEndpoint): Promise<GovernorToken[]> {
  return fetchGovernorEntries<GovernorToken>(endpoint, '/v1/governor/token_list');
}

// ── Cross-guardian governor status (for quorum) ───────────────────────────
// The public cloud functions aggregate every guardian's governor status,
// which is what lets us tell whether a quorum of guardians has enqueued a
// given VAA. This is env-scoped and independent of the selected endpoint.
export function cloudFunctionBase(env: 'mainnet' | 'testnet'): string {
  return env === 'testnet'
    ? 'https://europe-west3-wormhole-message-db-testnet.cloudfunctions.net'
    : 'https://europe-west3-wormhole-message-db-mainnet.cloudfunctions.net';
}

export interface GovernorQuorumInfo {
  /** `${chainId}:${normalizedEmitter}:${sequence}` -> # of guardians that enqueued it */
  counts: Record<string, number>;
  /** number of guardians reporting governor status */
  reporting: number;
}

/** Normalize an emitter address so the 0x-prefixed / zero-padded variants match. */
function normalizeEmitter(addr: string): string {
  return (addr || '').toLowerCase().replace(/^0x/, '').replace(/^0+/, '');
}

export function enqueuedKey(chainId: number, emitterAddress: string, sequence: string | number): string {
  return `${chainId}:${normalizeEmitter(emitterAddress)}:${sequence}`;
}

interface RawGovernorStatusGuardian {
  chains?: {
    chainId?: number;
    emitters?: {
      emitterAddress?: string;
      enqueuedVaas?: { sequence?: string | number }[];
    }[];
  }[];
}

export async function fetchGovernorQuorum(env: 'mainnet' | 'testnet'): Promise<GovernorQuorumInfo> {
  const res = await axios.get(`${cloudFunctionBase(env)}/governor-status`);
  const guardians: RawGovernorStatusGuardian[] = res.data?.governorStatus || res.data?.entries || [];
  const counts: Record<string, number> = {};

  for (const guardian of guardians) {
    // Count each guardian at most once per VAA.
    const seen = new Set<string>();
    for (const chain of guardian?.chains || []) {
      if (chain?.chainId === undefined) continue;
      for (const emitter of chain.emitters || []) {
        for (const vaa of emitter?.enqueuedVaas || []) {
          if (vaa?.sequence === undefined) continue;
          const key = enqueuedKey(chain.chainId, emitter.emitterAddress || '', vaa.sequence);
          if (!seen.has(key)) {
            seen.add(key);
            counts[key] = (counts[key] || 0) + 1;
          }
        }
      }
    }
  }

  return { counts, reporting: guardians.length };
}

// Wormholescan APIs
const WORMHOLESCAN = 'https://api.wormholescan.io/api/v1';

export interface Scorecard {
  '24h_messages': string;
  '7d_messages': string;
  '30d_messages': string;
  total_messages: string;
  total_tx_count: string;
  total_volume: string;
  tvl: string;
  '24h_volume': string;
  '7d_volume': string;
  '30d_volume': string;
}

export interface HourlyCount {
  time: string;
  count: number;
}

export interface RecentTransaction {
  id: string;
  timestamp: string;
  txHash: string;
  emitterChain: number;
  emitterNativeAddress: string;
  standardizedProperties: {
    appIds?: string[];
    toChain?: number;
    toAddress?: string;
    amount?: string;
    symbol?: string;
    tokenAddress?: string;
  };
}

export interface CrossChainFlow {
  chain: number;
  volume: string;
  percentage: number;
  destinations: {
    chain: number;
    volume: string;
    percentage: number;
  }[];
}

export async function fetchScorecards(): Promise<Scorecard> {
  const res = await axios.get(`${WORMHOLESCAN}/scorecards`);
  return res.data;
}

export async function fetchHourlyCounts(): Promise<HourlyCount[]> {
  const res = await axios.get(`${WORMHOLESCAN}/last-txs`);
  return res.data || [];
}

export async function fetchRecentTransactions(): Promise<RecentTransaction[]> {
  const res = await axios.get(`${WORMHOLESCAN}/transactions?page=0&pageSize=20`);
  return res.data?.transactions || [];
}

export async function fetchCrossChainFlows(): Promise<CrossChainFlow[]> {
  const res = await axios.get(`${WORMHOLESCAN}/x-chain-activity?timeSpan=1d&by=notional`);
  return res.data?.txs || [];
}
