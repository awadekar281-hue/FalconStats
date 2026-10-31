# FalconStats

FalconStats market intelligence frontend and NestJS market data backend. The Next.js App Router reads only the same-origin `/api/falconstats/*` proxy, which forwards to the backend specified in server-only `FALCONSTATS_API_ORIGIN`. Live records are collected by server-side provider adapters and stored before the UI displays them. No provider API key is exposed to browser code and no demo financial data is substituted into production UI.

## Run locally

1. Configure and start the API and its PostgreSQL/Redis dependencies: follow [backend/README.md](backend/README.md).
2. From the repo root copy `.env.local.example` to `.env.local`; its default API origin is `http://localhost:3001`.
3. Run `npm install`, then `npm run dev`, then open `http://localhost:3000`.

The overview, markets, asset, admin provider-status and new backend analytics APIs consume internal FalconStats endpoints. The current backend adds exchange and DeFi APIs, but historical OHLCV, liquidation streaming, categories, news, account login, AI insights and deterministic technical signals remain unsupported and show explicit states.

See [backend/docs/api.md](backend/docs/api.md) for the internal REST contract and [backend/README.md](backend/README.md) for provider schedules and deployment configuration.
