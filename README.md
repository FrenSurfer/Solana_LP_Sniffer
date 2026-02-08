# Solana Token Sniffer

A web tool to browse and filter **Solana tokens** using the [Birdeye](https://birdeye.so) API. Data is displayed in a table with quick links to [GMGN](https://gmgn.ai) and [Bubblemaps](https://app.bubblemaps.io).

## Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Fastify, TypeScript

## Features

- Fetches top Solana tokens (volume, liquidity, market cap) from Birdeye
- 30-minute JSON cache on the API to limit requests
- **Filters**: liquidity, volume, market cap, volume/price change, “hide suspicious”, “tokens > 24h”, detection thresholds
- **Search** by symbol or name
- **Sort** by any column (symbol, name, liquidity, volume, etc.); click again to toggle ascending/descending
- **Compare** selected tokens in a modal
- **Links**: click symbol/name → GMGN; copy-address button; Bubblemaps column

## Setup

### 1. API key

Create a `.env` file in the `backend/` folder:

```env
API_KEY=your_birdeye_api_key
PORT=3001
```

Get a key from [Birdeye](https://birdeye.so) (public API).

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

The API runs at **http://localhost:3001**.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

To point the frontend at another API (e.g. in production), set:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

in `frontend/.env.local`.

## Project structure

| Path            | Description                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `backend/`      | Fastify API: Birdeye client, cache, routes `/api/tokens`, `/api/refresh-cache`, `/api/compare` |
| `frontend/`     | Next.js 16 app: main page, filters, token table, comparison modal                              |
| `backend/data/` | Token cache (created automatically)                                                            |

## Scripts

- **Backend**: `npm run dev` (watch), `npm run build` then `npm start`
- **Frontend**: `npm run dev`, `npm run build`, `npm start`

## Notes

- **Refresh data**: use the “Refresh data” button to bypass the cache and refetch from the API.
- **Suspicious thresholds**: open “Detection thresholds” in the filters to tune which volume/price changes and ratios are highlighted in yellow.
- **Compare**: select at least 2 tokens with the checkboxes, then click “Compare selected tokens”.
