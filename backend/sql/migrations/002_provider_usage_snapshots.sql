CREATE TABLE IF NOT EXISTS provider_usage_snapshots (
  id bigserial PRIMARY KEY,
  provider_code text NOT NULL REFERENCES providers(code),
  captured_at timestamptz NOT NULL DEFAULT now(),
  plan jsonb NOT NULL,
  usage jsonb NOT NULL,
  source text NOT NULL DEFAULT 'key_info'
);
CREATE INDEX IF NOT EXISTS provider_usage_snapshots_latest_idx ON provider_usage_snapshots (provider_code, captured_at DESC);
