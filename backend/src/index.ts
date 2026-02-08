import Fastify from "fastify";
import cors from "@fastify/cors";
import { BirdeyeAPIClient } from "./birdeye.js";
import { processTokenList } from "./dataProcessor.js";
import type { ProcessedToken } from "./types.js";

const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY must be set in environment");
}

const client = new BirdeyeAPIClient(apiKey);
let tokenData: ProcessedToken[] = [];

async function fetchTokenData(forceRefresh = false): Promise<void> {
  const tokens = await client.getAllTokens(500, !forceRefresh);
  if (!tokens.length) {
    console.error("No tokens from API");
    return;
  }
  tokenData = processTokenList(tokens);
  console.info(`Processed ${tokenData.length} tokens`);
}

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

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

app.post<{ Body: { addresses: string[] } }>(
  "/api/compare",
  async (request, reply) => {
    const { addresses } = request.body;
    const compared = tokenData.filter((t) => addresses.includes(t.address));
    return reply.send(compared);
  }
);

const PORT = Number(process.env.PORT) || 3001;

async function start() {
  await fetchTokenData();
  setInterval(() => fetchTokenData(), 30 * 60 * 1000); // 30 min
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.info(`API running at http://localhost:${PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
