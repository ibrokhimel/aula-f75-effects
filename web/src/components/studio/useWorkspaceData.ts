'use client';
import { useSyncExternalStore } from 'react';
import { WORKSPACE_KEY, defaultWorkspaces, parseWorkspaces, type WorkspaceData } from '@/lib/studio/workspaces';
const initial = defaultWorkspaces();
let snapshot = initial, loaded = false;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) {
    try {
      snapshot = parseWorkspaces(localStorage.getItem(WORKSPACE_KEY));
      if (!localStorage.getItem(WORKSPACE_KEY)) {
        const legacy = JSON.parse(localStorage.getItem('aula-f75.remap') ?? '{}');
        snapshot = parseWorkspaces(JSON.stringify({ ...snapshot, mappings: [legacy['0'], legacy['1']] }));
      }
    } catch { snapshot = initial; }
    loaded = true;
  }
  const storage = (event: StorageEvent) => { if (event.key === WORKSPACE_KEY || event.key === null) { snapshot = parseWorkspaces(event.newValue); listeners.forEach(fn => fn()); } };
  window.addEventListener('storage', storage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', storage); };
}
export function updateWorkspaceData(patch: Partial<WorkspaceData> | ((value: WorkspaceData) => Partial<WorkspaceData>)) {
  snapshot = { ...snapshot, ...(typeof patch === 'function' ? patch(snapshot) : patch) };
  let saved = true;
  try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot)); } catch { saved = false; }
  listeners.forEach(fn => fn()); return saved;
}
export function useWorkspaceData() { return [useSyncExternalStore(subscribe, () => snapshot, () => initial), updateWorkspaceData] as const; }
