import { EFFECTS, encodeSpeedByte, decodeSpeedByte } from "./protocol";
import { readConfigRegion, writeConfigRegion } from "./f75";
import type { LogFn } from "./webhid";

export interface EffectOffsets { bright: number; speedColor: number }
export interface F75Layout {
  effectSelectOffset: number | null;
  effects: Record<number, EffectOffsets>;
  debounceOffset: number | null;
  sleepOffset: number | null;
  paletteColorOffset: number | null;
}

export const EFFECT_TABLE_BASE = 64; // Ripple (id 7) anchors at 78-79 → base = 78 - 7*2
const LAYOUT_KEY = "aula.f75.layout";

export function effectOffsetsFor(id: number): EffectOffsets {
  return { bright: EFFECT_TABLE_BASE + id * 2, speedColor: EFFECT_TABLE_BASE + id * 2 + 1 };
}

export function encodeBrightness(level: number): number {
  return Math.max(1, Math.min(9, 1 + Math.round(level) * 2));
}
export function decodeBrightness(b: number): number {
  return Math.max(0, Math.min(4, Math.round((b - 1) / 2)));
}

export function loadLayout(): F75Layout | null {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? JSON.parse(raw) as F75Layout : null;
  } catch { return null; }
}
export function saveLayout(l: F75Layout) { localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); }
export function clearLayout() { localStorage.removeItem(LAYOUT_KEY); }

export function diffOffsets(probes: Map<number, Uint8Array>): number[] {
  const values = [...probes.values()];
  if (values.length < 2) return [];
  const out: number[] = [];
  const n = values[0]!.length;
  for (let o = 0; o < n; o++) {
    const first = values[0]![o];
    if (values.slice(1).some(v => v[o] !== first)) out.push(o);
  }
  return out;
}

export function classifySelect(probes: Map<number, Uint8Array>): number | null {
  const entries = [...probes.entries()];
  if (entries.length < 2) return null;
  const n = entries[0]![1].length;
  for (let o = 0; o < n; o++) {
    const readbacks = entries.map(([, r]) => r[o]);
    const varied = new Set(readbacks).size >= 2;
    const rangeLimited = readbacks.every(rb => rb <= 18); // effect ids are 0-18
    const echoesId = entries.some(([v, r]) => r[o] === v);
    if (varied && rangeLimited && echoesId) return o;
  }
  return null;
}

export async function calibrate(device: HIDDevice, log: LogFn): Promise<F75Layout | null> {
  const baseline = await readConfigRegion(device, log);
  if (baseline === null) { log("Calibrate aborted: could not read config region"); return null; }

  const probes = new Map<number, Uint8Array>();
  for (const v of [1, 9, 18, 255]) {
    const region = new Uint8Array(baseline);
    region.fill(v);
    await writeConfigRegion(device, region, log);
    const rb = await readConfigRegion(device, log);
    if (rb) probes.set(v, rb);
  }
  await writeConfigRegion(device, baseline, log);

  const changed = diffOffsets(probes);
  log(`Calibrate: offsets responsive to writes: ${changed.join(",") || "(none)"}`);
  const select = classifySelect(probes);

  const layout: F75Layout = {
    effectSelectOffset: select,
    effects: Object.fromEntries(Object.keys(EFFECTS).map(
      (id) => [Number(id), effectOffsetsFor(Number(id))])),
    debounceOffset: select !== null ? select + 8 : null,
    sleepOffset: select !== null ? select + 9 : null,
    paletteColorOffset: null,
  };
  saveLayout(layout);
  log(`Calibrate: effect select offset = ${select ?? "unknown"}`);
  return layout;
}
