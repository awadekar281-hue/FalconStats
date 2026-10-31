import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL migrations create the market schema and provider quota tables', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const file of ['001_initial_schema.sql', '002_provider_usage_snapshots.sql']) {
      await db.exec(await readFile(join(process.cwd(), 'sql', 'migrations', file), 'utf8'));
      await db.query('INSERT INTO schema_migrations(name) VALUES ($1)', [file]);
    }
    const tables = await db.query<{ table_name: string }>(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    const names = new Set(tables.rows.map((row) => row.table_name));
    for (const required of ['assets', 'asset_identifiers', 'market_snapshots', 'global_metric_snapshots', 'provider_request_events', 'provider_usage_snapshots']) assert.ok(names.has(required), `missing ${required}`);
    const provider = await db.query<{ code: string }>(`SELECT code FROM providers WHERE code='coinmarketcap'`);
    assert.equal(provider.rows[0].code, 'coinmarketcap');
    const precision = await db.query<{ numeric_precision: number; numeric_scale: number }>(`SELECT numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name='market_snapshots' AND column_name='price'`);
    assert.equal(precision.rows[0].numeric_precision, 38);
    assert.equal(precision.rows[0].numeric_scale, 18);
  } finally { await db.close(); }
});
