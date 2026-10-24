'use client';

import { useSyncExternalStore } from 'react';
import { defaultModes, MODE_STORAGE_KEY, parseModes, type ModeSettings } from '@/lib/studio/modes';

const initial = defaultModes();
let snapshot = initial, loaded = false;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) {
    try { snapshot = parseModes(localStorage.getItem(MODE_STORAGE_KEY)); } catch { snapshot = initial; }
    loaded = true;
  }
  const storage = (event: StorageEvent) => {
    if (event.key !== MODE_STORAGE_KEY && event.key !== null) return;
    snapshot = parseModes(event.newValue); for (const notify of listeners) notify();
  };
  window.addEventListener('storage', storage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', storage); };
}
export function useModeSettings() {
  const settings = useSyncExternalStore(subscribe, () => snapshot, () => initial);
  function update<K extends keyof ModeSettings>(key: K, patch: Partial<ModeSettings[K]>) {
    snapshot = { ...snapshot, [key]: { ...snapshot[key], ...patch } };
    let persisted = true;
    try { localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(snapshot)); } catch { persisted = false; }
    for (const listener of listeners) listener();
    return persisted;
  }
  return [settings, update] as const;
}

export function replaceModeSettings(value: ModeSettings) {
  snapshot = parseModes(JSON.stringify(value));
  let saved = true;
  try { localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(snapshot)); } catch { saved = false; }
  listeners.forEach(fn => fn());
  return saved;
}
