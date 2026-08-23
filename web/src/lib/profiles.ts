export interface Profile {
  id: string; name: string; createdAt: number;
  layers: { base: Uint8Array; fn: Uint8Array };
  colors: Record<number, [number, number, number]>;
  effect: { num: number; speed: number | null; brightness: number | null; colorful: boolean; color: string | null };
  sleepMinutes: number; debounceMs: number;
  raw: string;
  version?: 2;
  lighting?: number[];
}

const KEY = "aula-f75.profiles";

function store(): Storage {
  return globalThis.localStorage;
}

function toBytesArr(u: Uint8Array): number[] {
  return Array.from(u);
}

function toBytes(a: unknown): Uint8Array {
  if (a instanceof Uint8Array) return a;
  if (Array.isArray(a)) return Uint8Array.from(a);
  return new Uint8Array(0);
}

export function listProfiles(): Profile[] {
  try {
    const raw = store().getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown[];
    return arr.map((x) => {
      const p = x as Record<string, unknown>;
      const layers = p.layers as Record<string, unknown>;
      return {
        ...p,
        layers: {
          base: toBytes(layers.base),
          fn: toBytes(layers.fn),
        },
      } as unknown as Profile;
    });
  } catch {
    return [];
  }
}

export function saveProfile(p: Profile): void {
  const all = listProfiles().filter((x) => x.id !== p.id);
  all.push({ ...p, version: 2, layers: { base: toBytesArr(p.layers.base), fn: toBytesArr(p.layers.fn) } } as unknown as Profile);
  store().setItem(KEY, JSON.stringify(all));
}

export function deleteProfile(id: string): void {
  store().setItem(KEY, JSON.stringify(listProfiles().filter((x) => x.id !== id)));
}

export function loadProfile(id: string): Profile | null {
  return listProfiles().find((p) => p.id === id) ?? null;
}

// Browser-safe base64 (btoa/atob exist in Chromium and in Node 16+ for tests).
function bytesToB64(u: Uint8Array): string {
  let bin = "";
  for (const b of u) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function strToB64(s: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
}
function b64ToStr(s: string): string {
  return new TextDecoder().decode(b64ToBytes(s));
}

export function withLighting(profile: Profile, region: Uint8Array): Profile {
  return { ...profile, version: 2, lighting: Array.from(region) };
}

export function profileToBase64(p: Profile): string {
  return btoa(strToB64(JSON.stringify({
    version: 2,
    name: p.name, layers: { base: bytesToB64(p.layers.base), fn: bytesToB64(p.layers.fn) },
    colors: p.colors, effect: p.effect, sleepMinutes: p.sleepMinutes, debounceMs: p.debounceMs,
    lighting: p.lighting,
  })));
}

export function profileFromBase64(s: string): Profile {
  const o = JSON.parse(b64ToStr(atob(s)));
  return {
    id: `imp-${Date.now()}`, name: o.name, createdAt: Date.now(),
    version: 2,
    layers: { base: b64ToBytes(o.layers.base), fn: b64ToBytes(o.layers.fn) },
    colors: o.colors ?? {}, effect: o.effect ?? { num: 0, speed: null, brightness: null, colorful: false, color: null },
    sleepMinutes: o.sleepMinutes ?? 0, debounceMs: o.debounceMs ?? 2, raw: s,
    lighting: Array.isArray(o.lighting) ? o.lighting : undefined,
  };
}