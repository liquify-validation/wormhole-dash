import { useState } from 'react';
import { getChainName, getChainColor } from '../types';

// Map chain IDs to logo filenames on the Wormhole/crypto logo CDNs
const CHAIN_LOGO_URLS: Record<number, string> = {
  1: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  2: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  3: 'https://assets.coingecko.com/coins/images/8284/small/01_LussLkad-removebg-preview.png',
  4: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  5: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  6: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  7: 'https://assets.coingecko.com/coins/images/13162/small/rose.png',
  8: 'https://assets.coingecko.com/coins/images/4380/small/download.png',
  9: 'https://assets.coingecko.com/coins/images/20582/small/aurora.jpeg',
  10: 'https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png',
  13: 'https://assets.coingecko.com/coins/images/9672/small/klaytn.png',
  14: 'https://assets.coingecko.com/coins/images/11090/small/InjsxfhB_400x400.jpg',
  15: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg',
  16: 'https://assets.coingecko.com/coins/images/22459/small/glmr.png',
  18: 'https://assets.coingecko.com/coins/images/21043/small/LUNA.png',
  19: 'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png',
  20: 'https://assets.coingecko.com/coins/images/16724/small/osmo.png',
  21: 'https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png',
  22: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
  23: 'https://assets.coingecko.com/coins/images/16547/small/arb.jpg',
  24: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  25: 'https://assets.coingecko.com/coins/images/662/small/logo_square_simple_300px.png',
  29: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  30: 'https://assets.coingecko.com/coins/images/31164/small/base.png',
  32: 'https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png',
  33: 'https://assets.coingecko.com/coins/images/5070/small/Rootstock-logo.png',
  34: 'https://assets.coingecko.com/coins/images/32386/small/scroll.png',
  35: 'https://assets.coingecko.com/coins/images/30980/small/token-logo.png',
  36: 'https://assets.coingecko.com/coins/images/35176/small/blast.jpeg',
  38: 'https://assets.coingecko.com/coins/images/35600/small/linea.jpg',
  39: 'https://assets.coingecko.com/coins/images/35899/small/bera.png',
};

interface Props {
  chainId: number;
  size?: number;
  className?: string;
}

export default function ChainLogo({ chainId, size = 20, className = '' }: Props) {
  const [errored, setErrored] = useState(false);
  const url = CHAIN_LOGO_URLS[chainId];
  const name = getChainName(chainId);
  const color = getChainColor(chainId);

  if (!url || errored) {
    // Fallback: colored circle with first letter
    return (
      <div
        className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          fontSize: size * 0.45,
        }}
        title={name}
      >
        {name.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      title={name}
      width={size}
      height={size}
      className={`rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  );
}
