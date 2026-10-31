import type { ApiEnvelope, Asset, GlobalMetrics, PageData, ProviderStatus } from './types';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'ApiError'; }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`/api/falconstats/${path.replace(/^\//, '')}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  let body: unknown;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) {
    const message = typeof body === 'object' && body && 'error' in body && typeof body.error === 'object' && body.error && 'message' in body.error
      ? String(body.error.message) : response.status === 502 || response.status === 503
        ? 'FalconStats API is unavailable. Check the backend and its PostgreSQL/Redis services.'
        : `FalconStats API request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return body as ApiEnvelope<T>;
}

export async function adminApiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const token = typeof window === 'undefined' ? '' : sessionStorage.getItem('falconstats-admin-token-v1') ?? '';
  return apiFetch<T>(path, { ...init, headers: { ...(init?.headers ?? {}), 'X-FalconStats-Admin-Token': token } });
}

export const apiPaths = {
  global: (currency = 'USD') => `market/global?convert=${encodeURIComponent(currency)}`,
  listings: (limit = 50, offset = 0, search = '') => `market/listings?limit=${limit}&offset=${offset}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
  assets: (limit = 250, offset = 0, search = '') => `assets?limit=${limit}&offset=${offset}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
  asset: (id: string) => `assets/${encodeURIComponent(id)}`,
  providerStatus: 'providers/cmc/status',
  readiness: 'health/ready',
} as const;

export type ListingsResponse = PageData<Asset>;
export type AssetsResponse = PageData<Asset>;
export type GlobalResponse = GlobalMetrics | null;
export type ProviderResponse = ProviderStatus;
