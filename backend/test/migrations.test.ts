import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL migrations create the market schema and provider quota tables', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const file of ['001_initial_schema.sql', '002_provider_usage_snapshots.sql', '003_free_provider_data_engine.sql']) {
      await db.exec(await readFile(join(process.cwd(), 'sql', 'migrations', file), 'utf8'));
      await db.query('INSERT INTO schema_migrations(name) VALUES ($1)', [file]);
    }
    const tables = await db.query<{ table_name: string }>(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    const names = new Set(tables.rows.map((row) => row.table_name));
    for (const required of ['assets', 'asset_identifiers', 'market_snapshots', 'global_metric_snapshots', 'provider_request_events', 'provider_usage_snapshots','exchange_quotes','derivatives_instruments','open_interest_snapshots','funding_rate_snapshots','liquidation_events','defi_protocols','defi_chain_tvl','historical_price_snapshots']) assert.ok(names.has(required), `missing ${required}`);
    const provider = await db.query<{ code: string; enabled:boolean }>(`SELECT code,enabled FROM providers WHERE code='coinmarketcap'`);
    assert.equal(provider.rows[0].code, 'coinmarketcap');
    assert.equal(provider.rows[0].enabled, false);
    const activeProviders = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM providers WHERE code IN ('coingecko','binance','bybit','defillama') AND enabled`);
    assert.equal(activeProviders.rows[0].count,4);
    const precision = await db.query<{ numeric_precision: number; numeric_scale: number }>(`SELECT numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name='market_snapshots' AND column_name='price'`);
    assert.equal(precision.rows[0].numeric_precision, 38);
    assert.equal(precision.rows[0].numeric_scale, 18);
  } finally { await db.close(); }
});
