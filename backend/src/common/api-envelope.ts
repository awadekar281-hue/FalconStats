import { randomUUID } from 'node:crypto';

export interface ApiMeta {
  requestId: string;
  generatedAt: string;
  source?: string;
  asOf?: string | null;
  freshness?: 'fresh' | 'stale' | 'unavailable';
}

export interface ApiEnvelope<T> { data: T; meta: ApiMeta }

export function envelope<T>(data: T, options: Omit<ApiMeta, 'requestId' | 'generatedAt'> & { requestId?: string } = {}): ApiEnvelope<T> {
  return { data, meta: { requestId: options.requestId ?? randomUUID(), generatedAt: new Date().toISOString(), ...options } };
}

export function classifyFreshness(asOf: Date | string | null | undefined, staleAfterSeconds: number): ApiMeta['freshness'] {
  if (!asOf) return 'unavailable';
  const age = Date.now() - new Date(asOf).getTime();
  return Number.isFinite(age) && age <= staleAfterSeconds * 1000 ? 'fresh' : 'stale';
}
