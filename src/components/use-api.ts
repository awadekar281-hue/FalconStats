'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { ApiMeta, ApiEnvelope } from '@/lib/types';

export interface Resource<T> {
  data: T | null; meta: ApiMeta | null; error: string | null; status: 'loading' | 'success' | 'error'; refresh: () => void;
}

type InternalState<T> = Omit<Resource<T>, 'refresh'> & { path: string | null };

export function useApi<T>(path: string | null): Resource<T> {
  const [state, setState] = useState<InternalState<T>>({ path: null, data: null, meta: null, error: null, status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    apiFetch<T>(path, { signal: controller.signal }).then((result: ApiEnvelope<T>) => {
      if (!controller.signal.aborted) setState({ path, data: result.data, meta: result.meta, error: null, status: 'success' });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState((current) => ({ path, data: current.path === path ? current.data : null, meta: current.path === path ? current.meta : null, error: error instanceof ApiError ? error.message : 'Unable to load FalconStats data.', status: 'error' }));
    });
    return () => controller.abort();
  }, [path, reloadKey]);
  const samePath = state.path === path;
  return { data: samePath ? state.data : null, meta: samePath ? state.meta : null, error: samePath ? state.error : null, status: samePath ? state.status : 'loading', refresh };
}
