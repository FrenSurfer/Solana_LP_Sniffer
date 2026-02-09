# Solana Token Sniffer

A web tool **(local only for now)** to browse and filter **Solana tokens**. Data comes from **Birdeye** (token list, volume, market cap) and **DexScreener** (price change, liquidity). Table links open the chosen explorer (GMGN, Birdeye, or DexScreener) and Bubblemaps.

## Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Fastify, TypeScript

## Data sources

- **Birdeye** (API key required): token list, volume 24h, market cap, volume change %. Cached 30 min.
- **DexScreener** (free API): price change (5m, 1h, 6h, 24h) and **liquidity** (sum of all pools per token). Used to enrich the list and override liquidity.

## Features

- **Table**: symbol, name, liquidity ($), volume 24h ($), MCap, price change (select 5m / 1h / 6h / 24h), volume change %, Vol/Liq, Vol/MC, Liq/MC (4 decimals), Pump, Bubblemaps.
- **Explorer**: dropdown (GMGN, Birdeye, DexScreener). Click on symbol or name opens that explorer for the token.
- **Search** by symbol, name, or **token address** (full or partial).
- **Filters**: min liquidity/volume/MCap, volume & price change %, “hide suspicious”, “24h only”. Presets include 10K, 20K, 30K, 40K and above.
- **Detection thresholds**: panel to set thresholds for “suspicious” highlighting (volume/price change %, Vol/Liq, Vol/MC, Liq/MC). Categories use full width.
- **Sort** by any column; click again to toggle asc/desc.
- **Compare**: select 2+ tokens, then “Compare selected tokens” to open the comparison modal.

## Setup

### 1. API key

In `backend/` create a `.env` file:

```env
API_KEY=your_birdeye_api_key
PORT=3001
```

Get an API key from [Birdeye](https://birdeye.so). DexScreener is used without a key.

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

API: **http://localhost:3001**.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

To use another API URL (e.g. production):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

in `frontend/.env.local`.

## Project structure

| Path            | Description                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `backend/`      | Fastify API: Birdeye client + cache, DexScreener enrichment, routes `/api/tokens`, `/api/refresh-cache`, `/api/compare` |
| `frontend/`     | Next.js app: filters, token table, explorer selector, comparison modal                                                  |
| `backend/data/` | Token cache (auto-created)                                                                                              |

## Scripts

- **Backend**: `npm run dev` (watch), `npm run build` then `npm start`
- **Frontend**: `npm run dev`, `npm run build`, `npm start`

## Notes

- **Refresh**: “Refresh data” bypasses cache and refetches from Birdeye + DexScreener.
- **Liquidity** is from DexScreener (sum of all pools); volume and MC from Birdeye.
- **Ratios**: Vol/Liq = volume 24h ($) / liquidity ($); Vol/MC and Liq/MC same idea. Displayed with 4 decimals.
- **Token security** (mint/freeze authority, top holders): Birdeye’s `token_security` endpoint exists but is not included in the free API plan, so it is not used in this app.
