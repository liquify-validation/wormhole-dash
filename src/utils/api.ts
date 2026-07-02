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

/**
 * Whether a fully-signed VAA exists for a message — i.e. a quorum of guardians
 * (13 of 19) has signed it. This is exactly how the official dashboard fills its
 * governor "Has Quorum?" column: it asks the guardian RPC for the signed VAA and
 * treats its presence as quorum. An enqueued VAA that isn't signed yet returns
 * not-found, which means "no quorum yet".
 */
export async function fetchSignedVAAExists(
  endpoint: NetworkEndpoint,
  emitterChain: number,
  emitterAddress: string,
  sequence: string,
): Promise<boolean> {
  const emitter = (emitterAddress || '').toLowerCase().replace(/^0x/, '');
  for (const base of guardianRpcBases(endpoint)) {
    try {
      const res = await axios.get(`${base}/v1/signed_vaa/${emitterChain}/${emitter}/${sequence}`);
      return !!res.data?.vaaBytes;
    } catch (err) {
      // A server response (e.g. 404 not-found) is a definitive "no quorum yet".
      // Only fall through to the next base if the host was unreachable.
      if (axios.isAxiosError(err) && err.response) return false;
    }
  }
  return false;
}

// ── Delegated guardians ───────────────────────────────────────────────────
// Many chains are watched by a designated subset of guardians ("delegate
// guardians") with their own quorum, rather than the full canonical set. That
// mapping lives in an Ethereum-mainnet contract; the official dashboard reads it
// directly. We do the same with a plain eth_call (no wallet/lib needed).
const ETH_RPC = 'https://ethereum-rpc.publicnode.com';
export const DELEGATED_GUARDIAN_CONTRACT = '0x1462800febd49232798132e8c8b721aa86c4c209';
const GET_CONFIG_SELECTOR = '0xc3f909d4'; // getConfig()

export interface DelegatedGuardianConfig {
  chainId: number;
  threshold: number;
  /** guardian addresses, lowercased, no 0x prefix */
  keys: string[];
}
export type DelegatedGuardianConfigMap = Record<number, DelegatedGuardianConfig>;

/** Decode the ABI response of getConfig(): tuple(uint16,uint32,uint8,address[])[]. */
function decodeDelegatedConfig(hex: string): DelegatedGuardianConfigMap {
  const map: DelegatedGuardianConfigMap = {};
  if (!hex || hex.length < 64) return map;
  const word = (i: number) => hex.slice(i * 64, i * 64 + 64);
  const int = (i: number) => parseInt(word(i), 16);

  const base = Math.floor(int(0) / 32); // word index of the array length
  const n = int(base);
  for (let k = 0; k < n; k++) {
    const t = base + 1 + Math.floor(parseInt(word(base + 1 + k), 16) / 32); // tuple start
    const chainId = int(t);
    const threshold = int(t + 2);
    const kbase = t + Math.floor(parseInt(word(t + 3), 16) / 32); // keys array start
    const m = int(kbase);
    const keys: string[] = [];
    for (let j = 0; j < m; j++) {
      keys.push(word(kbase + 1 + j).slice(24).toLowerCase()); // last 20 bytes = address
    }
    map[chainId] = { chainId, threshold, keys };
  }
  return map;
}

export async function fetchDelegatedGuardianConfig(
  env: 'mainnet' | 'testnet',
): Promise<DelegatedGuardianConfigMap> {
  if (env !== 'mainnet') return {}; // contract is mainnet-only
  const res = await axios.post(ETH_RPC, {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_call',
    params: [{ to: DELEGATED_GUARDIAN_CONTRACT, data: GET_CONFIG_SELECTOR }, 'latest'],
  });
  return decodeDelegatedConfig((res.data?.result || '0x').slice(2));
}

// ── Cross-guardian enqueued signers ───────────────────────────────────────
// The env cloud function aggregates every guardian's governor status, so we can
// see which guardians have each VAA enqueued (i.e. observed & signed it). Used to
// show which delegate guardians haven't signed an enqueued VAA yet.
function cloudFunctionBase(env: 'mainnet' | 'testnet'): string {
  return env === 'testnet'
    ? 'https://europe-west3-wormhole-message-db-testnet.cloudfunctions.net'
    : 'https://europe-west3-wormhole-message-db-mainnet.cloudfunctions.net';
}

/** Stable key joining a VAA across data sources (emitter zero-padding normalized away). */
export function vaaKey(chainId: number, emitterAddress: string, sequence: string | number): string {
  const emitter = (emitterAddress || '').toLowerCase().replace(/^0x/, '').replace(/^0+/, '');
  return `${chainId}:${emitter}:${sequence}`;
}

/** `${chainId}:${normEmitter}:${sequence}` -> guardian addresses (lowercased, no 0x) holding it enqueued. */
export async function fetchGovernorSigners(
  env: 'mainnet' | 'testnet',
): Promise<Record<string, string[]>> {
  const res = await axios.get(`${cloudFunctionBase(env)}/governor-status`);
  const guardians = res.data?.governorStatus || res.data?.entries || [];
  const byVaa: Record<string, string[]> = {};

  for (const g of guardians) {
    const addr = (g?.guardianAddress || '').toLowerCase().replace(/^0x/, '');
    if (!addr) continue;
    for (const chain of g?.chains || []) {
      if (chain?.chainId === undefined) continue;
      for (const emitter of chain.emitters || []) {
        for (const vaa of emitter?.enqueuedVaas || []) {
          if (vaa?.sequence === undefined) continue;
          const key = vaaKey(chain.chainId, emitter.emitterAddress || '', String(vaa.sequence));
          if (!byVaa[key]) byVaa[key] = [];
          if (!byVaa[key].includes(addr)) byVaa[key].push(addr);
        }
      }
    }
  }
  return byVaa;
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
