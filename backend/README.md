# FalconStats backend

NestJS market-data API and ingestion workers. The UI remains untouched by this backend change; API data is sourced from CoinMarketCap and persisted in PostgreSQL. No test fixture is loaded by an application service.

## Requirements

- Node.js 22.12 or newer
- Docker Compose (or compatible PostgreSQL 17 and Redis 7 services)
- CoinMarketCap API key for authenticated plan/quota verification. Without one, the backend uses the documented CMC keyless public API for supported endpoints.

## Local setup

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d
npm run migrate
npm run start:dev
```

The API listens on `http://localhost:3001`; Swagger/OpenAPI is served at `http://localhost:3001/api/docs`. Market ingestion is queued on the configured interval and can also be triggered with `POST /api/v1/providers/cmc/ingestion/market` using `X-Admin-Api-Key`.

Set `CMC_PRO_API_KEY` only in the server environment. With a key configured, requests use `https://pro-api.coinmarketcap.com` and send the key in the `X-CMC_PRO_API_KEY` header. With no key, requests use the documented `/public-api` prefix. The keyless endpoint supports evaluation and integration checks; it does not prove a user's paid subscription or endpoint entitlements.

## Quality commands

```powershell
npm run build
npm run migrate:status
npm test
npm run lint:types
```

Migration tests use PGlite (PostgreSQL compiled to WebAssembly) and apply the checked-in SQL migrations. API parsing tests use the fixed files in `test/fixtures/`; those values are illustrative test data, not current market information.
