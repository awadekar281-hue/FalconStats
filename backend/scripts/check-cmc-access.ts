import 'dotenv/config';

const base = (process.env.CMC_BASE_URL ?? 'https://pro-api.coinmarketcap.com').replace(/\/$/, '');
const key = process.env.CMC_PRO_API_KEY?.trim() ?? '';
const root = key ? base : `${base}/public-api`;
const endpoints = ['/v3/cryptocurrency/listings/latest?start=1&limit=2&convert=USD', '/v1/global-metrics/quotes/latest?convert=USD'];

async function check(path: string): Promise<boolean> {
  const response = await fetch(`${root}${path}`, { headers: { Accept: 'application/json', ...(key ? { 'X-CMC_PRO_API_KEY': key } : {}) }, signal: AbortSignal.timeout(12000) });
  const body = await response.json() as { status?: { error_code?: number | string; error_message?: string } };
  const code = Number(body.status?.error_code ?? 0);
  console.log(`${response.status === 200 && code === 0 ? 'PASS' : 'FAIL'} ${path} HTTP ${response.status}, CMC error ${code}${body.status?.error_message ? `: ${body.status.error_message}` : ''}`);
  return response.ok && code === 0;
}

async function main(): Promise<void> {
  const results = await Promise.all(endpoints.map(check));
  if (key) {
    const response = await fetch(`${base}/v1/key/info`, { headers: { Accept: 'application/json', 'X-CMC_PRO_API_KEY': key }, signal: AbortSignal.timeout(12000) });
    const body = await response.json() as { data?: { plan?: { credit_limit_monthly?: number }; usage?: { current_month?: { credits_left?: number } } }; status?: { error_code?: number | string; error_message?: string } };
    const code = Number(body.status?.error_code ?? 0);
    const success = response.ok && code === 0 && !!body.data?.plan;
    console.log(`${success ? 'PASS' : 'FAIL'} /v1/key/info HTTP ${response.status}, CMC error ${code}; authenticated subscription ${success ? 'verified' : 'not verified'}`);
    if (success) console.log(`Monthly credit limit: ${body.data?.plan?.credit_limit_monthly ?? 'not returned'}; credits remaining this month: ${body.data?.usage?.current_month?.credits_left ?? 'not returned'}`);
    if (!success && body.status?.error_message) console.log(body.status.error_message);
    results.push(success);
  } else {
    console.log('INFO No CMC_PRO_API_KEY configured; authenticated subscription and plan access were not tested. Keyless public endpoint access only.');
  }
  if (results.some((result) => !result)) process.exitCode = 1;
}
void main();
