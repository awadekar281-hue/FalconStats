import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parse as parseLossless } from 'lossless-json';
import { assertCmcSuccess, normalizeGlobalMetrics, normalizeListings } from '../src/modules/cmc/cmc-normalizer';
import type { CmcEnvelope, CmcListing } from '../src/modules/cmc/cmc.types';

const fixtureDir = join(process.cwd(), 'test', 'fixtures');
const listings = JSON.parse(readFileSync(join(fixtureDir, 'cmc-listings-latest.fixture.json'), 'utf8')) as CmcEnvelope<CmcListing[]>;
const globalMetrics = JSON.parse(readFileSync(join(fixtureDir, 'cmc-global-metrics-latest.fixture.json'), 'utf8')) as CmcEnvelope<Record<string, unknown>>;

test('normalizes CMC listing fixture by stable CMC ID and quote currency', () => {
  const result = normalizeListings(listings, 'USD');
  assert.equal(result.length, 2);
  assert.equal(result[0].cmcId, 1);
  assert.equal(result[0].symbol, 'BTC');
  assert.equal(result[0].price, '42000.125');
  assert.equal(result[0].percentChange24h, '-1.5');
  assert.equal(result[0].quoteAsOf, '2024-01-02T03:04:05.000Z');
  assert.equal(result[1].maxSupply, null);
});

test('normalizes global metric fixture and retains source timestamp', () => {
  const result = normalizeGlobalMetrics(globalMetrics, 'USD');
  assert.equal(result.totalMarketCap, '1650000000000');
  assert.equal(result.totalVolume24h, '65000000000');
  assert.equal(result.btcDominance, '51.25');
  assert.equal(result.sourceAsOf, '2024-01-02T03:04:05.000Z');
});

test('preserves missing quotes as null instead of converting them to zero', () => {
  const input = { data: [{ id: 99, name: 'No quote', symbol: 'NONE', quote: [] }], status: { error_code: 0 } } as CmcEnvelope<CmcListing[]>;
  const result = normalizeListings(input, 'USD')[0];
  assert.equal(result.price, null);
  assert.equal(result.marketCap, null);
});

test('normalizes both numeric and string CMC error codes', () => {
  assert.doesNotThrow(() => assertCmcSuccess({ error_code: 0 }));
  assert.throws(() => assertCmcSuccess({ error_code: '1006', error_message: 'Plan not authorized' }), /error 1006/);
});

test('keeps large decimal strings precise through lossless CMC JSON parsing', () => {
  const raw = parseLossless('{"data":[{"id":7,"name":"Precise","symbol":"PCS","quote":[{"symbol":"USD","price":12345678901234567890.123456789012345678}]}],"status":{"error_code":"0"}}') as CmcEnvelope<CmcListing[]>;
  const result = normalizeListings(raw, 'USD')[0];
  assert.equal(result.price, '12345678901234567890.123456789012345678');
});
