'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

const CHANGE_EVENT = 'falconstats-local-storage';
function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => { window.removeEventListener(CHANGE_EVENT, callback); window.removeEventListener('storage', callback); };
}
function emitChange() { window.dispatchEvent(new Event(CHANGE_EVENT)); }

export function useBrowserList<T>(key: string): [T[], (next: T[]) => void] {
  const getSnapshot = useCallback(() => localStorage.getItem(key) ?? '[]', [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => '[]');
  const values = useMemo(() => {
    try { const parsed: unknown = JSON.parse(raw); return Array.isArray(parsed) ? parsed as T[] : []; }
    catch { return []; }
  }, [raw]);
  const update = useCallback((next: T[]) => { localStorage.setItem(key, JSON.stringify(next)); emitChange(); }, [key]);
  return [values, update];
}

export function useBrowserObject<T extends object>(key: string, fallback: T): [T, (next: T) => void] {
  const getSnapshot = useCallback(() => localStorage.getItem(key) ?? '{}', [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => '{}');
  const value = useMemo(() => {
    try { const parsed: unknown = JSON.parse(raw); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...fallback, ...parsed } as T : fallback; }
    catch { return fallback; }
  }, [fallback, raw]);
  const update = useCallback((next: T) => { localStorage.setItem(key, JSON.stringify(next)); emitChange(); }, [key]);
  return [value, update];
}
