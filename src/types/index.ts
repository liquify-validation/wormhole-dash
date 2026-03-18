export interface HeartbeatNetwork {
  id: number;
  height: string;
  contractAddress: string;
  errorCount: string;
  safeHeight: string;
  finalizedHeight: string;
  lastObservationSignedAt: string;
}

export interface Heartbeat {
  nodeName: string;
  counter: string;
  timestamp: string;
  networks: HeartbeatNetwork[];
  version: string;
  guardianAddr: string;
  bootTimestamp: string;
  features: string[];
  p2pNodeAddr?: string;
}

export interface GuardianEntry {
  verifiedHeartbeat: {
    heartbeat: Heartbeat;
  };
  p2pNodeAddr: string;
  rawHeartbeat: string;
}

export interface HeartbeatResponse {
  entries: GuardianEntry[];
}

export interface NetworkEndpoint {
  name: string;
  endpoint: string;
  type: 'guardian' | 'cloudfunction';
  env: 'mainnet' | 'testnet';
}

export const CHAIN_NAMES: Record<number, string> = {
  1: 'Solana',
  2: 'Ethereum',
  3: 'Terra Classic',
  4: 'BSC',
  5: 'Polygon',
  6: 'Avalanche',
  7: 'Oasis',
  8: 'Algorand',
  9: 'Aurora',
  10: 'Fantom',
  11: 'Karura',
  12: 'Acala',
  13: 'Klaytn',
  14: 'Celo',
  15: 'NEAR',
  16: 'Moonbeam',
  17: 'Neon',
  18: 'Terra',
  19: 'Injective',
  20: 'Osmosis',
  21: 'Sui',
  22: 'Aptos',
  23: 'Arbitrum',
  24: 'Optimism',
  25: 'Gnosis',
  26: 'Pythnet',
  28: 'XPLA',
  29: 'BTC',
  30: 'Base',
  32: 'Sei',
  33: 'Rootstock',
  34: 'Scroll',
  35: 'Mantle',
  36: 'Blast',
  37: 'X Layer',
  38: 'Linea',
  39: 'Berachain',
  40: 'Sei EVM',
  43: 'Snaxchain',
  44: 'Unichain',
  45: 'Worldchain',
  46: 'Ink',
  47: 'HyperEVM',
  48: 'Monad',
  50: 'Mezo',
  51: 'Fogo',
  52: 'Sonic',
  53: 'Converge',
  55: 'Plume',
  57: 'XRP Ledger EVM',
  58: 'Plasma',
  59: 'Creditcoin',
  60: 'Stacks',
  63: 'Moca',
  64: 'MegaETH',
  66: 'XRPL',
  67: 'Zero Gravity',
  3104: 'Wormchain',
  4000: 'Cosmos Hub',
  4001: 'Evmos',
  4002: 'Kujira',
  4003: 'Neutron',
  4004: 'Celestia',
  4005: 'Stargaze',
  4006: 'Seda',
  4007: 'Dymension',
  4008: 'Provenance',
  4009: 'Noble',
  10002: 'Sepolia',
  10003: 'Arbitrum Sepolia',
  10004: 'Base Sepolia',
  10005: 'Optimism Sepolia',
  10006: 'Holesky',
  10007: 'Polygon Sepolia',
  10009: 'Monad Testnet',
  65000: 'HyperCore',
};

export const CHAIN_COLORS: Record<number, string> = {
  1: '#9945FF',   // Solana
  2: '#627EEA',   // Ethereum
  4: '#F0B90B',   // BSC
  5: '#8247E5',   // Polygon
  6: '#E84142',   // Avalanche
  8: '#000000',   // Algorand
  10: '#1969FF',  // Fantom
  13: '#4F473B',  // Klaytn
  14: '#FCFF52',  // Celo
  15: '#000000',  // NEAR
  16: '#53CBC8',  // Moonbeam
  19: '#00F2FE',  // Injective
  20: '#5E12A0',  // Osmosis
  21: '#6FBCF0',  // Sui
  22: '#2DD8A3',  // Aptos
  23: '#28A0F0',  // Arbitrum
  24: '#FF0420',  // Optimism
  26: '#7142CF',  // Pythnet
  29: '#F7931A',  // BTC
  30: '#0052FF',  // Base
  32: '#9B1B30',  // Sei
  34: '#FFEEDA',  // Scroll
  35: '#000000',  // Mantle
  36: '#FCFC03',  // Blast
  38: '#61DFFF',  // Linea
  39: '#B5A26D',  // Berachain
  44: '#FF007A',  // Unichain
  45: '#000000',  // Worldchain
  46: '#7C3AED',  // Ink
  47: '#000000',  // HyperEVM
  48: '#836EF9',  // Monad
  50: '#F7931A',  // Mezo
  51: '#FF6B35',  // Fogo
  52: '#141414',  // Sonic
  55: '#1CFCB2',  // Plume
  57: '#000000',  // XRP EVM
  59: '#00D4AA',  // Creditcoin
  63: '#FF7B00',  // Moca
  64: '#FF0000',  // MegaETH
  67: '#00C2FF',  // Zero Gravity
  3104: '#7B61FF', // Wormchain
  4000: '#2E3148', // Cosmos Hub
  4003: '#000000', // Neutron
  4004: '#7B2BF9', // Celestia
  4009: '#000000', // Noble
};

export function getChainName(id: number): string {
  return CHAIN_NAMES[id] || `Chain ${id}`;
}

export function getChainColor(id: number): string {
  return CHAIN_COLORS[id] || '#6B7280';
}
