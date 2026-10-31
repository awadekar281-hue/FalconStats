ALTER TABLE assets ALTER COLUMN cmc_id DROP NOT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS coingecko_id text;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS image_url text;
CREATE UNIQUE INDEX IF NOT EXISTS assets_coingecko_id_idx ON assets (coingecko_id) WHERE coingecko_id IS NOT NULL;

ALTER TABLE provider_request_events ALTER COLUMN access_mode DROP NOT NULL;
ALTER TABLE provider_request_events DROP CONSTRAINT IF EXISTS provider_request_events_access_mode_check;
ALTER TABLE provider_request_events ADD CONSTRAINT provider_request_events_access_mode_check CHECK (access_mode IS NULL OR access_mode IN ('keyed','keyless','public'));
ALTER TABLE provider_request_events RENAME COLUMN cmc_error_code TO provider_error_code;
ALTER TABLE provider_request_events RENAME COLUMN cmc_error_message TO provider_error_message;

INSERT INTO providers (code,display_name,base_url) VALUES
 ('coingecko','CoinGecko','https://api.coingecko.com/api/v3'),
 ('binance','Binance Spot','https://data-api.binance.vision'),
 ('bybit','Bybit Public Market','https://api.bybit.com'),
 ('defillama','DefiLlama','https://api.llama.fi')
ON CONFLICT (code) DO UPDATE SET display_name=EXCLUDED.display_name,base_url=EXCLUDED.base_url,enabled=true,updated_at=now();
UPDATE providers SET enabled=false WHERE code='coinmarketcap';

CREATE TABLE IF NOT EXISTS exchange_quotes (
 id bigserial PRIMARY KEY, asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
 exchange_code text NOT NULL REFERENCES providers(code), symbol text NOT NULL, base_asset text NOT NULL,
 quote_asset text NOT NULL, market_type text NOT NULL CHECK (market_type IN ('spot','linear','inverse')),
 price numeric(38,18), volume_24h numeric(38,12), change_24h numeric(18,8),
 source_as_of timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(exchange_code,symbol,market_type,source_as_of)
);
CREATE INDEX IF NOT EXISTS exchange_quotes_latest_idx ON exchange_quotes(exchange_code,symbol,market_type,source_as_of DESC);

CREATE TABLE IF NOT EXISTS derivatives_instruments (
 id bigserial PRIMARY KEY, exchange_code text NOT NULL REFERENCES providers(code), symbol text NOT NULL,
 base_asset text NOT NULL, quote_asset text NOT NULL, contract_type text NOT NULL,
 funding_interval_minutes integer, status text, updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(exchange_code,symbol,contract_type)
);
CREATE TABLE IF NOT EXISTS open_interest_snapshots (
 id bigserial PRIMARY KEY, instrument_id bigint NOT NULL REFERENCES derivatives_instruments(id) ON DELETE CASCADE,
 open_interest numeric(38,18) NOT NULL, unit text NOT NULL, source_as_of timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(), UNIQUE(instrument_id,source_as_of)
);
CREATE INDEX IF NOT EXISTS open_interest_latest_idx ON open_interest_snapshots(instrument_id,source_as_of DESC);
CREATE TABLE IF NOT EXISTS funding_rate_snapshots (
 id bigserial PRIMARY KEY, instrument_id bigint NOT NULL REFERENCES derivatives_instruments(id) ON DELETE CASCADE,
 funding_rate numeric(30,18) NOT NULL, funding_at timestamptz, next_funding_at timestamptz,
 source_as_of timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(instrument_id,source_as_of)
);
CREATE INDEX IF NOT EXISTS funding_rates_latest_idx ON funding_rate_snapshots(instrument_id,source_as_of DESC);
CREATE TABLE IF NOT EXISTS liquidation_events (
 id bigserial PRIMARY KEY, exchange_code text NOT NULL REFERENCES providers(code), symbol text NOT NULL,
 side text NOT NULL, price numeric(38,18), quantity numeric(38,18), event_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(), provider_event_id text,
 UNIQUE(exchange_code,provider_event_id)
);
CREATE INDEX IF NOT EXISTS liquidation_events_time_idx ON liquidation_events(exchange_code,event_at DESC);

CREATE TABLE IF NOT EXISTS defi_protocols (
 id text PRIMARY KEY, name text NOT NULL, category text, chains text[] NOT NULL DEFAULT '{}',
 tvl numeric(38,8), url text, source_as_of timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS defi_chain_tvl (
 chain text PRIMARY KEY, tvl numeric(38,8) NOT NULL, source_as_of timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS defi_protocols_tvl_idx ON defi_protocols(tvl DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS historical_price_snapshots (
 id bigserial PRIMARY KEY, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
 quote_currency text NOT NULL, price numeric(38,18), market_cap numeric(38,8), total_volume numeric(38,8),
 source text NOT NULL, source_as_of timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(asset_id,quote_currency,source,source_as_of)
);
CREATE INDEX IF NOT EXISTS historical_prices_asset_time_idx ON historical_price_snapshots(asset_id,quote_currency,source_as_of DESC);
