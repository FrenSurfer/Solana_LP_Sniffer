/**
 * DexScreener free API: price change by timeframe (m5, h1, h6, h24).
 * GET /tokens/v1/solana/{addr1},{addr2},... (max 30 addresses per request, 300 req/min).
 * API returns priceChange as numbers (percent); we validate and normalize to ensure we only use safe data.
 */

const BASE = "https://api.dexscreener.com";
const BATCH_SIZE = 30;
const DELAY_MS = 250;

/**
 * Raw pair from API. Verified: response contains priceChange with exactly these keys (percent):
 * - m5  = 5 min,  h1 = 1 hour,  h6 = 6 hours,  h24 = 24 hours
 * Example: "priceChange":{"m5":0.12,"h1":0.52,"h6":-2.5,"h24":-4.34}
 * Values are numbers; we also accept string and normalize.
 */
interface DexPairRaw {
  chainId?: string;
  baseToken?: { address?: string; symbol?: string; name?: string };
  quoteToken?: { address?: string; symbol?: string; name?: string };
  priceChange?: {
    m5?: number | string;
    h1?: number | string;
    h6?: number | string;
    h24?: number | string;
  };
  liquidity?: { usd?: number };
}

function toFiniteNumber(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Extract validated price change (only finite numbers). */
function normalizePriceChange(
  raw: DexPairRaw["priceChange"]
): PriceChangeByTimeframe | null {
  if (!raw || typeof raw !== "object") return null;
  const m5 = toFiniteNumber(raw.m5);
  const h1 = toFiniteNumber(raw.h1);
  const h6 = toFiniteNumber(raw.h6);
  const h24 = toFiniteNumber(raw.h24);
  if (
    m5 === undefined &&
    h1 === undefined &&
    h6 === undefined &&
    h24 === undefined
  )
    return null;
  return { m5, h1, h6, h24 };
}

function getLiquidityUsd(p: DexPairRaw): number {
  const v = p.liquidity?.usd;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

async function fetchPriceChangesBatch(
  addresses: string[]
): Promise<DexPairRaw[]> {
  const q = addresses.join(",");
  const url = `${BASE}/tokens/v1/solana/${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data as DexPairRaw[];
}

export type PriceChangeTimeframe = "m5" | "h1" | "h6" | "h24";

export interface PriceChangeByTimeframe {
  m5?: number;
  h1?: number;
  h6?: number;
  h24?: number;
}

export interface DexEnrichment {
  priceChange: Map<string, PriceChangeByTimeframe>;
  /** Liquidity per token: sum of liquidity.usd across all pairs containing that token. */
  liquidity: Map<string, number>;
}

/**
 * For each token address: validated price change (from the pair with highest liquidity) and total liquidity (sum of all pools).
 * Only finite numbers are returned; API strings are parsed and invalid data is discarded.
 */
export async function getPriceChangeAndLiquidityByAddress(
  addresses: string[]
): Promise<DexEnrichment> {
  const priceChange = new Map<string, PriceChangeByTimeframe>();
  const liquiditySum = new Map<string, number>();

  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    const pairs = await fetchPriceChangesBatch(batch);
    const bestPairByToken = new Map<
      string,
      { pc: PriceChangeByTimeframe; liq: number }
    >();
    for (const p of pairs) {
      const liq = getLiquidityUsd(p);
      const baseAddr =
        typeof p.baseToken?.address === "string" ? p.baseToken.address : "";
      const quoteAddr =
        typeof p.quoteToken?.address === "string" ? p.quoteToken.address : "";
      for (const addr of [baseAddr, quoteAddr]) {
        if (!addr) continue;
        liquiditySum.set(addr, (liquiditySum.get(addr) ?? 0) + liq);
      }
      const pc = normalizePriceChange(p.priceChange);
      if (!pc) continue;
      for (const addr of [baseAddr, quoteAddr]) {
        if (!addr) continue;
        const cur = bestPairByToken.get(addr);
        if (!cur || liq > cur.liq) bestPairByToken.set(addr, { pc, liq });
      }
    }
    for (const [addr, v] of bestPairByToken) priceChange.set(addr, v.pc);
    if (i + BATCH_SIZE < addresses.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return { priceChange, liquidity: liquiditySum };
}

/**
 * @deprecated Use getPriceChangeAndLiquidityByAddress for liquidity too.
 */
export async function getPriceChangeByAddress(
  addresses: string[]
): Promise<Map<string, PriceChangeByTimeframe>> {
  const { priceChange } = await getPriceChangeAndLiquidityByAddress(addresses);
  return priceChange;
}
