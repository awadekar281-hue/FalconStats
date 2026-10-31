import assert from 'node:assert/strict';
import test from 'node:test';
import { formatMoney, formatPercent, formatDate } from '../src/components/data-ui';
import { apiPaths } from '../src/lib/api';

test('formatters preserve missing market values instead of substituting sample data', () => {
  assert.equal(formatMoney(null), '—');
  assert.equal(formatPercent(null), '—');
  assert.equal(formatDate(null), 'Not available');
});

test('formatters present real values with currency and sign context', () => {
  assert.equal(formatMoney('1234.50'), '$1,234.5');
  assert.equal(formatPercent('-1.25'), '-1.25%');
  assert.equal(formatPercent('2.5'), '+2.50%');
});

test('API paths target the internal FalconStats endpoints and encode search text', () => {
  assert.equal(apiPaths.global('USD'), 'market/global?convert=USD');
  assert.equal(apiPaths.asset('abc-def'), 'assets/abc-def');
  assert.equal(apiPaths.listings(50, 25, 'bitcoin & ether'), 'market/listings?limit=50&offset=25&search=bitcoin%20%26%20ether');
});
