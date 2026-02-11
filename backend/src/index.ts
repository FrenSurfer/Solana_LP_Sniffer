import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { BirdeyeAPIClient } from "./birdeye.js";
import { getPriceChangeByAddress } from "./dexscreener.js";
import { processTokenList } from "./dataProcessor.js";
import type { ProcessedToken } from "./types.js";

const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY must be set in environment");
}

const client = new BirdeyeAPIClient(apiKey);
let tokenData: ProcessedToken[] = [];

async function fetchTokenData(forceRefresh = false): Promise<void> {
  const tokens = await client.getAllTokens(1000, !forceRefresh);
  if (!tokens.length) {
    console.error("No tokens from API");
    return;
  }
  tokenData = processTokenList(tokens);

  // Deduplicate by address (Birdeye can return same token across pages)
  const seen = new Set<string>();
  tokenData = tokenData.filter((t) => {
    if (seen.has(t.address)) return false;
    seen.add(t.address);
    return true;
  });

  // Enrich with price change (m5, h1, h6, h24) from DexScreener only. Volume & liquidity stay from Birdeye for consistency.
  try {
    const addresses = tokenData.map((t) => t.address);
    const priceChangeMap = await getPriceChangeByAddress(addresses);
    let enrichedPc = 0;
    for (const t of tokenData) {
      const pc = priceChangeMap.get(t.address);
      if (pc) {
        if (pc.m5 != null && Number.isFinite(pc.m5)) t.price_change_m5 = pc.m5;
        if (pc.h1 != null && Number.isFinite(pc.h1)) t.price_change_h1 = pc.h1;
        if (pc.h6 != null && Number.isFinite(pc.h6)) t.price_change_h6 = pc.h6;
        if (pc.h24 != null && Number.isFinite(pc.h24))
          t.price_change_24h = pc.h24;
        enrichedPc++;
      }
    }
    console.info(
      `DexScreener: enriched ${enrichedPc}/${tokenData.length} with price change (m5/h1/h6/24h)`
    );
  } catch (e) {
    console.warn("DexScreener enrichment failed (price change may be 0):", e);
  }

  console.info(`Processed ${tokenData.length} tokens (ready to serve)`);
}

const corsOrigin = process.env.CORS_ORIGIN;
const app = Fastify({ logger: true });

await app.register(cors, {
  origin: corsOrigin ? corsOrigin.split(",").map((o) => o.trim()) : true,
});

// Rate limit: per IP, max N requests per window (prevents abuse / overload)
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 30;
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000; // 1 min
await app.register(rateLimit, {
  max: rateLimitMax,
  timeWindow: rateLimitWindowMs,
  keyGenerator: (request) => {
    const forwarded = request.headers["x-forwarded-for"];
    const ip =
      typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : request.ip;
    return ip ?? "unknown";
  },
});

app.get("/api/tokens", async (_request, reply) => {
  if (!tokenData.length) {
    await fetchTokenData();
  }
  return reply.send({ tokens: tokenData });
});

app.post("/api/refresh-cache", async (_request, reply) => {
  try {
    await fetchTokenData(true);
    return reply.send({
      success: true,
      message: "Cache refreshed successfully",
    });
  } catch (e) {
    app.log.error(e);
    return reply.status(500).send({ success: false, error: String(e) });
  }
});

app.post<{ Body: { addresses?: string[] } }>(
  "/api/compare",
  async (request, reply) => {
    const { addresses } = request.body ?? {};
    if (
      !Array.isArray(addresses) ||
      addresses.length < 2 ||
      addresses.length > 20
    ) {
      return reply.status(400).send({
        error: "Body must contain 'addresses' (array, 2–20 items)",
      });
    }
    const compared = tokenData.filter((t) => addresses.includes(t.address));
    return reply.send(compared);
  }
);

const PORT = Number(process.env.PORT) || 3001;

async function start() {
  await fetchTokenData();
  setInterval(() => fetchTokenData(), 30 * 60 * 1000); // 30 min
  await app.listen({ port: PORT, host: "0.0.0.0" });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
