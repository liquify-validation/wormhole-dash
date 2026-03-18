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

// Guardian RPC base URL for governor/guardian set APIs
const GUARDIAN_RPC = 'https://guardian.mainnet.xlabs.xyz';

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
      const res = await axios.get(`${GUARDIAN_RPC}/v1/guardianset/current`);
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
  const base = endpoint.type === 'guardian' ? endpoint.endpoint : GUARDIAN_RPC;
  const res = await axios.get(`${base}/v1/governor/available_notional_by_chain`);
  return res.data?.entries || [];
}

export async function fetchGovernorEnqueuedVAAs(endpoint: NetworkEndpoint): Promise<GovernorEnqueuedVAA[]> {
  const base = endpoint.type === 'guardian' ? endpoint.endpoint : GUARDIAN_RPC;
  const res = await axios.get(`${base}/v1/governor/enqueued_vaas`);
  return res.data?.entries || [];
}

export async function fetchGovernorTokens(endpoint: NetworkEndpoint): Promise<GovernorToken[]> {
  const base = endpoint.type === 'guardian' ? endpoint.endpoint : GUARDIAN_RPC;
  const res = await axios.get(`${base}/v1/governor/token_list`);
  return res.data?.entries || [];
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
