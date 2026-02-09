import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { BirdeyeToken, BirdeyeTokenListResponse } from "./types.js";

const BASE_URL = "https://public-api.birdeye.so";
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 min
const RATE_LIMIT = 1000;
const BATCH_SIZE = 50; // 20 requests for 1000 tokens
const DELAY_BETWEEN_BATCHES_MS = 1200; // ~1 req/s to stay under Birdeye rate limit (429)

async function retryRequest<T>(
  fn: () => Promise<T>,
  retries = 4
): Promise<T | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await fn();
      // If result is a Response and 429, treat as retryable
      if (
        result &&
        typeof result === "object" &&
        "status" in result &&
        (result as Response).status === 429
      ) {
        const res = result as Response;
        const wait =
          Number(res.headers.get("retry-after")) || 2 * Math.pow(2, attempt);
        console.warn(
          `Rate limit (429), retrying in ${wait}s (attempt ${
            attempt + 1
          }/${retries})...`
        );
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      return result as T;
    } catch (e) {
      const wait = 0.3 * Math.pow(2, attempt);
      console.warn(
        `Request failed (attempt ${attempt + 1}), retrying in ${wait}s...`,
        e
      );
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
  }
  return null;
}

export class BirdeyeAPIClient {
  private apiKey: string;
  private cacheDir: string;
  private requestCount = 0;
  private lastReset = Date.now() / 1000;

  constructor(apiKey: string, cacheDir = "data") {
    this.apiKey = apiKey;
    this.cacheDir = cacheDir;
  }

  private async ensureCacheDir(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }
  }

  private checkRateLimit(): void {
    const now = Date.now() / 1000;
    if (now - this.lastReset >= 60) {
      this.requestCount = 0;
      this.lastReset = now;
    }
    if (this.requestCount >= RATE_LIMIT) {
      const waitTime = 60 - (now - this.lastReset);
      if (waitTime > 0) {
        console.warn(`Rate limit reached, waiting ${waitTime.toFixed(2)}s`);
        return; // caller can await delay if needed
      }
      this.requestCount = 0;
      this.lastReset = Date.now() / 1000;
    }
  }

  async getTokenList(
    offset = 0,
    limit = 50
  ): Promise<BirdeyeTokenListResponse> {
    this.checkRateLimit();
    this.requestCount += 1;

    const url = `${BASE_URL}/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=${offset}&limit=${limit}`;
    const res = await retryRequest(() =>
      fetch(url, {
        headers: { accept: "application/json", "X-API-KEY": this.apiKey },
        signal: AbortSignal.timeout(10000),
      })
    );

    if (!res || !res.ok) {
      const error =
        res?.status === 429
          ? "Rate limit (429)"
          : res?.status
          ? `HTTP ${res.status}`
          : "Failed after retries";
      console.warn(`Birdeye request failed: ${error}`);
      return { success: false, error };
    }
    return (await res.json()) as BirdeyeTokenListResponse;
  }

  private getCachePath(): string {
    return join(this.cacheDir, "token_cache.json");
  }

  async loadFromCache(): Promise<BirdeyeToken[] | null> {
    await this.ensureCacheDir();
    const path = this.getCachePath();
    if (!existsSync(path)) return null;
    try {
      const raw = await readFile(path, "utf-8");
      if (!raw || !raw.trim()) {
        console.warn("Cache file empty, skipping");
        return null;
      }
      const data = JSON.parse(raw) as {
        tokens?: BirdeyeToken[];
        cache_timestamp?: string;
      };
      if (!Array.isArray(data.tokens) || data.tokens.length === 0) {
        console.warn("Cache invalid (no tokens array), skipping");
        return null;
      }
      const ts = data.cache_timestamp
        ? new Date(data.cache_timestamp).getTime()
        : 0;
      if (Date.now() - ts > CACHE_DURATION_MS) {
        console.info("Cache expired");
        return null;
      }
      console.info(`Data loaded from cache (${data.tokens.length} tokens)`);
      return data.tokens;
    } catch (e) {
      console.error("Error loading cache:", e);
      return null;
    }
  }

  async saveToCache(tokens: BirdeyeToken[]): Promise<void> {
    await this.ensureCacheDir();
    const path = this.getCachePath();
    try {
      await writeFile(
        path,
        JSON.stringify({ tokens, cache_timestamp: new Date().toISOString() }),
        "utf-8"
      );
      console.info(`Cache saved (${tokens.length} tokens)`);
    } catch (e) {
      console.error("Error saving cache:", e);
    }
  }

  async getAllTokens(
    totalDesired = 1000,
    useCache = true
  ): Promise<BirdeyeToken[]> {
    if (useCache) {
      const cached = await this.loadFromCache();
      if (cached?.length) return cached;
    }

    const allTokens: BirdeyeToken[] = [];
    const start = Date.now();

    for (let offset = 0; offset < totalDesired; offset += BATCH_SIZE) {
      console.info(`Fetching tokens ${offset} to ${offset + BATCH_SIZE}...`);
      const response = await this.getTokenList(offset, BATCH_SIZE);

      if (!response.success) {
        if (allTokens.length === 0)
          console.error("Birdeye API error:", response.error);
        break;
      }
      if (!response.data?.tokens?.length) break;

      allTokens.push(...response.data.tokens);
      if (allTokens.length >= totalDesired) {
        allTokens.length = totalDesired;
        break;
      }
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }

    const duration = (Date.now() - start) / 1000;
    console.info(
      `Fetch: ${allTokens.length} tokens in ${duration.toFixed(2)}s`
    );

    if (allTokens.length) await this.saveToCache(allTokens);
    return allTokens;
  }
}
