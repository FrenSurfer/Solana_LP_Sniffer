export interface Token {
  address: string;
  symbol: string;
  name: string;
  volume: number;
  liquidity: number;
  mc: number;
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
  minWallets24h: number;
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
  minWallets24h: 0,
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
  wallets24hThreshold: number;
}

export const defaultThresholds: ThresholdState = {
  volumeChangeMin: -50,
  volumeChangeMax: 100,
  priceChangeMin: -50,
  priceChangeMax: 100,
  volLiqThreshold: 5,
  volMcThreshold: 3,
  liqMcThreshold: 0.05,
  wallets24hThreshold: 100,
};
