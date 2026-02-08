export interface BirdeyeToken {
  address: string;
  symbol: string;
  name: string;
  v24hUSD?: number;
  liquidity?: number;
  mc?: number;
  priceChange24h?: number;
  v24hChangePercent?: number;
}

export interface ProcessedToken {
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

export interface BirdeyeTokenListResponse {
  success: boolean;
  data?: { tokens: BirdeyeToken[] };
  error?: string;
}
