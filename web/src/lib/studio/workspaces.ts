import keymap from '../../data/f75-keymap.json';
import { defaultBlob, getSlot, setSlot, validateBlob, type F75Key } from '../keybind';
import { LIGHTING_MODES, defaultsFor, type LightingMode, type StudioSettings } from './catalog';
import { defaultModes, parseModes, type ModeSettings } from './modes';
import { parseSettings } from './storage';

export const WORKSPACE_KEY = 'aula-f75.studio.workspaces.v1';
export const KEYS: F75Key[] = keymap.keys;
export type MacroStep = { id: string; action: 'down' | 'up' | 'delay'; code: string; ms: number };
export type StudioMacro = { id: string; name: string; steps: MacroStep[] };
export type Preferences = { fps: number; compact: boolean; closeToTray: boolean };
export interface Setup { mode: LightingMode; automatic: StudioSettings; modes: ModeSettings; mappings: number[][]; macros: StudioMacro[]; preferences: Preferences }
export interface Profile { id: string; name: string; savedAt: string; setup: Setup }
export interface WorkspaceData { mappings: number[][]; macros: StudioMacro[]; profiles: Profile[]; preferences: Preferences; scores: Record<string, number> }
export function defaultMappings() { return [0, 1].map(layer => Array.from(defaultBlob(layer as 0 | 1, KEYS))); }
export const defaultPreferences = (): Preferences => ({ fps: 30, compact: false, closeToTray: true });
export function defaultWorkspaces(): WorkspaceData { return { mappings: defaultMappings(), macros: [], profiles: [], preferences: defaultPreferences(), scores: {} }; }
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export function parseMappings(value: unknown): number[][] {
  const defaults = defaultMappings();
  if (!Array.isArray(value)) return defaults;
  return defaults.map((fallback, index) => {
    const item = value[index];
    if (!Array.isArray(item) || !item.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) return fallback;
    try {
      const blob = new Uint8Array(item); validateBlob(blob);
      if (blob[2] !== index) return fallback;
      const clean = new Uint8Array(fallback);
      for (const key of KEYS) { const output = getSlot(blob, key.index); if (!key.locked && [0, 2].includes(output.page)) setSlot(clean, key.index, output); }
      return Array.from(clean);
    } catch { return fallback; }
  });
}
export function parseMacros(value: unknown): StudioMacro[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, 50).flatMap(raw => {
    const m = obj(raw);
    if (typeof m.id !== 'string' || !m.id || m.id.length > 80 || seen.has(m.id) || typeof m.name !== 'string' || !Array.isArray(m.steps)) return [];
    seen.add(m.id);
    const stepIds = new Set<string>();
    const steps: MacroStep[] = m.steps.slice(0, 500).flatMap((item, index) => {
      const s = obj(item);
      if (!['down', 'up', 'delay'].includes(String(s.action))) return [];
      if (s.action !== 'delay' && (typeof s.code !== 'string' || !/^(Key[A-Z]|Digit[0-9]|F([1-9]|1[0-2])|Arrow(Up|Down|Left|Right)|Space|Enter|Escape|Tab|Backspace|Delete|Home|End|PageUp|PageDown|Insert|(Shift|Control|Alt|Meta)(Left|Right)|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Backquote|Comma|Period|Slash|CapsLock)$/.test(s.code))) return [];
      const id = typeof s.id === 'string' && s.id.length < 80 && !stepIds.has(s.id) ? s.id : `step-${index}`;
      stepIds.add(id);
      return [{ id, action: s.action as MacroStep['action'], code: typeof s.code === 'string' ? s.code : 'KeyA', ms: typeof s.ms === 'number' && Number.isFinite(s.ms) ? Math.max(0, Math.min(10000, Math.round(s.ms))) : 100 }];
    });
    return [{ id: m.id, name: m.name.trim().slice(0, 48) || 'Untitled macro', steps }];
  });
}
export function parsePreferences(value: unknown): Preferences {
  const p = obj(value);
  return { fps: [20, 30, 60].includes(Number(p.fps)) ? Number(p.fps) : 30, compact: p.compact === true, closeToTray: p.closeToTray !== false };
}
export function parseSetup(value: unknown): Setup {
  const s = obj(value);
  return { mode: LIGHTING_MODES.some(m => m.id === s.mode) ? s.mode as LightingMode : 'automatic', automatic: parseSettings(s.automatic), modes: parseModes(JSON.stringify(s.modes ?? {})), mappings: parseMappings(s.mappings), macros: parseMacros(s.macros), preferences: parsePreferences(s.preferences) };
}
export function defaultSetup(): Setup { return { mode: 'automatic', automatic: defaultsFor(), modes: defaultModes(), mappings: defaultMappings(), macros: [], preferences: defaultPreferences() }; }
export function parseWorkspaces(text: string | null): WorkspaceData {
  try {
    const root = obj(JSON.parse(text ?? '{}')), used = new Set<string>();
    const profiles: Profile[] = Array.isArray(root.profiles) ? root.profiles.slice(0, 30).flatMap(raw => {
      const p = obj(raw);
      if (typeof p.id !== 'string' || !p.id || p.id.length > 80 || used.has(p.id) || typeof p.name !== 'string') return [];
      used.add(p.id);
      return [{ id: p.id, name: p.name.trim().slice(0, 48) || 'Untitled profile', savedAt: typeof p.savedAt === 'string' ? p.savedAt.slice(0, 40) : '', setup: parseSetup(p.setup) }];
    }) : [];
    const scores = Object.fromEntries(Object.entries(obj(root.scores)).filter(([key, value]) => /^[a-z]+$/.test(key) && typeof value === 'number' && Number.isFinite(value) && value >= 0));
    return { profiles, mappings: parseMappings(root.mappings), macros: parseMacros(root.macros), preferences: parsePreferences(root.preferences), scores: scores as Record<string, number> };
  } catch { return defaultWorkspaces(); }
}
export function downloadJSON(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function readJSON(file: File, format: string): Promise<Record<string, unknown>> {
  if (file.size > 2_000_000) throw new Error('Choose a JSON file smaller than 2 MB.');
  const value = obj(JSON.parse(await file.text()));
  if (value.format !== format) throw new Error('This file uses a different format.');
  return value;
}
