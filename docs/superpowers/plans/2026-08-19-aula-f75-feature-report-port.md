# AULA F75 Wired Lighting Port (Feature-Report 0x06) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken F87 output-report-`0x13` lighting layer for the wired F75 (`258A:010C`) with the verified 520-byte feature-report-`0x06` protocol, keeping the wireless dongle path unchanged.

**Architecture:** New transport module (`web/src/lib/f75.ts`) speaks the device's real protocol (SET-then-GET feature reads, region writes). A layout layer (`web/src/lib/f75-layout.ts`) maps the flat 128-byte config region to UI semantics, defaulted from known anchors and refined by a write-then-read-back calibration probe whose pure diff core is unit-tested. Existing high-level operations in `webhid.ts` dispatch by PID (`isFeatureTransport`), so the UI and hooks stay stable. Raw-dump/calibrate buttons are added to the existing Raw HID section.

**Tech Stack:** TypeScript, Next.js (App Router), WebHID (`navigator.hid`), vitest. Tests run with `bun test` (vitest) in `web/`.

**Spec:** `docs/superpowers/specs/2026-08-19-aula-f75-feature-report-port-design.md`

## Global Constraints

- Wiring is per-PID: wired `258A:010C` uses feature reports; dongle `3554:FA09` keeps output report `0x13`.
- Feature-report 0x06 frames are 520 bytes total; WebHID's `sendFeatureReport`/`receiveFeatureReport` strip/add the report-id byte, so on-wire buffers are built as 520 bytes with byte 0 = `0x06` and `frame.slice(1)` is transmitted.
- Reads require **SET_FEATURE(read request) then GET_FEATURE**; a bare GET returns noise — never call `receiveFeatureReport` without a preceding `sendFeature`.
- Config region: address bytes `[0x00, 0x00, 0x01, 0x00]`, length `0x0080` (128 bytes) encoded little-endian in header bytes 6-7 (`0x80 0x00`). Color table: length `0x0200` (512 bytes).
- Effect `speed|color` byte = `(speed << 4) | color`; brightness `0x09`=full, `0x01`=dim. Ripple (effect id 7) pair anchors at region offsets 78-79.
- Region writes are **read-modify-write** on the live region — never blind templates except explicit factory reset.
- No comments unless the surrounding file's style has them; no new external dependencies.
- Lint/typecheck: `nix shell nixpkgs#bun -c bunx tsc --noEmit` and `bun test` from `web/` must pass after every task.

---

### Task 1: Feature-report transport module (`f75.ts`)

Foundation of the whole port — frame construction, SET-then-GET reads, config/color wrappers. No UI, no dispatch yet.

**Files:**
- Create: `web/src/lib/f75.ts`
- Create: `web/src/lib/f75.test.ts`

**Interfaces:**
- Consumes: `hex` from `web/src/lib/protocol.ts`; `DIRECT_NUM_LEDS` from `web/src/lib/direct-mode.ts` (not needed in this task — keep imports minimal).
- Produces: `FEATURE_REPORT_ID`, `CMD_WRITE_REGION`, `CMD_READ_REGION`, `CMD_WRITE_COLORS`, `CMD_READ_COLORS`, `CFG_ADDR`, `CFG_LEN`, `COLOR_LEN`, `REPORT_SIZE`, `HEADER_SIZE`, `buildFrame(cmd, addr, len)`, `extractData(report, len, offset?)`, `sendFeature(device, frame, log)`, `readRegion(device, cmd, addr, len, log, timeoutMs?)`, `readConfigRegion(device, log, retries?)`, `writeConfigRegion(device, data128, log)`, `readColorTable(device, log)`, `writeColorTable(device, data512, log)`.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/f75.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { buildFrame, extractData, readConfigRegion, writeConfigRegion, readRegion } from "./f75";
import { FEATURE_REPORT_ID, CMD_READ_REGION, CMD_WRITE_REGION, CFG_LEN } from "./f75";

class FakeDevice {
  opened = true;
  sent: Array<[number, Uint8Array, string?]> = [];
  replies: Uint8Array[] = [];
  async sendFeatureReport(id: number, data: Uint8Array) { this.sent.push([id, data]); }
  async receiveFeatureReport(): Promise<DataView> {
    const full = new Uint8Array(520);
    if (this.replies.length > 0) full.set(this.replies.shift()!, 0);
    return new DataView(full.buffer);
  }
  async close() {}
}
type FakeHID = FakeDevice & HIDDevice;
const log = vi.fn();

