CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS providers (
  id bigserial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  base_url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cmc_id bigint NOT NULL UNIQUE,
  name text NOT NULL,
  symbol text NOT NULL,
  slug text,
  rank integer,
  is_active boolean NOT NULL DEFAULT true,
  platform_cmc_id bigint,
  platform_name text,
  platform_symbol text,
  contract_address text,
  source_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assets_symbol_idx ON assets (upper(symbol));
CREATE INDEX IF NOT EXISTS assets_rank_idx ON assets (rank NULLS LAST);

CREATE TABLE IF NOT EXISTS asset_identifiers (
  id bigserial PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  provider_code text NOT NULL REFERENCES providers(code),
  identifier_type text NOT NULL,
  identifier_value text NOT NULL,
  normalized_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_code, identifier_type, normalized_value)
);
CREATE INDEX IF NOT EXISTS asset_identifiers_asset_idx ON asset_identifiers (asset_id);

CREATE TABLE IF NOT EXISTS market_snapshots (
  id bigserial PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  quote_currency text NOT NULL,
  price numeric(38, 18),
  volume_24h numeric(38, 8),
  market_cap numeric(38, 8),
  fully_diluted_market_cap numeric(38, 8),
  circulating_supply numeric(38, 12),
  total_supply numeric(38, 12),
  max_supply numeric(38, 12),
  percent_change_1h numeric(18, 8),
  percent_change_24h numeric(18, 8),
  percent_change_7d numeric(18, 8),
  source text NOT NULL,
  source_as_of timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, quote_currency, source_as_of)
);
CREATE INDEX IF NOT EXISTS market_snapshots_asset_latest_idx ON market_snapshots (asset_id, quote_currency, source_as_of DESC);
CREATE INDEX IF NOT EXISTS market_snapshots_received_idx ON market_snapshots (received_at DESC);

CREATE TABLE IF NOT EXISTS global_metric_snapshots (
  id bigserial PRIMARY KEY,
  quote_currency text NOT NULL,
  total_market_cap numeric(38, 8),
  total_volume_24h numeric(38, 8),
  btc_dominance numeric(18, 8),
  eth_dominance numeric(18, 8),
  active_cryptocurrencies integer,
  total_cryptocurrencies integer,
  active_exchanges integer,
  active_market_pairs integer,
  source text NOT NULL,
  source_as_of timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_currency, source_as_of)
);
CREATE INDEX IF NOT EXISTS global_metrics_latest_idx ON global_metric_snapshots (quote_currency, source_as_of DESC);

CREATE TABLE IF NOT EXISTS provider_request_events (
  id bigserial PRIMARY KEY,
  provider_code text NOT NULL REFERENCES providers(code),
  endpoint text NOT NULL,
  request_started_at timestamptz NOT NULL,
  response_received_at timestamptz,
  http_status integer,
  duration_ms integer,
  cmc_error_code integer,
  cmc_error_message text,
  credit_count integer NOT NULL DEFAULT 0,
  rate_limit_limit integer,
  rate_limit_remaining integer,
  rate_limit_reset_at timestamptz,
  access_mode text NOT NULL CHECK (access_mode IN ('keyed', 'keyless')),
  succeeded boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS provider_events_time_idx ON provider_request_events (provider_code, request_started_at DESC);
CREATE INDEX IF NOT EXISTS provider_events_error_idx ON provider_request_events (provider_code, succeeded, request_started_at DESC);

INSERT INTO providers (code, display_name, base_url)
VALUES ('coinmarketcap', 'CoinMarketCap', 'https://pro-api.coinmarketcap.com')
ON CONFLICT (code) DO NOTHING;
