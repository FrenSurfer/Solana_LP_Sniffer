export type PriceChangeTimeframe = "m5" | "h1" | "h6" | "24h";

export type ExplorerType = "gmgn" | "birdeye" | "dexscreener";

export const EXPLORER_OPTIONS: { value: ExplorerType; label: string }[] = [
  { value: "gmgn", label: "GMGN" },
  { value: "birdeye", label: "Birdeye" },
  { value: "dexscreener", label: "DexScreener" },
];

const EXPLORER_BASE_URL: Record<ExplorerType, string> = {
  gmgn: "https://gmgn.ai/sol/token/",
  birdeye: "https://birdeye.so/solana/token/",
  dexscreener: "https://dexscreener.com/solana/",
};

export function getExplorerTokenUrl(
  explorer: ExplorerType,
  address: string
): string {
  return `${EXPLORER_BASE_URL[explorer]}${address}`;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  volume: number;
  liquidity: number;
  mc: number;
  price_change_m5: number;
  price_change_h1: number;
  price_change_h6: number;
  price_change_24h: number;
  v24hChangePercent: number;
  volume_liquidity_ratio: number;
  volume_mc_ratio: number;
  liquidity_mc_ratio: number;
  performance: number;
  is_pump: boolean;
}

export interface FilterState {
  minLiquidity: number;
  minVolume: number;
  mcapMin: number;
  mcapMax: number;
  filterSuspicious: boolean;
  filter24h: boolean;
  minVolumeChange: number;
  maxVolumeChange: number;
  minPriceChange: number;
  maxPriceChange: number;
}

export const defaultFilters: FilterState = {
  minLiquidity: 0,
  minVolume: 0,
  mcapMin: 0,
  mcapMax: 0,
  filterSuspicious: false,
  filter24h: true,
  minVolumeChange: 0,
  maxVolumeChange: 0,
  minPriceChange: 0,
  maxPriceChange: 0,
};

export interface ThresholdState {
  volumeChangeMin: number;
  volumeChangeMax: number;
  priceChangeMin: number;
  priceChangeMax: number;
  volLiqThreshold: number;
  volMcThreshold: number;
  liqMcThreshold: number;
}

export const defaultThresholds: ThresholdState = {
  volumeChangeMin: -50,
  volumeChangeMax: 200,
  priceChangeMin: -50,
  priceChangeMax: 200,
  volLiqThreshold: 5,
  volMcThreshold: 3,
  liqMcThreshold: 0.01,
};
