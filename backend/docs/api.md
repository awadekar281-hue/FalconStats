# FalconStats backend API

## Runtime and data flow

The NestJS API serves stored data only. A BullMQ worker calls CoinMarketCap from the server, normalizes the provider response, maps each asset by stable CMC ID, stores market snapshots and global metrics in PostgreSQL, then invalidates the Redis read cache. The web browser never receives the provider key and does not call CMC.

Production requests use the keyed CMC root and `X-CMC_PRO_API_KEY`. Keyless mode uses the official `/public-api` path and is limited to endpoints listed for the keyless API. No provider fixtures are loaded into production tables.

## Response envelope

Successful API reads use:

```json
{
  "data": {},
  "meta": {
    "requestId": "...",
    "generatedAt": "...",
    "source": "coinmarketcap",
    "asOf": "...",
    "freshness": "fresh"
  }
}
```

`freshness` is `fresh`, `stale`, or `unavailable`. Decimal database fields are returned as PostgreSQL numeric strings to preserve precision. Missing provider fields remain null; they are not changed to zero. Errors use `{ "error": { "code", "message" }, "meta": { "requestId", "timestamp", "path" } }`.

## REST endpoints

All endpoints use the `/api/v1` prefix. Swagger/OpenAPI is at `/api/docs`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health/live` | Public | Process liveness |
| GET | `/health/ready` | Public | PostgreSQL and Redis readiness |
| GET | `/assets?limit=50&offset=0&search=btc` | Public | Canonical assets and latest stored quotes |
| GET | `/assets/{assetId}` | Public | One asset by FalconStats UUID |
| GET | `/market/listings?limit=50&offset=0&search=btc` | Public | Paginated stored rankings and snapshots |
| GET | `/market/global?convert=USD` | Public | Latest global market capitalization, volume, BTC/ETH dominance and counts |
| GET | `/providers/cmc/status` | Public | Access mode and recent provider health/usage summary |
| POST | `/providers/cmc/ingestion/market` | Admin key | Enqueue an immediate market sync |
| GET | `/providers/cmc/quota` | Admin key | Request count, credit count, errors, latest key-usage snapshot |
| POST | `/providers/cmc/key-info` | Admin key | Call CMC `/v1/key/info` and persist plan/usage quotas |

Admin routes require `X-Admin-Api-Key`, configured with a random secret of at least 32 bytes. Do not place this key in browser code.

## CoinMarketCap endpoint mapping

- Listings + spot quotes: `GET /v3/cryptocurrency/listings/latest?start=1&limit={CMC_LISTINGS_LIMIT}&convert={CMC_CONVERT}`.
- Global aggregates: `GET /v1/global-metrics/quotes/latest?convert={CMC_CONVERT}`.
- Plan and quota snapshot (keyed mode only): `GET /v1/key/info`.

The provider adapter checks both HTTP status and CMC's `status.error_code`, whose type may vary between endpoint versions. It records endpoint, HTTP status, request duration, CMC error, credit count, supported rate-limit headers, and whether it used keyed/keyless mode. The Key Info route is opt-in/manual because it contributes to minute-based request limits, although CMC documents it as no-credit-cost.

## Schema and migrations

SQL migrations are in `sql/migrations` and are applied in lexical order. The migration runner creates `schema_migrations`, then wraps each file and ledger insert in a transaction. Tables:

- `providers`: configured upstream providers.
- `assets`: canonical asset rows keyed by unique CMC ID.
- `asset_identifiers`: provider-scoped CMC IDs, slugs and chain/contract mappings.
- `market_snapshots`: immutable, time-stamped quote and supply snapshots using PostgreSQL `numeric` columns.
- `global_metric_snapshots`: immutable global market aggregates.
- `provider_request_events`: request, latency, status, error, credit, limit header and access-mode telemetry.
- `provider_usage_snapshots`: latest `/v1/key/info` plan and usage payload.
- `schema_migrations`: applied SQL migration names and timestamps.

## Operational behavior

- Ingestion defaults to a five-minute interval and 100 listings. CMC documents the listings endpoint's source refresh cadence as 60 seconds and the global metrics endpoint cadence as 5 minutes. The scheduler will not poll more frequently than 60 seconds.
- BullMQ retries failed jobs with exponential backoff. Worker concurrency is one for this provider queue.
- Cache failures fall back to PostgreSQL; readiness reports Redis as unavailable until it recovers.
- Freshness is evaluated from the provider's source timestamp using `DATA_STALE_AFTER_SECONDS`; a feed outage leaves old values labeled stale.
- `CMC_LISTINGS_LIMIT` is capped at 250 to keep one listings request within one documented 250-item credit batch.

## CMC access verification

The keyless public endpoints were reachable (HTTP 200, CMC error 0) during initial integration verification. A later repeat check was rate-limited with CMC error 1022 (HTTP 429), which indicates the anonymous access allowance is exhausted at this time:

- `/public-api/v3/cryptocurrency/listings/latest?start=1&limit=2&convert=USD`
- `/public-api/v1/global-metrics/quotes/latest?convert=USD`

No `CMC_PRO_API_KEY` exists in the workspace or process environment. Therefore authenticated key validity, current subscription plan, plan-specific endpoint entitlement, and account quota were not verified. The current anonymous quota limit also means live ingestion cannot proceed until CMC grants more anonymous access or a server-side key with suitable entitlements is configured. Once a key is provisioned server-side, call the protected Key Info route to verify the authenticated key and store actual plan limits/usage. Do not put the key in logs, fixtures, browser variables or Git.

## Fixture policy

Tests use the fixed CMC-shaped JSON files under `test/fixtures`. They have a separate provenance note, fixed historic timestamps and illustrative values. Tests do not call CMC. Live keyless endpoint reachability was a separate manual verification; no live market response is treated as fixture or production seed data.