describe("buildFrame", () => {
  it("lays out header bytes 0x06 cmd addr len", () => {
    const f = buildFrame(CMD_READ_REGION, [0x00, 0x00, 0x01, 0x00], CFG_LEN);
    expect(f).toHaveLength(520);
    expect(f[0]).toBe(0x06);
    expect(f[1]).toBe(0x84);
    expect(f[2]).toBe(0x00); expect(f[3]).toBe(0x00); expect(f[4]).toBe(0x01); expect(f[5]).toBe(0x00);
    expect(f[6]).toBe(0x80); expect(f[7]).toBe(0x00); // len little-endian
    expect(f[8]).toBe(0x00); expect(f[519]).toBe(0x00);
  });
});

describe("extractData", () => {
  it("slices payload after the 8-byte header", () => {
    const r = new Uint8Array(520);
    for (let i = 8; i < 136; i++) r[i] = i;
    const d = extractData(r, 128);
    expect(d).toHaveLength(128);
    expect(d[0]).toBe(8); expect(d[127]).toBe(135);
  });
});

describe("readConfigRegion", () => {
  it("sends a 0x84 read request then strips payload to 128 bytes", async () => {
    const d = new FakeDevice() as unknown as FakeHID;
    const reply = new Uint8Array(520);
    for (let i = 0; i < 128; i++) reply[8 + i] = 0xA0 + i;
    d.replies.push(reply);
    const out = await readConfigRegion(d, log);
    expect(d.sent).toHaveLength(1);
    expect(d.sent[0][0]).toBe(FEATURE_REPORT_ID);
    expect(d.sent[0][1][1]).toBe(CMD_READ_REGION);
    expect(out).not.toBeNull();
    expect(out![0]).toBe(0xA0); expect(out![127]).toBe(0xA0 + 127);
  });
});

describe("writeConfigRegion", () => {
  it("writes cmd 0x04 with the payload at offset 8", async () => {
    const d = new FakeDevice() as unknown as FakeHID;
    const data = new Uint8Array(128);
    data[0] = 0x11; data[127] = 0x22;
    await writeConfigRegion(d, data, log);
    const [id, body] = d.sent[0];
    expect(id).toBe(FEATURE_REPORT_ID);
    expect(body[0]).toBe(CMD_WRITE_REGION);
    expect(body[7]).toBe(0x11); // payload offset 8 → index 7 after slicing
    expect(body[126]).toBe(0x22);
  });
});

