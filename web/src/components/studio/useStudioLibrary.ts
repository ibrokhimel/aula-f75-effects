'use client';

import { useSyncExternalStore } from 'react';
import { loadLibrary, parseLibrary, saveLibrary, STUDIO_STORAGE_KEY, type StudioLibrary } from '@/lib/studio/storage';

const empty: StudioLibrary = { favorites: [], presets: [] };
let snapshot = empty;
let loaded = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) { snapshot = loadLibrary(); loaded = true; }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STUDIO_STORAGE_KEY && event.key !== null) return;
    snapshot = parseLibrary(event.newValue);
    for (const notify of listeners) notify();
  };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}

export function useStudioLibrary() {
  const library = useSyncExternalStore(subscribe, () => snapshot, () => empty);
  function update(next: StudioLibrary) {
    const persisted = saveLibrary(next);
    snapshot = next;
    for (const listener of listeners) listener();
    return persisted;
  }
  return [library, update] as const;
}
