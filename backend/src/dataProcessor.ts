import type { BirdeyeToken, ProcessedToken } from "./types.js";

function safeDivision(a: number, b: number, def = 0): number {
  if (b === 0 || !Number.isFinite(b)) return def;
  const result = a / b;
  return Number.isFinite(result) ? result : def;
}

export function processTokenList(tokens: BirdeyeToken[]): ProcessedToken[] {
  return tokens.map((token) => {
    const volume = Number(token.v24hUSD) || 0;
    const liquidity = Number(token.liquidity) || 0;
    const mc = Number(token.mc) || 0;
    const priceChange24h = Number(token.priceChange24h) || 0;
    const v24hChangePercent = Number(token.v24hChangePercent) || 0;

    const volume_liquidity_ratio = safeDivision(volume, liquidity);
    const volume_mc_ratio = safeDivision(volume, mc);
    const liquidity_mc_ratio = safeDivision(liquidity, mc);
    const performance =
      volume_liquidity_ratio * 0.4 +
      volume_mc_ratio * 0.4 +
      liquidity_mc_ratio * 0.2;

    return {
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      volume,
      liquidity,
      mc,
      price_change_24h: priceChange24h,
      v24hChangePercent,
      volume_liquidity_ratio,
      volume_mc_ratio,
      liquidity_mc_ratio,
      performance,
      is_pump: token.address.toLowerCase().endsWith("pump"),
    };
  });
}
