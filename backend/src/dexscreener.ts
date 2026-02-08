/**
 * DexScreener free API: enrich tokens with 24h price change (Birdeye free tier doesn't provide it).
 * GET /tokens/v1/solana/{addr1},{addr2},... (max 30 addresses per request, 300 req/min).
 */

const BASE = "https://api.dexscreener.com";
const BATCH_SIZE = 30;
const DELAY_MS = 250;

interface DexPair {
  chainId: string;
  baseToken: { address: string; symbol: string; name: string };
  quoteToken: { address: string; symbol: string; name: string };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  liquidity?: { usd?: number };
}

async function fetchPriceChangesBatch(addresses: string[]): Promise<DexPair[]> {
  const q = addresses.join(",");
  const url = `${BASE}/tokens/v1/solana/${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as DexPair[] | null;
  return Array.isArray(data) ? data : [];
}

/**
 * For each token address, pick the pair with highest liquidity where the token is base or quote,
 * and return its priceChange.h24 (percentage). Missing or failed tokens get null (caller can keep Birdeye value or 0).
 */
export async function getPriceChange24hByAddress(
  addresses: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    const pairs = await fetchPriceChangesBatch(batch);
    // Map: address -> best (liquidity) pair's h24
    const byToken = new Map<string, { h24: number; liq: number }>();
    for (const p of pairs) {
      const liq = p.liquidity?.usd ?? 0;
      const h24 = p.priceChange?.h24;
      if (h24 == null || !Number.isFinite(h24)) continue;
      const baseAddr = p.baseToken.address;
      const quoteAddr = p.quoteToken.address;
      for (const addr of [baseAddr, quoteAddr]) {
        const cur = byToken.get(addr);
        if (!cur || liq > cur.liq) byToken.set(addr, { h24, liq });
      }
    }
    for (const [addr, v] of byToken) result.set(addr, v.h24);
    if (i + BATCH_SIZE < addresses.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return result;
}
