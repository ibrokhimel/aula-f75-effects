import { EFFECTS, encodeSpeedByte, decodeSpeedByte } from "./protocol";
import { readConfigRegion, writeConfigRegion, readColorTable, writeColorTable } from "./f75";
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
// Live-hardware confirmed (2026-08-19 knob probe): offset 10 tracked every
// knob-cycled effect (2→3→4→5) while the visible effect changed; byte 12
// stayed frozen and is NOT the select.
export const DEFAULT_EFFECT_SELECT_OFFSET = 10;
const LAYOUT_KEY = "aula.f75.layout";
const SNAPSHOT_KEY = "aula.f75.snapshot";

interface ConfigSnapshot { region: number[]; colors: number[] | null; ts: number }

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

export function diffSamples(samples: Uint8Array[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  if (samples.length < 2) return out;
  const n = samples[0]!.length;
  for (let o = 0; o < n; o++) {
    if (!samples.slice(1).some(s => s[o] !== samples[0]![o])) continue;
    out.set(o, samples.map(s => s[o]));
  }
  return out;
}

export function selectCandidatesFromDiff(diff: Map<number, number[]>): number[] {
  return [...diff.entries()]
    .filter(([, vals]) => vals.every(v => v <= 18) && new Set(vals).size >= 2)
    .map(([o]) => o)
    .sort((a, b) => a - b);
}

function defaultLayout(): F75Layout {
  return {
    effectSelectOffset: DEFAULT_EFFECT_SELECT_OFFSET,
    effects: Object.fromEntries(Object.keys(EFFECTS).map(
      (id) => [Number(id), effectOffsetsFor(Number(id))])),
    debounceOffset: null,
    sleepOffset: null,
    paletteColorOffset: null,
  };
}

/**
 * Find the effect-select byte with ZERO writes: the user cycles effects on
 * the keyboard itself (knob short-press or Fn light-mode shortcut) while we
 * take config-region snapshots; the offset that tracks the visible effect
 * (values always 0-18) is the select byte. Write-probes caused USB resets,
 * so this is the safe path.
 */
export async function probeSelectViaKnob(device: HIDDevice, log: LogFn): Promise<number | null> {
  log("Read-only select probe — no bytes are written to the keyboard.");
  const samples: Uint8Array[] = [];
  for (let round = 0; round < 4; round++) {
    if (round > 0) {
      log(`Round ${round}/3: switch to the NEXT effect on the keyboard now (knob short-press / Fn light-mode key)...`);
      await new Promise((r) => setTimeout(r, 7000));
    }
    const s = await readConfigRegion(device, log);
    if (s === null) { log("Probe aborted: config region read failed"); return null; }
    samples.push(s);
  }

  const diff = diffSamples(samples);
  const offsets = [...diff.keys()].sort((a, b) => a - b);
  for (const o of offsets) log(`  offset ${o}: ${diff.get(o)!.join(" → ")}`);
  const cands = selectCandidatesFromDiff(diff).filter(o => o < EFFECT_TABLE_BASE);
  log(`Probe: changed offsets ${offsets.join(",") || "(none)"}`);
  log(`Probe: effect-select candidates ${cands.join(",") || "(none)"}`);

  if (cands.length !== 1) {
    log(cands.length === 0
      ? "No candidate — make sure the VISIBLE effect actually changes between rounds, then re-run."
      : "Multiple candidates — re-run and cycle through more distinct effects.");
    return null;
  }

  const layout = loadLayout() ?? defaultLayout();
  layout.effectSelectOffset = cands[0]!;
  saveLayout(layout);
  log(`✓ Saved effect-select offset = ${cands[0]} — setEffect can now switch effects.`);
  return cands[0];
}

export function loadSnapshot(): ConfigSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) as ConfigSnapshot : null;
  } catch { return null; }
}

/**
 * Save the keyboard's current config region (and color table, best-effort)
 * as the "defaults" snapshot. Everything the app tweaks on this keyboard
 * (effects, brightness, speed, layout probes) is written through the config
 * region, so restoring this snapshot undoes all of those tweaks.
 */
export async function snapshotConfig(device: HIDDevice, log: LogFn): Promise<boolean> {
  const region = await readConfigRegion(device, log);
  if (region === null) { log("Snapshot failed: could not read config region"); return false; }

  let colors: number[] | null = null;
  try {
    const t = await readColorTable(device, log);
    if (t) colors = Array.from(t);
  } catch { /* optional — color table snapshot is best-effort */ }

  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
    region: Array.from(region), colors, ts: Date.now(),
  } satisfies ConfigSnapshot));
  log(`Snapshot saved: config region (128B)${colors ? ` + color table (${colors.length}B)` : ""} at ${new Date().toLocaleTimeString("en", { hour12: false })}.`);
  return true;
}

/**
 * Restore the config region (and color table, best-effort) from the last
 * snapshot. This is the safe way to undo every tweak made through the
 * config region, without zeroing unknown control bytes the way the crude
 * factory-reset path does.
 */
export async function restoreSnapshot(device: HIDDevice, log: LogFn): Promise<boolean> {
  const snap = loadSnapshot();
  if (!snap?.region) { log("Restore failed: no snapshot saved yet. Click \"Snapshot defaults\" first."); return false; }

  await writeConfigRegion(device, Uint8Array.from(snap.region), log);
  log("Config region restored from snapshot.");

  if (snap.colors) {
    try {
      await writeColorTable(device, Uint8Array.from(snap.colors), log);
      log("Color table restored from snapshot.");
    } catch (err: unknown) {
      log(`WARN: color table restore failed (${err instanceof Error ? err.message : String(err)}) — config region is still restored.`);
    }
  }
  log("✓ Snapshot restore complete.");
  return true;
}
