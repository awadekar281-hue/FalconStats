# FalconStats API contract

Successful responses use `{ "data": ..., "meta": { "requestId", "generatedAt", "source", "asOf", "freshness" } }`. Monetary values and quantities are decimal strings from PostgreSQL. Missing metrics are null; unavailable collections identify their state and reason. Provider timestamps are UTC ISO-8601.

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/v1/market/global?convert=USD` | Public | Latest stored CoinGecko global metrics |
| GET | `/api/v1/market/listings?limit=50&offset=0&search=BTC` | Public | Paged CoinGecko rankings and market snapshots |
| GET | `/api/v1/assets?limit=50&offset=0&search=BTC` | Public | Canonical CoinGecko-mapped assets |
| GET | `/api/v1/assets/:uuid` | Public | Asset identity and latest global reference snapshot |
| GET | `/api/v1/assets/:uuid/markets` | Public | Current mapped Binance/Bybit quotes with their quote currencies |
| GET | `/api/v1/assets/:uuid/history?days=7` | Public | Cached CoinGecko historical price, market cap, and volume series (1–30 days) |
| GET | `/api/v1/assets/:uuid/ohlcv` | Public | Explicit unsupported state; candle history is not collected |
| GET | `/api/v1/providers/status` | Public | Provider health, request freshness, and asset count |
| GET | `/api/v1/providers/usage` | Admin | Monthly provider calls and CoinGecko safety-budget usage |
| POST | `/api/v1/providers/ingestion/market` | Admin | Enqueue a provider ingestion run |
| GET | `/api/v1/exchanges` | Public | Exchanges with stored exchange-specific quote data |
| GET | `/api/v1/exchanges/:id/markets?limit=100` | Public | Recent quotes for Binance or Bybit, retaining quote currency |
| GET | `/api/v1/derivatives/overview` | Public | Bybit coverage and liquidation collector state |
| GET | `/api/v1/derivatives/open-interest?symbol=BTCUSDT` | Public | Bybit linear OI, explicitly unit-labeled |
| GET | `/api/v1/derivatives/funding?symbol=BTCUSDT` | Public | Bybit ticker funding snapshots |
| GET | `/api/v1/derivatives/liquidations?symbol=BTCUSDT` | Public | Captured Bybit events or explicit unsupported state |
| GET | `/api/v1/defi/protocols?limit=100` | Public | Cached DeFiLlama protocol directory |
| GET | `/api/v1/defi/protocols/:slug` | Public | Synced protocol record |
| GET | `/api/v1/defi/chains` | Public | Cached chain TVL records |
| GET | `/api/v1/defi/tvl` | Public | Sum of current synced chain TVL values |
| GET | `/api/v1/health/live` | Public | Process liveness |
| GET | `/api/v1/health/ready` | Public | PostgreSQL and Redis readiness |

Admin requests require `X-Admin-Api-Key`; the frontend proxy keeps this credential server-side and applies a separate browser session token. CoinGecko global metrics and rankings are distinct from exchange-only prices. Binance/Bybit pair prices retain their original quote currency. Historical candles and liquidations are not replaced with demo values.
