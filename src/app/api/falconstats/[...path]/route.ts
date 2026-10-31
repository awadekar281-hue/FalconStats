import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

const PUBLIC_GETS = new Set([
  'health/live', 'health/ready', 'assets', 'market/listings', 'market/global', 'providers/cmc/status',
]);
const PUBLIC_PREFIX_GETS = [/^assets\/[0-9a-f-]{36}$/i];
const ADMIN_POSTS = new Set(['providers/cmc/ingestion/market', 'providers/cmc/key-info']);
const ADMIN_GETS = new Set(['providers/cmc/quota']);

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const upstreamPath = path.join('/');
  const method = request.method.toUpperCase();
  const isPublicGet = method === 'GET' && (PUBLIC_GETS.has(upstreamPath) || PUBLIC_PREFIX_GETS.some((pattern) => pattern.test(upstreamPath)));
  const isAdminAction = (method === 'POST' && ADMIN_POSTS.has(upstreamPath)) || (method === 'GET' && ADMIN_GETS.has(upstreamPath));
  if (!isPublicGet && !isAdminAction) return NextResponse.json({ error: { code: 'NOT_SUPPORTED', message: 'This FalconStats API route is not available.' } }, { status: 404 });

  if (isAdminAction && !process.env.FALCONSTATS_ADMIN_API_KEY) {
    return NextResponse.json({ error: { code: 'ADMIN_NOT_CONFIGURED', message: 'Admin actions are unavailable until the server-side FalconStats admin key is configured.' } }, { status: 503 });
  }
  if (isAdminAction) {
    const expected = process.env.FALCONSTATS_ADMIN_UI_TOKEN ?? '';
    const provided = request.headers.get('x-falconstats-admin-token') ?? '';
    const expectedBytes = Buffer.from(expected); const providedBytes = Buffer.from(provided);
    if (expectedBytes.length < 32 || expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
      return NextResponse.json({ error: { code: 'ADMIN_UNAUTHORIZED', message: 'Enter the configured FalconStats admin access token to continue.' } }, { status: 401 });
    }
  }

  const origin = (process.env.FALCONSTATS_API_ORIGIN || 'http://127.0.0.1:3001').replace(/\/$/, '');
  const url = new URL(`${origin}/api/v1/${upstreamPath}`);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value));
  const headers = new Headers({ Accept: 'application/json' });
  if (isAdminAction) headers.set('X-Admin-Api-Key', process.env.FALCONSTATS_ADMIN_API_KEY!);
  try {
    const upstream = await fetch(url, { method, headers, signal: AbortSignal.timeout(12_000), cache: 'no-store' });
    const contentType = upstream.headers.get('content-type') || 'application/json';
    return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: { 'content-type': contentType, 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: { code: 'BACKEND_UNAVAILABLE', message: 'FalconStats API could not be reached. Verify FALCONSTATS_API_ORIGIN and backend health.' } }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
