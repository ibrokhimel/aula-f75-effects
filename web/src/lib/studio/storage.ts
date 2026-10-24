import { resolveAnimationParameters } from '../animations';
import { EFFECT_FAMILIES, defaultsFor, familyFor, type StudioSettings } from './catalog';

export const STUDIO_STORAGE_KEY = 'aula-f75.studio.v1';
export interface StudioPreset { id: string; name: string; settings: StudioSettings }
export interface StudioLibrary { favorites: string[]; presets: StudioPreset[] }

export function parseSettings(value: unknown): StudioSettings {
  if (!value || typeof value !== 'object') return defaultsFor();
  const raw = value as Record<string, unknown>;
  let family = familyFor(typeof raw.familyId === 'string' ? raw.familyId : 'aurora');
  if (raw.familyId === raw.variationId && !EFFECT_FAMILIES.some(item => item.id === raw.familyId)) {
    family = EFFECT_FAMILIES.find(item => item.variations.some(variation => variation.id === raw.variationId)) ?? family;
  }
  const moved: Record<string, string[]> = { aurora: ['nordic', 'moonlight'], ripple: ['doppler'], scanner: ['radar'], duotone: ['slowgradient'] };
  if (typeof raw.variationId === 'string' && moved[family.id]?.includes(raw.variationId)) {
    family = EFFECT_FAMILIES.find(item => item.variations.some(variation => variation.id === raw.variationId)) ?? family;
  }
  const settings = defaultsFor(family.id);
  if (family.variations.some((v) => v.id === raw.variationId)) settings.variationId = raw.variationId as string;
  for (const field of ['brightness'] as const) {
    const n = raw[field];
    if (typeof n === 'number' && Number.isFinite(n)) settings[field] = Math.max(0, Math.min(100, Math.round(n)));
  }
  const values = raw.parameters && typeof raw.parameters === 'object' && !Array.isArray(raw.parameters) ? raw.parameters : {};
  settings.parameters = resolveAnimationParameters(settings.variationId, values as Record<string, number>);
  // Migrate the first studio's percentage speed. Its frame-mirroring flag is retired.
  if (!raw.parameters && typeof raw.speed === 'number' && Number.isFinite(raw.speed) && 'rate' in settings.parameters) {
    settings.parameters = resolveAnimationParameters(settings.variationId, { ...settings.parameters, rate: raw.speed / 35 });
  }
  if (Array.isArray(raw.palette) && raw.palette.length === 4 && raw.palette.every((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c))) {
    settings.palette = [...raw.palette];
  }
  return settings;
}

export function parseLibrary(text: string | null): StudioLibrary {
  const empty: StudioLibrary = { favorites: [], presets: [] };
  if (!text) return empty;
  try {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object') return empty;
    const ids = new Set(EFFECT_FAMILIES.map((f) => f.id));
    const favorites: string[] = Array.isArray(raw.favorites)
      ? [...new Set<string>(raw.favorites.flatMap((id: unknown): string[] => {
        if (typeof id !== 'string') return [];
        if (ids.has(id)) return [id];
        const family = EFFECT_FAMILIES.find(item => item.variations.some(variation => variation.id === id));
        return family ? [family.id] : [];
      }))] : [];
    const used = new Set<string>();
    const presets: StudioPreset[] = Array.isArray(raw.presets) ? raw.presets.slice(0, 30).flatMap((item: unknown) => {
      if (!item || typeof item !== 'object') return [];
      const p = item as Record<string, unknown>;
      if (typeof p.id !== 'string' || p.id === 'daily-driver' || used.has(p.id) || typeof p.name !== 'string' || !p.name.trim()) return [];
      used.add(p.id);
      return [{ id: p.id.slice(0, 80), name: p.name.trim().slice(0, 48), settings: parseSettings(p.settings) }];
    }) : [];
    return { favorites, presets };
  } catch { return empty; }
}

export function loadLibrary(): StudioLibrary {
  try { return parseLibrary(localStorage.getItem(STUDIO_STORAGE_KEY)); }
  catch { return { favorites: [], presets: [] }; }
}

export function saveLibrary(library: StudioLibrary): boolean {
  try { localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(library)); return true; }
  catch { return false; }
}
