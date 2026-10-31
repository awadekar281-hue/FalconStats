# FalconStats Backend

NestJS API and BullMQ ingestion worker. CoinGecko provides global reference market data, Binance provides Binance spot market data, Bybit provides Bybit linear derivatives market data, and DeFiLlama provides DeFi protocol/chain snapshots. Provider requests run only on the server. CoinMarketCap is disabled by migration 003; historical schema and records remain for audit/backward compatibility but current APIs do not read them.

## Local setup

Requirements: Node.js 22.12+, Docker Compose, PostgreSQL 17, and Redis 7.

```powershell
Copy-Item .env.example .env
# Set ADMIN_API_KEY to a random secret of at least 32 characters.
docker compose up -d
npm install
npm run migrate
npm run start:dev
```

The API is `http://localhost:3001`; OpenAPI/Swagger is `http://localhost:3001/api/docs`. Ingestion starts every 15 minutes and reads up to 500 CoinGecko assets, global metrics, exchange ticker snapshots, Bybit perpetual funding/open-interest ticker fields, and DeFiLlama at most once every six hours. To request a sync, send `POST /api/v1/providers/ingestion/market` with `X-Admin-Api-Key`.

Set `COINGECKO_DEMO_API_KEY` if a Demo key is available. It is sent as `x-cg-demo-api-key` by the backend only. The API permits an empty key for the public endpoint, but that has tighter/variable rate limits. CoinGecko requests stop at `COINGECKO_MONTHLY_CALL_BUDGET` (max 9,000 of the Demo plan's 10,000 monthly calls), and optional history calls stop 1,000 calls earlier to reserve capacity for scheduled market data. Rankings refresh every 15 minutes (two 250-item pages); global metrics refresh every 30 minutes, for about 7,200 scheduled calls per 30-day month. Failed or exhausted CoinGecko requests preserve prior stored snapshots; Binance and Bybit ingestion continue independently. Provider calls are never made on visitor page loads. Review CoinGecko attribution and usage terms before public redistribution. The Demo plan does not include commercial rights; a commercial product needs an eligible license.

## Data boundaries and supported records

- `global_metric_snapshots` and `market_snapshots` with source `coingecko` are global reference values.
- `exchange_quotes` retains exchange, market type, base, quote, price, provider timestamp, and receipt timestamp. USDT/USDC prices are not silently converted to USD.
- `derivatives_instruments`, `open_interest_snapshots`, and `funding_rate_snapshots` are Bybit-specific. OI unit is the base asset for linear contracts. The current poll reads ticker OI; it does not backfill historical exchange data.
- `defi_protocols` and `defi_chain_tvl` are DeFiLlama records.
- Exchange mappings are an explicit curated set of CoinGecko IDs and pair symbols. Unknown symbols are omitted instead of guessed by ticker.
- Liquidation API returns `UNSUPPORTED` until a durable WebSocket collector is deployed. It never claims to show market-wide totals.
- Cached historical price, market-cap and volume series are available on demand for 1–30 days; chart requests are shared through Redis, written to PostgreSQL, and stop 1,000 CoinGecko calls before the monthly safety cap. OHLC candles, deep historical backfill, categories, trending/search, news, user accounts, and AI/signal generation remain unavailable. Existing UI routes show explicit unsupported states.

## Internal APIs

Public GET: `/api/v1/market/global`, `/api/v1/market/listings`, `/api/v1/assets`, `/api/v1/assets/:uuid`, `/api/v1/providers/status`, `/api/v1/exchanges`, `/api/v1/exchanges/:id/markets`, `/api/v1/derivatives/overview`, `/api/v1/derivatives/open-interest`, `/api/v1/derivatives/funding`, `/api/v1/derivatives/liquidations`, `/api/v1/defi/protocols`, `/api/v1/defi/protocols/:slug`, `/api/v1/defi/chains`, `/api/v1/defi/tvl`, `/api/v1/health/live`, `/api/v1/health/ready`.

Protected: `GET /api/v1/providers/usage` and `POST /api/v1/providers/ingestion/market` require `X-Admin-Api-Key`. The browser admin token is checked by the Next.js same-origin proxy before it forwards the backend key.

## Deploying

Deploy the NestJS API/worker with persistent PostgreSQL and Redis on an always-on Node host (or a Vercel Services setup with a separate durable worker). Run migrations before starting app instances. Configure backend variables from `.env.example`, set `WEB_ORIGIN` to the website URL, and expose the API over HTTPS. In the Vercel frontend project, set server-only `FALCONSTATS_API_ORIGIN` to this backend origin, `FALCONSTATS_ADMIN_API_KEY` to the backend admin key, and `FALCONSTATS_ADMIN_UI_TOKEN` to a separate random 32+ character token, then redeploy the frontend. The current Vercel project has no backend origin configured, so the deployed page cannot retrieve database-backed API data until the backend is deployed and these variables are set.

## Verification

```powershell
npm run build
npm run migrate:status
npm test
npm run lint:types
```

Migration tests use PGlite. Provider parser tests use clearly labeled saved fixtures that are not imported by production services. Live upstream endpoint checks are separate from fixture-based tests.