describe("readRegion", () => {
  it("timeouts without a preceding receive hang when no reply arrives", async () => {
    const d = new FakeDevice() as unknown as FakeHID; // replies never resolves quickly
    const out = await readRegion(d, CMD_READ_REGION, [0, 0, 1, 0], CFG_LEN, log, 50);
    expect(out).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `nix shell nixpkgs#bun -c bun test src/lib/f75.test.ts` (from `web/`)
Expected: FAIL — module `./f75` not found.

- [ ] **Step 3: Implement `web/src/lib/f75.ts`**

```ts
import { hex } from "./protocol";
import type { LogFn } from "./webhid";

export const FEATURE_REPORT_ID = 0x06;
export const CMD_WRITE_REGION = 0x04;
export const CMD_READ_REGION = 0x84;
export const CMD_WRITE_COLORS = 0x0a;
export const CMD_READ_COLORS = 0x8a;
export const CFG_ADDR = [0x00, 0x00, 0x01, 0x00];
export const CFG_LEN = 0x0080;
export const COLOR_LEN = 0x0200;
export const REPORT_SIZE = 520;
export const HEADER_SIZE = 8;

export function buildFrame(cmd: number, addr: number[], len: number): Uint8Array {
  const f = new Uint8Array(REPORT_SIZE);
  f[0] = FEATURE_REPORT_ID;
  f[1] = cmd;
  for (let i = 0; i < 4; i++) f[2 + i] = addr[i] ?? 0;
  f[6] = len & 0xff;
  f[7] = (len >> 8) & 0xff;
  return f;
}

export function extractData(report: Uint8Array, len: number, offset = HEADER_SIZE): Uint8Array {
  return report.slice(offset, offset + len);
}

export async function sendFeature(device: HIDDevice, frame: Uint8Array, log: LogFn) {
  await device.sendFeatureReport(FEATURE_REPORT_ID, frame.slice(1));
  log(`TX-FEATURE 0x06: ${hex(frame)}`);
}

export async function readRegion(
  device: HIDDevice, cmd: number, addr: number[], len: number, log: LogFn, timeoutMs = 800,
): Promise<Uint8Array | null> {
  await sendFeature(device, buildFrame(cmd, addr, len), log);
  try {
    const view = await withTimeout(device.receiveFeatureReport(FEATURE_REPORT_ID), timeoutMs);
    const full = new Uint8Array(REPORT_SIZE);
    new Uint8Array(view.buffer).forEach((b, i) => { if (i < REPORT_SIZE) full[i] = b; });
    log(`RX-FEATURE: ${hex(full)}`);
    return full;
  } catch {
    log("RX-FEATURE: (no reply)");
    return null;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function retry<T>(fn: () => Promise<T | null>, retries: number, log: LogFn, label: string): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    const r = await fn();
    if (r !== null) return r;
    if (i < retries - 1) { log(`  Retrying ${label} (${i + 2}/${retries})...`); await new Promise(r2 => setTimeout(r2, 150)); }
  }
  return null;
}

export async function readConfigRegion(device: HIDDevice, log: LogFn, retries = 3): Promise<Uint8Array | null> {
  const report = await retry(
    () => readRegion(device, CMD_READ_REGION, CFG_ADDR, CFG_LEN, log, 800),
    retries, log, "config read",
  );
  if (report === null) return null;
  const data = extractData(report, CFG_LEN);
  log(`Config region: ${hex(data)}`);
  return data;
}

export async function writeConfigRegion(device: HIDDevice, data: Uint8Array, log: LogFn) {
  const frame = buildFrame(CMD_WRITE_REGION, CFG_ADDR, CFG_LEN);
  frame.set(data, HEADER_SIZE);
  await sendFeature(device, frame, log);
}

export async function readColorTable(device: HIDDevice, log: LogFn): Promise<Uint8Array | null> {
  const report = await readRegion(device, CMD_READ_COLORS, CFG_ADDR, COLOR_LEN, log, 800);
  if (report === null) return null;
  const data = extractData(report, COLOR_LEN);
  log(`Color table: ${hex(data)}`);
  return data;
}

export async function writeColorTable(device: HIDDevice, data: Uint8Array, log: LogFn) {
  const frame = buildFrame(CMD_WRITE_COLORS, CFG_ADDR, COLOR_LEN);
  frame.set(data, HEADER_SIZE);
  await sendFeature(device, frame, log);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `nix shell nixpkgs#bun -c bun test src/lib/f75.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck**

Run: `nix shell nixpkgs#bun -c bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/f75.ts web/src/lib/f75.test.ts
git commit -m "feat(f75): feature-report 0x06 transport (region + color table)"
```

---

### Task 2: Transport dispatch and connect diagnostics

Decides per-PID which protocol runs, and makes the connect screen tell the user when they picked the wrong interface.

**Files:**
- Modify: `web/src/lib/f75.ts`
- Modify: `web/src/hooks/useKeyboard.ts`

**Interfaces:**
- Consumes: `WIRED_PID`, `WIRELESS_PID` from `web/src/lib/protocol.ts`.
- Produces: `isFeatureTransport(pid: number): boolean` — `false` for `WIRELESS_PID`, `true` otherwise.

- [ ] **Step 1: Write the failing tests**

Add to `web/src/lib/f75.test.ts`:

```ts
import { isFeatureTransport } from "./f75";
import { WIRED_PID, WIRELESS_PID } from "./protocol";

describe("isFeatureTransport", () => {
  it("routes the wired F75 to feature reports and the dongle to output 0x13", () => {
    expect(isFeatureTransport(WIRED_PID)).toBe(true);
    expect(isFeatureTransport(WIRELESS_PID)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `nix shell nixpkgs#bun -c bun test src/lib/f75.test.ts`
Expected: FAIL — `isFeatureTransport is not a function`.

- [ ] **Step 3: Implement**

Add to `web/src/lib/f75.ts`:

```ts
import { WIRELESS_PID } from "./protocol";

export function isFeatureTransport(pid: number): boolean {
  return pid !== WIRELESS_PID;
}
```

Update the connect diagnostics in `web/src/hooks/useKeyboard.ts`. Replace the `0x13` check (`has13` block, lines ~77-81) with a feature-report check:

```ts
const hasFeature06 = dev.collections.some(c => (c.featureReports ?? []).some(r => (r.reportId ?? 0) === 0x06));
if (!hasFeature06) {
  log('WARNING: no collection exposes feature report 0x06 — pick the vendor interface (the second device entry), not the plain keyboard one.');
  setStatus('⚠ Wrong interface — reconnect and pick the vendor collection');
}
```

Remove the now-unused `REPORT_ID` import from `useKeyboard.ts` if it is no longer referenced.

- [ ] **Step 4: Run tests to verify they pass**

Run: `nix shell nixpkgs#bun -c bun test src/lib/f75.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and lint**

Run: `nix shell nixpkgs#bun -c bunx tsc --noEmit` then `nix shell nixpkgs#bun -c bun run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/f75.ts web/src/lib/f75.test.ts web/src/hooks/useKeyboard.ts
git commit -m "feat(f75): per-PID transport dispatch + feature-report connect check"
```

---

### Task 3: Config-region layout layer (`f75-layout.ts`)

Statically-known anchors plus a write-then-read-back calibration whose pure diff/echo primitives are unit-tested. The orchestrator needs real hardware; the pure core does not.

**Files:**
- Create: `web/src/lib/f75-layout.ts`
- Create: `web/src/lib/f75-layout.test.ts`

**Interfaces:**
- Consumes: `encodeSpeedByte`/`decodeSpeedByte` from `web/src/lib/protocol.ts`; `readConfigRegion`/`writeConfigRegion` from `web/src/lib/f75.ts`; `EFFECTS` from `web/src/lib/protocol.ts`.
- Produces: `interface EffectOffsets { bright: number; speedColor: number }`, `interface F75Layout { effectSelectOffset: number | null; effects: Record<number, EffectOffsets>; debounceOffset: number | null; sleepOffset: number | null; paletteColorOffset: number | null }`, `EFFECT_TABLE_BASE`, `effectOffsetsFor(id: number): EffectOffsets`, `encodeBrightness(level: number): number`, `decodeBrightness(b: number): number`, `loadLayout()/saveLayout()/clearLayout()`, `diffOffsets(probes: Map<number, Uint8Array>): number[]`, `classifySelect(probes: Map<number, Uint8Array>): number | null`, `calibrate(device: HIDDevice, log: LogFn): Promise<F75Layout | null>`.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/f75-layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { effectOffsetsFor, encodeBrightness, decodeBrightness, diffOffsets, classifySelect } from "./f75-layout";

describe("effectOffsetsFor", () => {
  it("places Ripple (id 7) at offsets 78-79 from the default table base", () => {
    expect(effectOffsetsFor(7)).toEqual({ bright: 78, speedColor: 79 });
  });
  it("is monotonic in id", () => {
    expect(effectOffsetsFor(3).bright).toBeLessThan(effectOffsetsFor(7).bright);
  });
});

describe("brightness encoding", () => {
  it("maps levels 0-4 to bytes 1,3,5,7,9 and back", () => {
    for (let lvl = 0; lvl <= 4; lvl++) expect(decodeBrightness(encodeBrightness(lvl))).toBe(lvl);
    expect(encodeBrightness(4)).toBe(9);
    expect(encodeBrightness(0)).toBe(1);
  });
});

describe("diffOffsets", () => {
  it("returns offsets that changed across probe readings", () => {
    const a = new Uint8Array(8); const b = new Uint8Array(8);
    a[3] = 1; b[3] = 2; b[5] = 9;
    expect(diffOffsets(new Map([[1, a], [2, b]]))).toEqual([3, 5]);
  });
});

describe("classifySelect", () => {
  it("finds the offset that echoes the written effect id", () => {
    const probes = new Map<number, Uint8Array>();
    for (const id of [1, 9, 18]) {
      const r = new Uint8Array(16); r[15] = id; probes.set(id, r);
    }
    expect(classifySelect(probes)).toBe(15);
  });
  it("returns null when no offset echoes all values", () => {
    const probes = new Map<number, Uint8Array>();
    for (const id of [1, 9, 18]) { const r = new Uint8Array(16); r[15] = id + 5; probes.set(id, r); }
    expect(classifySelect(probes)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `nix shell nixpkgs#bun -c bun test src/lib/f75-layout.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `web/src/lib/f75-layout.ts`**

```ts
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
  if (entries.length === 0) return null;
  const n = entries[0]![1].length;
  for (let o = 0; o < n; o++) {
    if (entries.every(([id, r]) => r[o] === id)) return o;
  }
  return null;
}

export async function calibrate(device: HIDDevice, log: LogFn): Promise<F75Layout | null> {
  const baseline = await readConfigRegion(device, log);
  if (baseline === null) { log("Calibrate aborted: could not read config region"); return null; }

  const probes = new Map<number, Uint8Array>();
  for (const v of [1, 4, 9, 18]) {
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
```

Note: `debounceOffset`/`sleepOffset` above are provisional (best-effort, adjacent-guess) and only meaningful if their region response behaves differently; the `diffOffsets` output plus the raw dump (Task 6) is the ground truth used to refine them. This is intentional and flagged in the spec.

- [ ] **Step 4: Run tests to verify they pass**

Run: `nix shell nixpkgs#bun -c bun test src/lib/f75-layout.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck**

Run: `nix shell nixpkgs#bun -c bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/f75-layout.ts web/src/lib/f75-layout.test.ts
git commit -m "feat(f75): config-region layout layer with calibration core"
```

---

### Task 4: Rewire lighting operations in `webhid.ts` (feature branch)

Dispatch each lighting operation to the feature branch when `isFeatureTransport(device.productId)`, keep the existing output-`0x13` code as the wireless branch, update the one call-site whose contract changed.

**Files:**
- Modify: `web/src/lib/webhid.ts`
- Modify: `web/src/hooks/useKeyboard.ts`
- Modify: `web/src/lib/deviceinfo.ts`
- Test: `web/src/lib/f75-op.test.ts` (new)

**Interfaces:**
- Consumes: `isFeatureTransport`, `readConfigRegion`, `writeConfigRegion`, `readColorTable`, `writeColorTable` from `./f75`; `loadLayout`, `effectOffsetsFor`, `encodeBrightness`, `classifySelect` from `./f75-layout`; existing `EFFECTS`, `encodeSpeedByte`, `decodeSpeedByte`, `SELF_DEFINE_EFFECT` from `./protocol`.
- Produces (unchanged signatures except `readConfig`):
  - `readConfig(device, log, retries?)` now returns `Uint8Array | null` (the 128-byte region) on the feature branch; the wireless branch keeps returning the 10-frame array.
  - `setEffect(device, effectNum, opts, log)`, `applyPerKey(device, keyColors, log)`, `setSleepTimer(device, minutes, log)`, `setDebounce(device, level, log)`, `factoryReset(device, log)` — feature branch inside each, keys off `device.productId`.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/f75-op.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { setSleepTimer, setDebounce } from "./webhid";
import { isFeatureTransport } from "./f75";
import { WIRED_PID } from "./protocol";

class FakeFeatureDevice {
  productId = WIRED_PID;
  opened = true;
  region = new Uint8Array(128);
  writes: Uint8Array[] = [];
  async sendFeatureReport(id: number, data: Uint8Array) {
    // mirror webhid feature branch: region byte edits, then writeConfigRegion
    const frame = new Uint8Array(520); frame[0] = 0x06; frame.set(data, 1); this.writes.push(frame);
    for (let i = 0; i < 128; i++) this.region[i] = frame[8 + i];
  }
  async receiveFeatureReport(): Promise<DataView> {
    const f = new Uint8Array(520); f[0] = 0x06; f.set(this.region, 8);
    return new DataView(f.buffer);
  }
}
type FH = FakeFeatureDevice & HIDDevice;
const log = vi.fn();

describe("feature branch dispatch", () => {
  it("routes wired PID operations to feature reports", async () => {
    expect(isFeatureTransport(WIRED_PID)).toBe(true);
    const d = new FakeFeatureDevice();
    d.region[80] = 7;
    await setSleepTimer(d as unknown as FH, 3, log);
    await setDebounce(d as unknown as FH, 2, log);
    const sent = d.writes.flatMap(f => [f[1]]);
    expect(sent.every(cmd => cmd === 0x04)).toBe(true); // writes only, no output 0x13 saves
  });
});
```

(If `setSleepTimer`/`setDebounce` temporarily don't exist in the feature branch, the test fails on "not connected"/unknown behavior — see Step 3.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `nix shell nixpkgs#bun -c bun test src/lib/f75-op.test.ts`
Expected: FAIL — feature branch not implemented (e.g. no sendFeatureReport calls emitted).

- [ ] **Step 3: Implement the feature branches in `web/webhid.ts`**

Add at the top a helper:

```ts
import { isFeatureTransport, readConfigRegion, writeConfigRegion, readColorTable, writeColorTable } from "./f75";
import { loadLayout, effectOffsetsFor, encodeBrightness, classifySelect } from "./f75-layout";

async function readRegionMapped(device: HIDDevice, log: LogFn): Promise<Uint8Array | null> {
  return readConfigRegion(device, log);
}
```

**`readConfig`** — keep the existing 10-frame implementation as the wireless branch, but at the top:

```ts
if (isFeatureTransport(device.productId)) {
  return readConfigRegion(device, log, retries); // Uint8Array | null (128 bytes)
}
```

**`setSleepTimer`** — at the top:

```ts
if (isFeatureTransport(device.productId)) {
  const region = await readConfigRegion(device, log);
  if (!region) { log("ERROR: could not read config region"); return; }
  const layout = loadLayout();
  const wake = layout?.sleepOffset ?? (classifySelect(new Map(await probe(device, [8, 10, 20], log))) as number | null);
  // provisional: see calibrate() — the real offset comes from calibration
  const off = layout?.sleepOffset ?? 80;
  const value = Math.min(0xff, Math.round(minutes * 2));
  region[off] = value;
  await writeConfigRegion(device, region, log);
  log(`✓ Sleep timer set to ${label} (region offset 0x${off.toString(16)})\n`);
  return;
}
```

Keep the sleep helper label logic and the wireless branch underneath unchanged. (The `probe` helper is optional; the provisional `off = 80` reflects `EFFECT_TABLE_BASE + 8` and is refined by calibration — see Task 5.)

**`setDebounce`** — analogous feature branch: region read, set `region[debounceOffset || (EFFECT_TABLE_BASE + 9)] = level - 1`, write, log. Wireless branch unchanged.

**`setEffect`** — feature branch at top:

```ts
if (isFeatureTransport(device.productId)) {
  const eff = EFFECTS[effectNum];
  if (!eff) { log(`Unknown effect ${effectNum}`); return; }
  if (effectNum === SELF_DEFINE_EFFECT) { log("Self-define is per-key mode. Use the Per-Key tab."); return; }

  const layout = loadLayout();
  const sel = layout?.effectSelectOffset ?? null;
  const offs = effectOffsetsFor(effectNum);
  const region = await readConfigRegion(device, log);
  if (!region) { log("ERROR: could not read config region"); return; }

  const desc = `── Setting #${effectNum}: ${effectNum === 0 ? 'OFF' : eff.name}`;
  if (opts.brightness !== null && opts.brightness !== undefined) desc += `  bright=${opts.brightness}`;
  if (opts.speed !== null && opts.speed !== undefined) desc += `  speed=${opts.speed}`;
  if (opts.colorful) desc += '  [colorful]';
  log(desc + ' ──');

  if (sel !== null) region[sel] = effectNum;
  const curPair = decodeSpeedByte(region[offs.speedColor]);
  if (opts.brightness !== null && opts.brightness !== undefined) region[offs.bright] = encodeBrightness(opts.brightness);
  region[offs.speedColor] = opts.colorful
    ? encodeSpeedByte(opts.speed ?? curPair.speed, true)
    : (opts.speed !== null && opts.speed !== undefined ? encodeSpeedByte(opts.speed, !!opts.colorRgb) : region[offs.speedColor]);
  await writeConfigRegion(device, region, log);
  log(`✓ ${eff.name} active!\n`);
  return;
}
```

**`applyPerKey`** — feature branch at top:

```ts
if (isFeatureTransport(device.productId)) {
  log("── Applying per-key colors (feature transport) ──");
  const region = await readConfigRegion(device, log);
  if (!region) { log("ERROR: could not read config region"); return; }
  const layout = loadLayout();
  const sel = layout?.effectSelectOffset;
  if (sel !== null) { region[sel] = SELF_DEFINE_EFFECT; await writeConfigRegion(device, region, log); }
  const table = new Uint8Array(512);
  for (const [idx, rgb] of Object.entries(keyColors)) {
    const i = parseInt(idx);
    if (i >= 0 && i < 128) { table[i * 4] = rgb[0]; table[i * 4 + 1] = rgb[1]; table[i * 4 + 2] = rgb[2]; }
  }
  await writeColorTable(device, table, log);
  log(`✓ Per-key colors written (${Object.keys(keyColors).length} keys). If LEDs don't refresh, use the live per-key stream (direct mode).\n`);
  return;
}
```

**`factoryReset`** — feature branch:

```ts
if (isFeatureTransport(device.productId)) {
  log("── Factory resetting lighting config ──");
  const region = new Uint8Array(128);
  for (let id = 0; id < 19; id++) {
    const offs = effectOffsetsFor(id);
    region[offs.bright] = 9;
    region[offs.speedColor] = (id === 0 ? 0 : 0x47);
  }
  await writeConfigRegion(device, region, log);
  log("✓ Factory config baseline written (effect table).\n");
  return;
}
```

Keep the original implementations as the wireless branch (wrap in `if (!isFeatureTransport(device.productId)) { ... }` or early-return as above).

- [ ] **Step 4: Update the one contract-breaking call-site**

In `web/src/hooks/useKeyboard.ts` `doReadConfig`:

```ts
const frame = await readConfig(device, log, 3); // now Uint8Array | null on wired
const n = frame instanceof Uint8Array ? 1 : (frame?.filter(f => f !== null).length ?? 0);
log(`Config read: ${n}${frame instanceof Uint8Array ? ' region (128 bytes)' : '/10 frames'}`);
return n;
```

Also update `web/src/lib/deviceinfo.ts` `parseConfigFrames` is only used for the wireless shape — leave it; add a `regionLabel` helper is not needed.

- [ ] **Step 5: Run tests to verify they pass**

Run: `nix shell nixpkgs#bun -c bun test`
Expected: PASS (all existing + new).

- [ ] **Step 6: Typecheck and lint**

Run: `nix shell nixpkgs#bun -c bunx tsc --noEmit` and `nix shell nixpkgs#bun -c bun run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/webhid.ts web/src/hooks/useKeyboard.ts web/src/lib/deviceinfo.ts web/src/lib/f75-op.test.ts
git commit -m "feat(f75): feature-report branches for lighting/settings ops"
```

---

### Task 5: Calibration hookup

Surface the calibration + dump utilities in the UI (existing Raw HID section of `MacrosPanel`) so layout discovery runs on real hardware and the resulting map is stored.

**Files:**
- Modify: `web/src/hooks/useKeyboard.ts`
- Modify: `web/src/components/MacrosPanel.tsx`

**Interfaces:**
- Consumes: `calibrate`, `readConfigRegion` (from `f75.ts`), `readColorTable` (from `f75.ts`), `clearLayout` (from `f75-layout.ts`).
- Produces: hook callbacks `doDumpConfig`, `doDumpColors`, `doCalibrate`, `doClearLayout`.

- [ ] **Step 1: Add hook callbacks**

In `web/src/hooks/useKeyboard.ts` add (mirroring `doReadConfig`):

```ts
const doDumpConfig = useCallback(async () => {
  if (!device?.opened) { log("Not connected!"); return; }
  try {
    if (!isFeatureTransport(device.productId)) { log("Dump config is wired-only."); return; }
    const r = await readConfigRegion(device, log);
    log(r ? `Config region (128B): ${Array.from(r).map(b => b.toString(16).padStart(2, "0")).join(" ")}` : "Dump failed");
  } catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
}, [device, log]);
```

```ts
const doDumpColors = useCallback(async () => {
  if (!device?.opened) { log("Not connected!"); return; }
  try {
    if (!isFeatureTransport(device.productId)) { log("Dump color table is wired-only."); return; }
    const t = await readColorTable(device, log);
    log(t ? `Color table (512B): ${Array.from(t).map(b => b.toString(16).padStart(2, "0")).join(" ")}` : "Dump failed");
  } catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
}, [device, log]);
```

```ts
const doCalibrate = useCallback(async () => {
  if (!device?.opened) { log("Not connected!"); return; }
  try {
    if (!isFeatureTransport(device.productId)) { log("Calibration is wired-only."); return; }
    await calibrate(device, log);
  } catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
}, [device, log]);
```

```ts
const doClearLayout = useCallback(() => {
  clearLayout();
  log("Calibrated layout map cleared.");
}, [log]);
```

Add all four to the returned object and the destructuring call sites.

- [ ] **Step 2: Add buttons to `MacrosPanel.tsx`**

In the Raw HID (debug) `<section>`, next to the existing "Send 20-byte frame" button, add:

```tsx
<button onClick={onDumpConfig} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300">Dump config region</button>
<button onClick={onDumpColors} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300">Dump color table</button>
<button onClick={onCalibrate} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300">Calibrate layout</button>
<button onClick={onClearLayout} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300">Clear layout map</button>
```

Thread the callbacks through the panel's props (the panel already receives `device` and `log`; add `onDumpConfig`, `onDumpColors`, `onCalibrate`, `onClearLayout`).

- [ ] **Step 3: Typecheck and lint**

Run: `nix shell nixpkgs#bun -c bunx tsc --noEmit` and `nix shell nixpkgs#bun -c bun run lint`
Expected: clean.

- [ ] **Step 4: Run full test suite**

Run: `nix shell nixpkgs#bun -c bun test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useKeyboard.ts web/src/components/MacrosPanel.tsx
git commit -m "feat(f75): config/color dump + layout calibration UI"
```

---

### Task 6: Documentation

Update the protocol reference so the wiring matches reality.

**Files:**
- Modify: `docs/PROTOCOL.md`
- Modify: `docs/superpowers/specs/2026-08-19-aula-f75-feature-report-port-design.md` (only if the calibration reality requires a note)

- [ ] **Step 1: Update `docs/PROTOCOL.md`**

Replace the "Lighting protocol (output report 0x13)" section's framing with a dual-transport description:

- Wired (`258A:010C`): feature report `0x06`, 520-byte frames. Header `06 CMD A0 A1 A2 A3 L0 L1`; `0x84` read / `0x04` write config region (addr `00 00 01 00`, len `0x0080`); `0x8a`/`0x0a` read/write color table (len `0x0200`); `0x08` live direct per-key packet + keepalive. Region layout: per-effect `(brightness, speed|color)` pairs, Ripple at 78-79; writes apply live (no save). Reads are SET-then-GET.
- Dongle (`3554:FA09`): unchanged output report `0x13` 20-byte frames (existing table).
- Note the layout offsets that are calibration-derived vs verified, and that `GET_REPORT(0x06)` after a bare GET returns flash/status noise.

- [ ] **Step 2: Verify docs consistency**

Skim the updated section for contradictions with the constants in `web/src/lib/f75.ts` (cmd values, lengths, addresses). Fix if any.

- [ ] **Step 3: Commit**

```bash
git add docs/PROTOCOL.md
git commit -m "docs: document wired F75 feature-report 0x06 lighting protocol"
```

---

### Task 7: Live validation pass

Close the loop on real hardware. Requires the user's keyboard (wired), a rebuilt dev server, and their participation.

**Files:**
- Modify: none expected; findings may add tweaks to `web/src/lib/f75-layout.ts`.

- [ ] **Step 1: Rebuild and connect**

The user starts `next dev`, clicks Connect, picks the **vendor interface** (second device entry). Confirm the connect log prints `Collection page 0xff00: out=[] feat=[0x05,0x06...]` and no "Wrong interface" status.

- [ ] **Step 2: Dump config region**

Click "Dump config region". Record the 128-byte hex. Match the effect-select/table region and confirm `effectOffsetsFor(7)` (78-79) aligns with the anchored Ripple pair.

- [ ] **Step 3: Calibrate**

Click "Calibrate layout". Confirm the log shows responsive offsets and a select offset, and that `localStorage` now holds a layout map.

- [ ] **Step 4: Set effects**

Apply Rainbow (effect 3), then brightness 0-4 and speed 0-4, and a color effect. Confirm the keyboard changes live and `readConfigRegion` round-trips show the expected sanitized bytes.

- [ ] **Step 5: Settings + per-key**

Set sleep timer and debounce; confirm live. Apply a per-key color and verify it displays (or note that the live direct-mode fallback is required).

- [ ] **Step 6: Adjust layout constants if needed**

If calibration reveals different offsets, update `EFFECT_TABLE_BASE`, `classifySelect` use, or the provisional debounce/sleep offsets in Task 3/4 code, re-run full tests, and commit as `fix(f75): calibrated layout offsets from live hardware`.

---

## Self-Review

- **Spec coverage:** Transport (Task 1), dispatch + connect diagnostics (Task 2), layout + calibration (Task 3), rewired operations + contract change (Task 4), diagnostics/UI (Task 5), docs (Task 6), live validation (Task 7). The spec's keepalive/direct-mode fallback and wireless preservation are covered in Task 4 and documented.
- **Placeholder scan:** No "TBD"/"TODO"; provisional offsets are explicit implementation choices (Task 3/4), flagged as such and later refined by Task 7. `probe()` in Task 4 is referenced as optional and not required by the shown path.
- **Type consistency:** `buildFrame`, `extractData`, `readConfigRegion`, `writeConfigRegion`, `readColorTable`, `writeColorTable`, `calibrate`, `isFeatureTransport`, `effectOffsetsFor`, `encodeBrightness`, `classifySelect`, `diffOffsets`, `loadLayout` are defined once (Task 1/2/3) and used with identical signatures in Tasks 4/5. `readConfig`'s type change is applied to `doReadConfig` in the same task.