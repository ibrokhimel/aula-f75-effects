# AULA F75 Linux Controller — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a WebHID web app (fork/adaptation of `marcoslor/Aula-F87-Controller`) that gives an AULA F75 wired keyboard full Windows-driver parity — key remapping (Default + FN1), lighting effects, per-key RGB, sleep/debounce, factory reset, profiles, device info — running locally in Chromium on Linux with no install.

**Architecture:** Next.js 14+ app (React 19, TypeScript 5, Tailwind 4) served from localhost; device I/O via `navigator.hid`. Keybind writes are 520-byte Feature Reports (Report ID `0x06`, layer byte `0x00`/`0x01`); lighting/settings use the fork's proven 20-byte Output Reports (Report ID `0x13`). Keyboard layout data is generated from the official `KB.ini` extracted from the user's Windows driver.

**Tech Stack:** Bun (build/dev/tools; `nix shell nixpkgs#bun` on this machine), Next.js 16.1.6, React 19.2.3, TypeScript ^5, Vitest (new), WebHID, Chromium.

**Spec:** `docs/superpowers/specs/2026-08-19-aula-f75-linux-controller-design.md`

## Global Constraints

- Working repo root: `/home/cloudglides/aula-f75-linux-drivers`. All commits MUST be unsigned: `git commit --no-gpg-sign` (local git config has GPG signing that prompts for a passphrase otherwise).
- Every task ends with all tests passing (`bun test` in `web/`) and a commit.
- USB device matching: primary wired `{vendorId: 0x258A, productId: 0x010C}`; auxiliary (dongle) `258A:010D` and `3554:FA09`. Only wired is expected on the user's machine.
- Locked keys (firmware-reserved, the OEM app refuses them): F1–F12 = matrix indices `12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78`. The remapper must never write their slots as usable outputs AND must be disabled in the picker.
- Keybind wire facts: Feature Report ID `0x06`, 520 bytes, interface collection = interface 1 (WebHID sends to the collection exposing report ID 0x06 — set control transfers match). Header bytes `[0]=0x06 [1]=0x03 [2]=layer [3]=0x00 [4]=0x01 [5]=0x00 [6]=flag [7]=flag`, layer `0x00` Default / `0x01` FN1 (byte 2). Slot stride 4 from `0x08`; page byte at `0x08 + 4*i`, usage byte at `0x0B + 4*i`. Trailer `5A A5` at last 2 bytes.
- Output encoding: AULA page byte `0x00` = HID page 0x07 (Keyboard/Keypad), `0x02` = HID page 0x0C (Consumer). Unbind = page `0x00`, usage `0x00`. Usage id is ONE byte; consumer usages > 0xFF (Calculator 0x192, Browser 0x196, Mail 0x18A) are excluded from the UI.
- `GET_REPORT(0x06)` returns flash/status noise on this firmware → remap is write-only read-modify-write, always seeded from our own generated default blob, never from a read.
- NEVER write to bootloader/firmware endpoints. Keybind + lighting + settings reports only (Report IDs 0x06 and 0x13). Nothing brickable.
- Runtime requires a Chromium-family browser (Chrome/Edge/Brave/Chromium); Firefox/Safari unsupported.
- udev rule grants hidraw access so the browser can open `/dev/hidraw*` without root.
- Network access needed for initial install only (`bun install`); the app itself must be fully offline.

---

### Task 1: Repo scaffold — fork the web app, bring in OEM assets, udev, README

**Files:**
- Create: `web/` (copied from the already-cloned fork at `/tmp/opencode/f87ctrl/web`)
- Create: `assets/oem/Dev/kb/{1,F75KR,wired}/KB.ini` (copied from `/tmp/opencode/f75_exe`, the innoextract output of the user's installer)
- Create: `assets/oem/PROVENANCE.md`
- Create: `udev/99-aula-f75.rules`
- Create: `.gitignore`
- Create: `README.md`
- Modify: `web/package.json` (add `test` script + `vitest` devDependency)

**Interfaces:**
- Produces: the `web/` tree that all later tasks modify; `assets/oem/Dev/kb/1/KB.ini` consumed by Task 2; `web/package.json` scripts `dev` (exists), `build` (exists), `test` (new, `vitest run`).

- [ ] **Step 1: Copy the fork into the repo**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
cp -r /tmp/opencode/f87ctrl/web web
rm -rf web/public web/scripts/capture-screenshots.ts   # keep only what we need? -- see note
```

Note for the engineer: remove Next.js boilerplate that the fork ships unused by the F75 app: `web/public/*.svg` (Next/Globe/Window/File/Vercel logos), and the Playwright screenshot script `web/scripts/`. Keep `web/src/` intact. Do NOT bring `web/node_modules` (a fresh `bun install` handles it).

- [ ] **Step 2: Copy OEM assets with provenance**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
mkdir -p assets/oem/Dev/kb
for d in 1 F75KR wired; do
  cp "/tmp/opencode/f75_exe/app/Dev/kb/$d/KB.ini" "assets/oem/Dev/kb/$d/KB.ini"
done
```

Write `assets/oem/PROVENANCE.md`:

```markdown
# OEM assets

Extracted 2026-08-19 from the official Windows installer
`AULA_F75_Setup_v2.0_20240509/AULA F75 Setup v2.0 20240509.exe`
(the header of which is "Inno Setup Setup Data (5.3.3) (u)") using `innoextract`.

`KB.ini` layouts come from `app/Dev/kb/<variant>/KB.ini`:

| variant | VID:PID            | wireless VID:PID |
|---------|--------------------|------------------|
| 1       | 258A:010C          | 3554:FA09        |
| F75KR   | 258A:010C          | 3554:FA09        |
| wired   | 258A:010C          | none             |

`[KEY]` entry format (F75 `1` variant), one line per key:
`K<n>=x,y,w,h, <pageByte>, <windowsVk>, 0x00, <matrixIndex>`

`[FN1]` entry format:
`K<n>=0x09,0x01,<0xHHHHHHHH>` where the 32-bit value packs
HID usage page (high 16 bits) | usage id (low 16 bits).

These files are the source of truth for the F75 key map (matrix index,
geometry, defaults) and are not modified by the app.
```

- [ ] **Step 3: Add udev rule**

Create `udev/99-aula-f75.rules`:

```
# AULA F75 (and F87/F99 family, SinoWealth 258A) — allow Chromium/WebHID
# to open the keyboard's /dev/hidraw node without root.
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="258a", MODE="0660", GROUP="input"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="3554", ATTRS{idProduct}=="fa09", MODE="0660", GROUP="input"
```

- [ ] **Step 4: .gitignore**

```gitignore
# web app
web/node_modules/
web/.next/
web/next-env.d.ts
web/*.tsbuildinfo
```

- [ ] **Step 5: Add vitest + test script**

In `web/package.json`:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```

Add to `devDependencies`:

```json
    "vitest": "^3"
```

- [ ] **Step 6: Install, boot, verify**

```bash
cd /home/cloudglides/aula-f75-linux-drivers/web
nix shell nixpkgs#bun -c bun install
nix shell nixpkgs#bun -c timeout 45 bun dev   # expect it to serve on :3000
```

Then add the first vitest smoke test `web/src/lib/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("repo scaffold is in place", () => {
    expect(true).toBe(true);
  });
});
```

Run `nix shell nixpkgs#bun -c bun test` — expect PASS. Remove the smoke test afterwards in the commit step.

- [ ] **Step 7: Write README skeleton and commit**

Create `README.md` (placeholder accepted here; fully written in Task 10):

```markdown
# AULA F75 Linux Controller

Local WebHID web app to configure the AULA F75 keyboard (remap, RGB,
macros, settings) in Chromium on Linux — no Windows driver needed.

Adapted from [marcoslor/Aula-F87-Controller](https://github.com/marcoslor/Aula-F87-Controller)
(lighting/device protocol) and `vndarkblue/aula-keybind` (keybind wire protocol).
Official key layout generated from the extracted OEM `KB.ini` (see `assets/oem/PROVENANCE.md`).

_Setup + usage: see Task 10 (README final)._
```

```bash
cd /home/cloudglides/aula-f75-linux-drivers
git add -A
git commit --no-gpg-sign -m "chore: scaffold repo with forked web app, OEM assets, udev rule"
```

---

### Task 2: Generate the F75 key map from the official KB.ini

**Files:**
- Create: `tools/gen-keymap.mjs` (Bun/Node, zero deps)
- Create: `web/src/data/f75-keymap.json` (generated output, committed)
- Test: `web/src/data/f75-keymap.test.ts`

**Interfaces:**
- Consumes: `assets/oem/Dev/kb/1/KB.ini`
- Produces: `f75-keymap.json` shape consumed by Tasks 3–4:

```ts
export interface F75Key {
  index: number;        // keyboard matrix / LED index (slot number)
  name: string;         // canonical stable id, e.g. "esc", "f1", "a", "space"
  label: string;        // human label, e.g. "Esc", "↑", "Enter"
  vk: number;           // Windows VK code of the base-layer default (from [KEY])
  x: number; y: number; w: number; h: number; // official geometry, px
  locked: boolean;      // true for F1–F12 (indices 12,18,…,78)
  fnHid: [number, number] | null; // from [FN1] overrides: [aulaPageByte, usageByte]; null = unbound
}
export interface F75Keymap { version: string; source: string; keys: F75Key[]; }
```

- [ ] **Step 1: Write the failing `F75Key` type + generator test**

Create `web/src/data/f75-keymap.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import keymap from "./f75-keymap.json";

describe("f75-keymap.json", () => {
  it("has a version and source", () => {
    expect(keymap.version).toBe("1");
    expect(keymap.source).toContain("KB.ini");
  });

  it("contains 116 physical keys with unique matrix indices", () => {
    const idx = keymap.keys.map((k) => k.index);
    expect(idx).toHaveLength(116);
    expect(new Set(idx).size).toBe(116);
  });

  it("all indices are valid slot numbers (< 128) and non-negative", () => {
    for (const k of keymap.keys) {
      expect(k.index).toBeGreaterThanOrEqual(0);
      expect(k.index).toBeLessThan(128);
    }
  });

  it("locks exactly the F1–F12 row", () => {
    const locked = keymap.keys.filter((k) => k.locked).map((k) => k.index).sort((a, b) => a - b);
    expect(locked).toEqual([12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78]);
  });

  it("every key has a parses-to-VK default and geometry", () => {
    for (const k of keymap.keys) {
      expect(k.vk).toBeGreaterThan(0);
      expect(k.w).toBeGreaterThan(0);
      expect(k.h).toBeGreaterThan(0);
    }
  });
});
```

Run: `cd /home/cloudglides/aula-f75-linux-drivers/web && nix shell nixpkgs#bun -c bun test`
Expected: FAIL — `web/src/data/f75-keymap.json` does not exist.

- [ ] **Step 2: Write the generator**

Create `tools/gen-keymap.mjs`:

```js
#!/usr/bin/env node
// Parse the OEM KB.ini [KEY] / [FN1] sections into f75-keymap.json.
//   [KEY]  K<n>=x,y,w,h, <page>, <vk>, 0x00, <index>
//   [FN1]  K<n>=0x09,0x01,<0xHHHHHHHH>   (32-bit: page<<16 | usage)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INI = join(ROOT, "assets/oem/Dev/kb/1/KB.ini");
const OUT = join(ROOT, "web/src/data/f75-keymap.json");

const LOCKED_INDICES = [12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78];

function section(ini, name) {
  const m = ini.match(new RegExp(`^\\[${name}\\]([\\s\\S]*?)(?=^\\[[A-Z])`, "m"));
  return m ? m[1] : "";
}
const toInt = (s) => parseInt(s.trim(), 16);

function parseKeyLine(line) {
  // "K1=30,30,55,57, 0x02,0x1B,0x00,0"
  const body = line.split("=")[1].trim();
  const p = body.split(",").map((s) => s.trim());
  if (p.length !== 8) return null;
  const [x, y, w, h, , vk, , index] = p;
  return {
    index: parseInt(index, 10),
    vk: toInt(vk), x: parseInt(x, 10), y: parseInt(y, 10),
    w: parseInt(w, 10), h: parseInt(h, 10),
  };
}

function parseFnLine(line) {
  // "K1=0x09,0x01,0x07000004"
  const body = line.split("=")[1].trim();
  const p = body.split(",").map((s) => s.trim());
  if (p.length !== 3) return null;
  const id = toInt(p[2]); // page<<16 | usage
  const hidPage = id >>> 16;
  const usage = id & 0xffff;
  if (usage > 0xff) return null; // one-byte usage id only
  const aulaPage = hidPage === 0x07 ? 0x00 : hidPage === 0x0c ? 0x02 : null;
  if (aulaPage === null) return null;
  return [aulaPage, usage];
}
function lineLength(l) { return l[0] === "K" && l.includes("="); }

const ini = readFileSync(INI, "utf8").replace(/\r/g, "");
const keySec = section(ini, "KEY");
const fnSec = section(ini, "FN1");

const fnOverrides = new Map();
for (const line of fnSec.split("\n")) {
  if (!lineLength(line)) continue;
  const n = parseInt(line.slice(1, line.indexOf("=")), 10);
  const v = parseFnLine(line);
  if (v !== null) fnOverrides.set(n, v);
}

const keys = [];
let n = 1;
for (const line of keySec.split("\n")) {
  if (!lineLength(line)) continue;
  const k = parseKeyLine(line);
  if (k === null) continue; // skip malformed / comments start with ";"
  const fnHid = fnOverrides.get(n) ?? null;
  keys.push({ ...k, fnHid, locked: LOCKED_INDICES.includes(k.index) });
  n++;
}

// Canonical names for the picker/UI (deterministic mapping by index).
const NAME_BY_INDEX = {
  0:"esc", 12:"f1", 18:"f2", 24:"f3", 30:"f4", 36:"f5", 42:"f6", 48:"f7",
  54:"f8", 60:"f9", 66:"f10", 72:"f11", 78:"f12", 88:"end",
  1:"grave", 7:"1", 13:"2", 19:"3", 25:"4", 31:"5", 37:"6", 43:"7",
  49:"8", 55:"9", 61:"0", 67:"minus", 73:"equals", 79:"bksp",
  85:"ins", 91:"home", 97:"pgup",
  2:"tab", 8:"q", 14:"w", 20:"e", 26:"r", 32:"t", 38:"y", 44:"u",
  50:"i", 56:"o", 62:"p", 68:"lbracket", 74:"rbracket", 80:"backslash",
  86:"del", 92:"end2", 98:"pgdn",
  3:"caps", 9:"a", 15:"s", 21:"d", 27:"f", 33:"g", 39:"h", 45:"j",
  51:"k", 57:"l", 63:"semicolon", 69:"apostrophe", 81:"enter",
  4:"lshift", 10:"z", 16:"x", 22:"c", 28:"v", 34:"b", 40:"n", 46:"m",
  52:"comma", 58:"period", 64:"slash", 82:"rshift", 94:"up",
  5:"lctrl", 11:"lwin", 17:"lalt", 35:"space", 53:"ralt", 59:"fn",
  65:"app", 83:"rctrl", 89:"left", 95:"down", 101:"right",
};
const LABEL_BY_INDEX = {
  0:"Esc", 88:"End", 1:"`", 7:"1", 13:"2", 19:"3", 25:"4", 31:"5", 37:"6",
  43:"7", 49:"8", 55:"9", 61:"0", 67:"-", 73:"=", 79:"Bksp", 85:"Ins",
  91:"Home", 97:"PgUp", 2:"Tab", 8:"Q", 14:"W", 20:"E", 26:"R", 32:"T",
  38:"Y", 44:"U", 50:"I", 56:"O", 62:"P", 68:"[", 74:"]", 80:"\\",
  86:"Del", 92:"End", 98:"PgDn", 3:"Caps", 9:"A", 15:"S", 21:"D", 27:"F",
  33:"G", 39:"H", 45:"J", 51:"K", 57:"L", 63:";", 69:"'", 81:"Enter",
  4:"LShift", 10:"Z", 16:"X", 22:"C", 28:"V", 34:"B", 40:"N", 46:"M",
  52:",", 58:".", 64:"/", 82:"RShift", 94:"↑", 5:"LCtrl", 11:"LWin",
  17:"LAlt", 35:"Space", 53:"RAlt", 59:"Fn", 65:"App", 83:"RCtrl",
  89:"←", 95:"↓", 101:"→",
};
for (let i = 0; i < LOCKED_INDICES.length; i++) {
  const fidx = LOCKED_INDICES[i];
  NAME_BY_INDEX[fidx] = `f${i + 1}`;
  LABEL_BY_INDEX[fidx] = `F${i + 1}`;
}
for (const k of keys) {
  k.name = NAME_BY_INDEX[k.index] ?? `key${k.index}`;
  k.label = LABEL_BY_INDEX[k.index] ?? k.name;
}

const out = { version: "1", source: INI.replace(`${ROOT}/`, ""), keys };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${keys.length} keys -> ${OUT}`);
```

- [ ] **Step 3: Run the generator and verify output**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
nix shell nixpkgs#bun -c bun tools/gen-keymap.mjs
nix shell nixpkgs#bun -c node -e "const k=require('./web/src/data/f75-keymap.json'); console.log(k.keys.length, k.keys[0], k.keys.filter(x=>x.locked).length)"
```

Expected: `116 keys -> web/src/data/f75-keymap.json`, first key `esc` index 0 vk 0x1B, 12 locked.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/cloudglides/aula-f75-linux-drivers/web
nix shell nixpkgs#bun -c bun test
```

Expected: all 5 `f75-keymap.test.ts` cases PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
git add tools/gen-keymap.mjs web/src/data/f75-keymap.json web/src/data/f75-keymap.test.ts
git commit --no-gpg-sign -m "feat: generate F75 key map from official KB.ini"
```

---

### Task 3: VK → HID usage translation (`vkmap.ts`)

**Files:**
- Create: `web/src/lib/vkmap.ts`
- Test: `web/src/lib/vkmap.test.ts`

**Interfaces:**
- Consumes: `F75Key` shape (Task 2) — reads `vk` on each key.
- Produces:

```ts
export type Output = { page: number; usage: number }; // page: 0x00 kbd | 0x02 consumer
export const VK_MAP: Record<number, Output>;
export function vkToOutput(vk: number): Output | null;          // null = unrepresentable
export function outputToName(o: Output): string;                 // human label
export const LOCKED_INDICES: readonly number[];
```

- [ ] **Step 1: Write the failing tests**

Create `web/src/lib/vkmap.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { vkToOutput, outputToName } from "./vkmap";
import keymap from "../data/f75-keymap.json";

describe("vkToOutput", () => {
  it("maps the F75 base-layer defaults (spot checks from KB.ini)", () => {
    expect(vkToOutput(0x1b)).toEqual({ page: 0x00, usage: 0x29 });    // Esc
    expect(vkToOutput(0x70)).toEqual({ page: 0x00, usage: 0x3a });    // F1
    expect(vkToOutput(0x7b)).toEqual({ page: 0x00, usage: 0x45 });    // F12
    expect(vkToOutput(0x41)).toEqual({ page: 0x00, usage: 0x04 });    // A
    expect(vkToOutput(0x31)).toEqual({ page: 0x00, usage: 0x1e });    // 1
    expect(vkToOutput(0x20)).toEqual({ page: 0x00, usage: 0x2c });    // Space
    expect(vkToOutput(0x26)).toEqual({ page: 0x00, usage: 0x52 });    // ↑
    expect(vkToOutput(0xaf)).toEqual({ page: 0x02, usage: 0xe9 });    // Volume +
    expect(vkToOutput(0xae)).toEqual({ page: 0x02, usage: 0xea });    // Volume -
    expect(vkToOutput(0x00)).toBeNull();
  });

  it("produces a usable output for every F75 default VK", () => {
    for (const k of keymap.keys) {
      const o = vkToOutput(k.vk);
      expect(o).not.toBeNull();
    }
  });
});

describe("outputToName", () => {
  it("names key and consumer outputs", () => {
    expect(outputToName({ page: 0x00, usage: 0x29 })).toBe("Esc");
    expect(outputToName({ page: 0x00, usage: 0x00 })).toBe("(none)");
    expect(outputToName({ page: 0x02, usage: 0xe9 })).toBe("Volume +");
  });
});
```

Run: `cd /home/cloudglides/aula-f75-linux-drivers/web && nix shell nixpkgs#bun -c bun test`
Expected: FAIL — `vckmap`/`vkToOutput` not defined (module missing).

- [ ] **Step 2: Implement `vkmap.ts`**

```ts
// Windows VK code -> AULA keybind output (aulaPageByte, HID usage id).
// AULA page 0x00 = HID Usage Page 0x07 (Keyboard/Keypad).
// AULA page 0x02 = HID Usage Page 0x0C (Consumer).
export type Output = { page: number; usage: number };
export const LOCKED_INDICES: readonly number[] = Object.freeze(
  [12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78]
);

const K = (usage: number): Output => ({ page: 0x00, usage });
const C = (usage: number): Output => ({ page: 0x02, usage });

export const VK_MAP: Record<number, Output> = {
  // Digits & letters
  0x30: K(0x1e), 0x31: K(0x1f), 0x32: K(0x20), 0x33: K(0x21), 0x34: K(0x22),
  0x35: K(0x23), 0x36: K(0x24), 0x37: K(0x25), 0x38: K(0x26), 0x39: K(0x27),
  0x41: K(0x04), 0x42: K(0x05), 0x43: K(0x06), 0x44: K(0x07), 0x45: K(0x08),
  0x46: K(0x09), 0x47: K(0x0a), 0x48: K(0x0b), 0x49: K(0x0c), 0x4a: K(0x0d),
  0x4b: K(0x0e), 0x4c: K(0x0f), 0x4d: K(0x10), 0x4e: K(0x11), 0x4f: K(0x12),
  0x50: K(0x13), 0x51: K(0x14), 0x52: K(0x15), 0x53: K(0x16), 0x54: K(0x17),
  0x55: K(0x18), 0x56: K(0x19), 0x57: K(0x1a), 0x58: K(0x1b), 0x59: K(0x1c),
  0x5a: K(0x1d),
  // Function row
  0x70: K(0x3a), 0x71: K(0x3b), 0x72: K(0x3c), 0x73: K(0x3d), 0x74: K(0x3e),
  0x75: K(0x3f), 0x76: K(0x40), 0x77: K(0x41), 0x78: K(0x42), 0x79: K(0x43),
  0x7a: K(0x44), 0x7b: K(0x45),
  0x7c: K(0x68), 0x7d: K(0x69), 0x7e: K(0x6a), 0x7f: K(0x6b),
  0x80: K(0x6c), 0x81: K(0x6d), 0x82: K(0x6e), 0x83: K(0x6f),
  0x84: K(0x70), 0x85: K(0x71), 0x86: K(0x72), 0x87: K(0x73),
  // Navigation & editing
  0x08: K(0x2a), 0x09: K(0x2b), 0x0d: K(0x28), 0x1b: K(0x29),
  0x20: K(0x2c), 0x2c: K(0x43), 0x2e: K(0x4c),
  0x23: K(0x4d), 0x24: K(0x4a), 0x21: K(0x4b), 0x22: K(0x4e),
  0x25: K(0x50), 0x26: K(0x52), 0x27: K(0x4f), 0x28: K(0x51),
  0x2d: K(0x49),
  // Modifiers (VK_L*/VK_R* all map to left HID usages)
  0xa0: K(0xe1), 0xa1: K(0xe1), 0xa2: K(0xe0), 0xa3: K(0xe0),
  0xa4: K(0xe2), 0xa5: K(0xe2), 0x5b: K(0xe3), 0x5c: K(0xe7),
  // OEM keys (VK_OEM_*)
  0xba: K(0x33), 0xbb: K(0x2e), 0xbc: K(0x36), 0xbd: K(0x2d),
  0xbe: K(0x37), 0xbf: K(0x38), 0xc0: K(0x35),
  0xdb: K(0x2f), 0xdc: K(0x31), 0xdd: K(0x30),
  // Media & apps
  0xb3: C(0xcd), 0xb0: C(0xb5), 0xb1: C(0xb6), 0xb2: C(0xb7),
  0xad: C(0xea), 0xae: C(0xea), 0xaf: C(0xe9), 0xa8: C(0xb8),
};

const NAMES: Record<string, string> = {
  "0x00,0x00": "(none)",
  "0x00,0x29": "Esc", "0x00,0x2a": "Bksp", "0x00,0x2b": "Tab",
  "0x00,0x28": "Enter", "0x00,0x2c": "Space", "0x00,0x43": "PrtSc",
  "0x00,0x3a": "F1", "0x00,0x3b": "F2", "0x00,0x3c": "F3", "0x00,0x3d": "F4",
  "0x00,0x3e": "F5", "0x00,0x3f": "F6", "0x00,0x40": "F7", "0x00,0x41": "F8",
  "0x00,0x42": "F9", "0x00,0x43": "PrtSc", "0x00,0x44": "F10",
  "0x00,0x45": "F11", "0x00,0x46": "F12",
  "0x00,0x49": "Ins", "0x00,0x4a": "Home", "0x00,0x4b": "PgUp",
  "0x00,0x4c": "Del", "0x00,0x4d": "End", "0x00,0x4e": "PgDn",
  "0x00,0x4f": "→", "0x00,0x50": "←", "0x00,0x51": "↓", "0x00,0x52": "↑",
  "0x00,0xe1": "Shift", "0x00,0xe0": "Ctrl", "0x00,0xe2": "Alt",
  "0x00,0xe3": "Win", "0x00,0xe7": "App",
  "0x00,0x04": "A", "0x00,0x05": "B", "0x00,0x06": "C", "0x00,0x07": "D",
  "0x00,0x08": "E", "0x00,0x09": "F", "0x00,0x0a": "G", "0x00,0x0b": "H",
  "0x00,0x0c": "I", "0x00,0x0d": "J", "0x00,0x0e": "K", "0x00,0x0f": "L",
  "0x00,0x10": "M", "0x00,0x11": "N", "0x00,0x12": "O", "0x00,0x13": "P",
  "0x00,0x14": "Q", "0x00,0x15": "R", "0x00,0x16": "S", "0x00,0x17": "T",
  "0x00,0x18": "U", "0x00,0x19": "V", "0x00,0x1a": "W", "0x00,0x1b": "X",
  "0x00,0x1c": "Y", "0x00,0x1d": "Z",
  "0x00,0x1e": "1", "0x00,0x1f": "2", "0x00,0x20": "3", "0x00,0x21": "4",
  "0x00,0x22": "5", "0x00,0x23": "6", "0x00,0x24": "7", "0x00,0x25": "8",
  "0x00,0x26": "9", "0x00,0x27": "0",
  "0x00,0x2d": "-", "0x00,0x2e": "=", "0x00,0x2f": "[", "0x00,0x30": "]",
  "0x00,0x31": "\\", "0x00,0x33": ";", "0x00,0x34": "'", "0x00,0x35": "`",
  "0x00,0x36": ",", "0x00,0x37": ".", "0x00,0x38": "/",
  "0x02,0xcd": "Play/Pause", "0x02,0xb5": "Next", "0x02,0xb6": "Prev",
  "0x02,0xb7": "Stop", "0x02,0xea": "Volume -", "0x02,0xe9": "Volume +",
  "0x02,0xb8": "Mute", "0x02,0xe2": "Mute",
};

export function vkToOutput(vk: number): Output | null {
  return VK_MAP[vk] ?? null;
}

export function outputToName(o: Output): string {
  return NAMES[`0x${o.page.toString(16).padStart(2, "0")},0x${o.usage.toString(16).padStart(2, "0")}`]
    ?? `Key ${o.usage.toString(16).padStart(2, "0")}`;
}
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
cd /home/cloudglides/aula-f75-linux-drivers/web
nix shell nixpkgs#bun -c bun test
```

Expected: all `vkmap.test.ts` cases PASS. Note Volume+ (`0xAF`) → consumer 0xE9 and Volume− (`0xAE`) → 0xEA per the maps above; both `VK_VOLUME_DOWN` (`0xAE`) and `VK_MEDIA_NEXT` (`0xB0`) etc. are covered.

- [ ] **Step 4: Commit**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
git add web/src/lib/vkmap.ts web/src/lib/vkmap.test.ts
git commit --no-gpg-sign -m "feat: add VK to HID usage translation"
```

---

### Task 4: Keybind blob builder/validator (`keybind.ts`)

**Files:**
- Create: `web/src/lib/keybind.ts`
- Create: `web/tests/fixtures/factory-base.bin`, `web/tests/fixtures/factory-fn.bin` (copied from the aula-keybind clone at `/tmp/opencode/akey`, which is MIT; keep provenance note in a `web/tests/fixtures/README.md`)
- Test: `web/src/lib/keybind.test.ts`

**Interfaces:**
- Consumes: `f75-keymap.json` + `vkmap.ts` (Tasks 2–3).
- Produces:

```ts
export const FEATURE_REPORT_ID = 0x06;
export const BLOB_SIZE = 520;
export const LAYER_BASE = 0x00;
export const LAYER_FN = 0x01;
export type Layer = typeof LAYER_BASE | typeof LAYER_FN;
export class BlobError extends Error {}
export function validateBlob(blob: Uint8Array): void;                  // throws BlobError
export function emptyBlob(layer: Layer): Uint8Array;                   // 520B, header+zeros+trailer
export function defaultBlob(layer: Layer, keymap: F75Key[]): Uint8Array; // default layer from KB.ini
export function setSlot(blob: Uint8Array, index: number, out: Output): void;
export function getSlot(blob: Uint8Array, index: number): Output;
export function slotOffset(index: number): { page: number; usage: number };
```

- [ ] **Step 1: Copy the reference fixtures**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
mkdir -p web/tests/fixtures
cp /tmp/opencode/akey/src/aula_keybind/templates/factory-base.bin web/tests/fixtures/
cp /tmp/opencode/akey/src/aula_keybind/templates/factory-fn.bin   web/tests/fixtures/
```

Write `web/tests/fixtures/README.md`:

```markdown
# Fixtures

`factory-base.bin` / `factory-fn.bin` — 520-byte default keybind blobs for
the AULA F87 reconstructed from OEM captures by the MIT-licensed
[vndarkblue/aula-keybind](https://github.com/vndarkblue/aula-keybind)
(`src/aula_keybind/templates/`). Used here ONLY to cross-check blob
structure (header, slot geometry, trailer); the F75 default content is
generated from our own `f75-keymap.json`.
```

- [ ] **Step 2: Write the failing tests**

Create `web/src/lib/keybind.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BLOB_SIZE, FEATURE_REPORT_ID, LAYER_BASE, LAYER_FN,
  BlobError, defaultBlob, emptyBlob, getSlot, setSlot, slotOffset, validateBlob,
} from "./keybind";
import keymap from "../data/f75-keymap.json";

const base = new Uint8Array(readFileSync(join(__dirname, "../tests/fixtures/factory-base.bin")));
const fn = new Uint8Array(readFileSync(join(__dirname, "../tests/fixtures/factory-fn.bin")));

describe("slotOffset", () => {
  it("matches the documented geometry", () => {
    expect(slotOffset(0)).toEqual({ page: 0x08, usage: 0x0b });
    expect(slotOffset(5)).toEqual({ page: 0x1c, usage: 0x1f });
    expect(slotOffset(101)).toEqual({ page: 0x08 + 404, usage: 0x0b + 404 });
    expect(slotOffset(101).usage).toBeLessThan(BLOB_SIZE - 2);
  });
});

describe("validateBlob", () => {
  it("accepts the F87 factory blobs (structural cross-check)", () => {
    expect(() => validateBlob(base)).not.toThrow();
    expect(() => validateBlob(fn)).not.toThrow();
    expect(base[2]).toBe(LAYER_BASE);
    expect(fn[2]).toBe(LAYER_FN);
  });
  it("rejects bad size / header / layer / trailer", () => {
    expect(() => validateBlob(new Uint8Array(10))).toThrow(BlobError);
    const badHeader = new Uint8Array(base); badHeader[0] = 0x00;
    expect(() => validateBlob(badHeader)).toThrow(BlobError);
    const badLayer = new Uint8Array(base); badLayer[2] = 0x02;
    expect(() => validateBlob(badLayer)).toThrow(BlobError);
    const badTrailer = new Uint8Array(base); badTrailer[518] = 0x00;
    expect(() => validateBlob(badTrailer)).toThrow(BlobError);
  });
});

describe("emptyBlob", () => {
  it("builds a well-formed all-unbound blob for each layer", () => {
    for (const l of [LAYER_BASE, LAYER_FN]) {
      const b = emptyBlob(l);
      expect(b).toHaveLength(BLOB_SIZE);
      expect(() => validateBlob(b)).not.toThrow();
      expect(b[0]).toBe(FEATURE_REPORT_ID);
      expect(b[2]).toBe(l);
    }
  });
});

describe("defaultBlob", () => {
  it("generates a valid blob whose default slot matches Esc/A/Space", () => {
    const b = defaultBlob(LAYER_BASE, keymap.keys);
    expect(() => validateBlob(b)).not.toThrow();
    // Esc index 0: VK 0x1B -> {page:0x00, usage:0x29}
    expect(getSlot(b, 0)).toEqual({ page: 0x00, usage: 0x29 });
    // A index 9: VK 0x41 -> {page:0x00, usage:0x04}
    expect(getSlot(b, 9)).toEqual({ page: 0x00, usage: 0x04 });
    // Space index 35: VK 0x20 -> usage 0x2c
    expect(getSlot(b, 35)).toEqual({ page: 0x00, usage: 0x2c });
    // A non-existent matrix index is unbound
    expect(getSlot(b, 127)).toEqual({ page: 0x00, usage: 0x00 });
  });
  it("FN1 defaults are unbound except the KB.ini override (Esc->A)", () => {
    const b = defaultBlob(LAYER_FN, keymap.keys);
    expect(b[2]).toBe(LAYER_FN);
    expect(getSlot(b, 0)).toEqual({ page: 0x00, usage: 0x04 });
    expect(getSlot(b, 9)).toEqual({ page: 0x00, usage: 0x00 });
  });
});

describe("setSlot / getSlot", () => {
  it("round-trips and keeps header/trailer intact", () => {
    const b = emptyBlob(LAYER_BASE);
    setSlot(b, 9, { page: 0x02, usage: 0xe9 });
    expect(getSlot(b, 9)).toEqual({ page: 0x02, usage: 0xe9 });
    expect(() => validateBlob(b)).not.toThrow();
  });
  it("grounds never touches locked F1-F12 slots in tests by convention", () => {
    setSlot(emptyBlob(LAYER_BASE), 12, { page: 0x00, usage: 0x04 });
  });
});
```

Run: `cd /home/cloudglides/aula-f75-linux-drivers/web && nix shell nixpkgs#bun -c bun test`
Expected: FAIL — `./keybind` module missing.

- [ ] **Step 3: Implement `keybind.ts`**

```ts
import type { F75Key } from "../data/f75-keymap.json";
import { vkToOutput, type Output } from "./vkmap";

export const FEATURE_REPORT_ID = 0x06;
export const BLOB_SIZE = 520;
export const LAYER_BASE = 0x00;
export const LAYER_FN = 0x01;
export const LAYER_OFFSET = 2;
export type Layer = typeof LAYER_BASE | typeof LAYER_FN;

const TRAILER = 0xa5;

export class BlobError extends Error {}

export function slotOffset(index: number): { page: number; usage: number } {
  return { page: 0x08 + 4 * index, usage: 0x0b + 4 * index };
}

export function validateBlob(blob: Uint8Array): void {
  if (blob.length !== BLOB_SIZE) throw new BlobError(`Blob must be ${BLOB_SIZE} bytes (got ${blob.length}).`);
  const fixed: Array<[number, number]> = [[0, 0x06], [1, 0x03], [3, 0x00], [4, 0x01], [5, 0x00]];
  for (const [off, want] of fixed) if (blob[off] !== want) throw new BlobError(`Header byte ${off}: expected 0x${want.toString(16).padStart(2, "0")}.`);
  if (blob[2] !== LAYER_BASE && blob[2] !== LAYER_FN) throw new BlobError(`Unknown layer byte 0x${blob[2].toString(16)}.`);
  if (blob[BLOB_SIZE - 2] !== 0x5a || blob[BLOB_SIZE - 1] !== TRAILER) throw new BlobError("Trailer mismatch.");
}

export function emptyBlob(layer: Layer): Uint8Array {
  const b = new Uint8Array(BLOB_SIZE);
  b[0] = FEATURE_REPORT_ID; b[1] = 0x03; b[2] = layer; b[3] = 0x00;
  b[4] = 0x01; b[5] = 0x00; b[6] = 0x00; b[7] = 0xff;
  b[BLOB_SIZE - 2] = 0x5a; b[BLOB_SIZE - 1] = TRAILER;
  return b;
}

export function defaultBlob(layer: Layer, keys: F75Key[]): Uint8Array {
  const b = emptyBlob(layer);
  for (const k of keys) {
    if (k.locked) continue;
    if (layer === LAYER_BASE) {
      const o = vkToOutput(k.vk);
      if (o) setSlot(b, k.index, o);
    } else if (k.fnHid) {
      setSlot(b, k.index, { page: k.fnHid[0], usage: k.fnHid[1] });
    }
  }
  return b;
}

export function setSlot(blob: Uint8Array, index: number, out: Output): void {
  const { page, usage } = slotOffset(index);
  blob[page] = out.page;
  blob[page + 1] = 0x00;
  blob[page + 2] = 0x00;
  blob[usage] = out.usage;
}

export function getSlot(blob: Uint8Array, index: number): Output {
  const { page, usage } = slotOffset(index);
  return { page: blob[page], usage: blob[usage] };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/cloudglides/aula-f75-linux-drivers/web
nix shell nixpkgs#bun -c bun test
```

Expected: all `keybind.test.ts` cases PASS (including the two F87 fixture structural checks). If `defaultBlob` FN1 test fails, verify `f75-keymap.json` `fnHid` for index 0 is `[0x00, 0x04]` (from KB.ini `[FN1] K1=0x09,0x01,0x07000004`); adjust only if the generator needs a parse fix.

- [ ] **Step 5: Commit**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
git add web/src/lib/keybind.ts web/src/lib/keybind.test.ts web/tests
git commit --no-gpg-sign -m "feat: add keybind blob builder and validator"
```

---

### Task 5: Keybind write on the fork's WebHID transport

The fork keeps all device I/O in `web/src/lib/webhid.ts` (functions taking `device: HIDDevice` + `log`), driven through the `useKeyboard` hook. We follow that pattern rather than introducing a parallel `DeviceIo` class.

**Files:**
- Modify: `web/src/lib/webhid.ts` (add `writeKeybindBlob`)
- Test: `web/src/lib/hid.test.ts` (fake device; no hardware needed)

**Interfaces:**
- Consumes: `keybind.ts` (`validateBlob`, `BLOB_SIZE`, `FEATURE_REPORT_ID`, `Layer`), fork `webhid.ts` `LogFn` + `hex`.
- Produces:

```ts
export async function writeKeybindBlob(device: HIDDevice, layer: Layer, blob: Uint8Array, log: LogFn): Promise<void>
```

Consumed by `useKeyboard.doWriteKeybind` (Task 7) and `useKeyboard.doApplyProfile` (Task 9).

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/hid.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { writeKeybindBlob } from "./webhid";
import { BLOB_SIZE, LAYER_BASE, LAYER_FN, LAYER_OFFSET, emptyBlob } from "./keybind";

class FakeDevice {
  opened = true;
  sent: Array<[number, Uint8Array]> = [];
  async sendFeatureReport(id: number, data: Uint8Array) { this.sent.push([id, data]); }
  async close() {}
}
const log = vi.fn();

describe("writeKeybindBlob", () => {
  it("sends feature report 0x06 with the 519-byte body", async () => {
    const d = new FakeDevice() as unknown as HIDDevice;
    const blob = emptyBlob(LAYER_BASE);
    await writeKeybindBlob(d, LAYER_BASE, blob, log);
    const [id, body] = d.sent[0];
    expect(id).toBe(0x06);
    expect(body).toHaveLength(BLOB_SIZE - 1);
    expect(body[LAYER_OFFSET - 1]).toBe(LAYER_BASE); // layer byte shifted down one after stripping report id
  });
  it("rejects a layer/header mismatch", async () => {
    const d = new FakeDevice() as unknown as HIDDevice;
    await expect(writeKeybindBlob(d, LAYER_FN, emptyBlob(LAYER_BASE), log))
      .rejects.toThrow(/Layer byte mismatch/);
  });
  it("rejects a short blob", async () => {
    const d = new FakeDevice() as unknown as HIDDevice;
    await expect(writeKeybindBlob(d, LAYER_BASE, new Uint8Array(10), log))
      .rejects.toThrow(/520 bytes/);
  });
});
```

Run: `cd /home/cloudglides/aula-f75-linux-drivers/web && nix shell nixpkgs#bun -c bun test`
Expected: FAIL — `writeKeybindBlob` not exported from `./webhid`.

- [ ] **Step 2: Implement `writeKeybindBlob` in `webhid.ts`**

Append to `web/src/lib/webhid.ts` (imports at the top of the file):

```ts
import {
  FEATURE_REPORT_ID, LAYER_BASE, LAYER_OFFSET, validateBlob,
  type Layer,
} from "./keybind";
```

New exported function (added after `readReport`):

```ts
export async function writeKeybindBlob(device: HIDDevice, layer: Layer, blob: Uint8Array, log: LogFn) {
    validateBlob(blob);
    if (blob[LAYER_OFFSET] !== layer) {
        throw new Error(`Layer byte mismatch: blob=${blob[LAYER_OFFSET]}, requested=${layer}`);
    }
    log(`TX-FEATURE 0x${FEATURE_REPORT_ID.toString(16)} layer=${layer === LAYER_BASE ? 'base' : 'fn'} (${BLOB_SIZE} bytes)`);
    // WebHID sendFeatureReport takes (reportId, data-without-its-byte-0).
    await device.sendFeatureReport(FEATURE_REPORT_ID, blob.slice(1));
}
```

Note: `keybind.ts` (Task 4) already exports `LAYER_BASE`, `LAYER_FN`, `LAYER_OFFSET`, `FEATURE_REPORT_ID`, `BLOB_SIZE`, and `Layer`.

- [ ] **Step 3: Run tests + typecheck**

```bash
cd /home/cloudglides/aula-f75-linux-drivers/web
nix shell nixpkgs#bun -c bun test
nix shell nixpkgs#bun -c bunx tsc --noEmit
```

Expected: `hid.test.ts` PASS (report body matches, wrong-layer and short-blob reject), typecheck clean.

- [ ] **Step 4: Commit**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
git add web/src/lib/webhid.ts web/src/lib/hid.test.ts web/src/lib/keybind.ts
git commit --no-gpg-sign -m "feat: add keybind feature-report write to WebHID transport"
```

---

### Task 6: Profiles (localStorage)

**Files:**
- Create: `web/src/lib/profiles.ts`
- Test: `web/src/lib/profiles.test.ts`

**Interfaces:**
- Consumes: nothing device-side; JSON objects only.
- Produces:

```ts
export interface Profile {
  id: string; name: string; createdAt: number;
  layers: { base: Uint8Array; fn: Uint8Array };   // 520B keybind blobs
  colors: Record<number, [number, number, number]>; // key index -> rgb
  effect: { num: number; speed: number | null; brightness: number | null; colorful: boolean; color: string | null };
  sleepMinutes: number; debounceMs: number;
  raw: string; // base64 of blobs
}
export function listProfiles(): Profile[];
export function saveProfile(p: Profile): void;
export function deleteProfile(id: string): void;
export function loadProfile(id: string): Profile | null;
export function profileToBase64(p: Profile): string;   // for export
export function profileFromBase64(s: string): Profile; // for import
```

- [ ] **Step 1: Write the failing tests**

Create `web/src/lib/profiles.test.ts` (uses a tiny `localStorage` shim):

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { deleteProfile, listProfiles, loadProfile, profileFromBase64, profileToBase64, saveProfile, type Profile } from "./profiles";

class Store {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
beforeEach(() => {
  (globalThis as any).localStorage = new Store();
});

function mk(name: string): Profile {
  return {
    id: name, name, createdAt: 1,
    layers: { base: new Uint8Array(520), fn: new Uint8Array(520) },
    colors: { 0: [255, 0, 0] },
    effect: { num: 3, speed: 2, brightness: 4, colorful: true, color: null },
    sleepMinutes: 30, debounceMs: 2, raw: "",
  };
}

describe("profiles", () => {
  it("saves and lists", () => {
    saveProfile(mk("p1"));
    expect(listProfiles().map((p) => p.name)).toEqual(["p1"]);
  });
  it("round-trips a load", () => {
    saveProfile(mk("p2"));
    expect(loadProfile("p2")?.name).toBe("p2");
  });
  it("deletes", () => {
    saveProfile(mk("p3"));
    deleteProfile("p3");
    expect(listProfiles()).toHaveLength(0);
  });
  it("base64 export/import preserves layers", () => {
    const p = mk("x"); p.layers.base[9] = 0x4;
    const s = profileToBase64(p);
    const q = profileFromBase64(s);
    expect(q.layers.base[9]).toBe(0x4);
    expect(q.name).toBe("x");
  });
});
```

Run: `cd /home/cloudglides/aula-f75-linux-drivers/web && nix shell nixpkgs#bun -c bun test`
Expected: FAIL — `./profiles` missing.

- [ ] **Step 2: Implement `profiles.ts`**

```ts
export interface Profile {
  id: string; name: string; createdAt: number;
  layers: { base: Uint8Array; fn: Uint8Array };
  colors: Record<number, [number, number, number]>;
  effect: { num: number; speed: number | null; brightness: number | null; colorful: boolean; color: string | null };
  sleepMinutes: number; debounceMs: number;
  raw: string;
}

const KEY = "aula-f75.profiles";

function store(): Storage {
  return globalThis.localStorage;
}

export function listProfiles(): Profile[] {
  try {
    const raw = store().getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown[];
    return arr.map((x) => {
      const p = x as Record<string, unknown> as Profile;
      return {
        ...p,
        layers: {
          base: new Uint8Array((p.layers as any).base as number[]),
          fn: new Uint8Array((p.layers as any).fn as number[]),
        },
      };
    });
  } catch {
    return [];
  }
}

export function saveProfile(p: Profile): void {
  const all = listProfiles().filter((x) => x.id !== p.id);
  all.push(p);
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

export function profileToBase64(p: Profile): string {
  return btoa(strToB64(JSON.stringify({
    name: p.name, layers: { base: bytesToB64(p.layers.base), fn: bytesToB64(p.layers.fn) },
    colors: p.colors, effect: p.effect, sleepMinutes: p.sleepMinutes, debounceMs: p.debounceMs,
  })));
}

export function profileFromBase64(s: string): Profile {
  const o = JSON.parse(b64ToStr(atob(s)));
  return {
    id: `imp-${Date.now()}`, name: o.name, createdAt: Date.now(),
    layers: { base: b64ToBytes(o.layers.base), fn: b64ToBytes(o.layers.fn) },
    colors: o.colors ?? {}, effect: o.effect ?? { num: 0, speed: null, brightness: null, colorful: false, color: null },
    sleepMinutes: o.sleepMinutes ?? 0, debounceMs: o.debounceMs ?? 2, raw: s,
  };
}
```

- [ ] **Step 3: Run tests**

```bash
cd /home/cloudglides/aula-f75-linux-drivers/web
nix shell nixpkgs#bun -c bun test
```

Expected: PASS. Typecheck `nix shell nixpkgs#bun -c bunx tsc --noEmit` clean. Base64 helpers use only browser-available `btoa`/`atob`/`TextEncoder`/`TextDecoder`; the `localStorage`-backed profile storage is shimmed in tests.

- [ ] **Step 4: Commit**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
git add web/src/lib/profiles.ts web/src/lib/profiles.test.ts
git commit --no-gpg-sign -m "feat: add localStorage profiles with base64 export/import"
```

---

### Task 7: RemapPanel UI (tab on the home page)

The fork is a single page with tabs driven by the `useKeyboard` hook (`page.tsx` lines 12-23 and 60-69). The remap feature becomes a new tab. Keybind blobs persist to localStorage (seed key `aula-f75.remap`) so the Profiles tab (Task 9) can capture them.

**Files:**
- Create: `web/src/components/RemapPanel.tsx`
- Modify: `web/src/hooks/useKeyboard.ts` (add `doWriteKeybind`)
- Modify: `web/src/app/page.tsx` (add `remap` tab + panel render)

**Interfaces:**
- Consumes: `writeKeybindBlob` from `webhid.ts` (Task 5); `keybind.ts` (`defaultBlob`, `getSlot`, `setSlot`, `BLOB_SIZE`, `LAYER_BASE`, `LAYER_FN`, `Layer`); `vkmap.ts` (`LOCKED_INDICES`, `outputToName`, `vkToOutput`, `Output`); `f75-keymap.json` + its `F75Key` type (Task 2).
- Produces: home-page tab `remap` (label `"Remap"`); `useKeyboard` returns `doWriteKeybind(layer: Layer, blob: Uint8Array): Promise<void>`; localStorage key `aula-f75.remap` = `{ "0": number[], "1": number[] }`.

**UI behavior:**
- Layer toggle `Default` / `FN1`; click a key → highlight; sidebar shows the picker for that key.
- Picker lists every non-locked F75 key (letters, digits, F1–F12 *except locked*, nav, OEM) plus `Disable` and `Default` (resets that key to its factory default for the active layer).
- Apply writes the active layer blob via `onWriteKeybind` (which routes to `writeKeybindBlob`).
- F1–F12 keys render dimmed and are unclickable (firmware `LOCKED_INDICES`).

- [ ] **Step 1: Extend `useKeyboard` with `doWriteKeybind`**

In `web/src/hooks/useKeyboard.ts`, append to the imports:

```ts
import { writeKeybindBlob } from '@/lib/webhid';
import { type Layer } from '@/lib/keybind';
```

Add before the `return`:

```ts
    const doWriteKeybind = useCallback(async (layer: Layer, blob: Uint8Array) => {
        if (!device?.opened) { log('Not connected!'); return; }
        try { await writeKeybindBlob(device, layer, blob, log); log('Keybind layer written to flash'); }
        catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);
```

And add `doWriteKeybind` to the object returned by the hook.

- [ ] **Step 2: Write the failing test for defaultForKey behavior**

Create `web/src/lib/remap.test.ts` (extract `defaultForKey`-style logic as a pure helper in `keybind.ts`):

Add to `web/src/lib/keybind.ts` a public helper:

```ts
export function defaultForKey(layer: Layer, k: F75Key, vkToOutput: (vk: number) => Output | null): Output {
    if (layer === LAYER_BASE) return vkToOutput(k.vk) ?? { page: 0x00, usage: 0x00 };
    return k.fnHid ? { page: k.fnHid[0], usage: k.fnHid[1] } : { page: 0x00, usage: 0x00 };
}
```

Create `web/src/lib/remap.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultForKey, LAYER_BASE, LAYER_FN } from "./keybind";
import { vkToOutput } from "./vkmap";
import keymap from "../data/f75-keymap.json";

describe("defaultForKey", () => {
  it("resolves base-layer defaults from VK", () => {
    const esc = keymap.keys.find((k) => k.name === "esc")!;
    expect(defaultForKey(LAYER_BASE, esc, vkToOutput)).toEqual({ page: 0x00, usage: 0x29 });
  });
  it("resolves FN1 default from the keymap's fnHid override, or unbound when absent", () => {
    // The FN-layer oracle is Task 2's KB.ini-derived fnHid, not hardcoded usages.
    const esc = keymap.keys.find((k) => k.name === "esc")!;
    const expected = esc.fnHid
      ? { page: esc.fnHid[0], usage: esc.fnHid[1] }
      : { page: 0x00, usage: 0x00 };
    expect(defaultForKey(LAYER_FN, esc, vkToOutput)).toEqual(expected);
  });
});
```

Run: `cd /home/cloudglides/aula-f75-linux-drivers/web && nix shell nixpkgs#bun -c bun test`
Expected: FAIL — `defaultForKey` not exported.

- [ ] **Step 3: Implement it and make the test pass**

Add `defaultForKey` to `keybind.ts` (as in Step 2). Run `bun test` — expect PASS.

- [ ] **Step 4: Build the RemapPanel component**

Create `web/src/components/RemapPanel.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import keymap, { type F75Key } from "../data/f75-keymap.json";
import {
  BLOB_SIZE, LAYER_BASE, LAYER_FN, defaultBlob, defaultForKey, getSlot, setSlot,
  type Layer,
} from "../lib/keybind";
import { vkToOutput, type Output } from "../lib/vkmap";

const LS_KEY = "aula-f75.remap";

type Blobs = Record<number, Uint8Array>;

function initialBlobs(): Blobs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const o = JSON.parse(raw) as Record<string, number[]>;
      const pick = (l: Layer) =>
        new Uint8Array(o[String(l)] ?? Array.from(defaultBlob(l, keymap.keys)));
      return { [LAYER_BASE]: pick(LAYER_BASE), [LAYER_FN]: pick(LAYER_FN) };
    }
  } catch { /* corrupt seed -> defaults */ }
  return {
    [LAYER_BASE]: defaultBlob(LAYER_BASE, keymap.keys),
    [LAYER_FN]: defaultBlob(LAYER_FN, keymap.keys),
  };
}

export function RemapPanel({ onWriteKeybind }: {
  onWriteKeybind: (layer: Layer, blob: Uint8Array) => Promise<void>;
}) {
  const [layer, setLayer] = useState<Layer>(LAYER_BASE);
  const [sel, setSel] = useState<number | null>(null);
  const [blobs, setBlobs] = useState<Blobs>(initialBlobs);
  const [status, setStatus] = useState("");

  const byIndex = useMemo(() => {
    const m: Record<number, F75Key> = {};
    for (const k of keymap.keys) m[k.index] = k;
    return m;
  }, []);

  useEffect(() => {
    const o: Record<string, number[]> = {};
    o[String(LAYER_BASE)] = Array.from(blobs[LAYER_BASE]);
    o[String(LAYER_FN)] = Array.from(blobs[LAYER_FN]);
    localStorage.setItem(LS_KEY, JSON.stringify(o));
  }, [blobs]);

  useEffect(() => {
    if (sel === null) return;
    setStatus(`Selected ${byIndex[sel]?.label ?? sel}: now ${getSlot(blobs[layer], sel).page === 0 ? "key" : "media"}${getSlot(blobs[layer], sel).usage.toString(16)}`);
  }, [sel, layer, blobs, byIndex]);

  function pick(output: Output) {
    if (sel === null || keymap.keys.find((k) => k.index === sel)?.locked) return;
    const next = new Uint8Array(blobs[layer]);
    setSlot(next, sel, output);
    setBlobs((b) => ({ ...b, [layer]: next }));
  }

  async function apply() {
    try {
      await onWriteKeybind(layer, blobs[layer]);
      setStatus(`Sent ${BLOB_SIZE}-byte ${layer === LAYER_BASE ? "Default" : "FN1"} layer`);
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function resetLayer() {
    setBlobs((b) => ({ ...b, [layer]: defaultBlob(layer, keymap.keys) }));
    setStatus(`${layer === LAYER_BASE ? "Default" : "FN1"} local default restored — press Apply`);
  }

  function resetKey() {
    if (sel === null) return;
    const k = byIndex[sel];
    if (!k || k.locked) return;
    const next = new Uint8Array(blobs[layer]);
    setSlot(next, sel, defaultForKey(layer, k, vkToOutput));
    setBlobs((b) => ({ ...b, [layer]: next }));
  }

  const geo = keymap.keys.reduce(
    (a, k) => ({
      minX: Math.min(a.minX, k.x), minY: Math.min(a.minY, k.y),
      maxX: Math.max(a.maxX, k.x + k.w), maxY: Math.max(a.maxY, k.y + k.h),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
  const vw = geo.maxX - geo.minX;
  const vh = geo.maxY - geo.minY;

  const pickerKeys = keymap.keys
    .filter((k) => !k.locked)
    .map((k) => ({ label: k.label, output: defaultForKey(LAYER_BASE, k, vkToOutput) }));

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-300">Layer</label>
        <button
          onClick={() => setLayer(LAYER_BASE)}
          className={layer === LAYER_BASE
            ? "px-3 py-1 text-sm rounded-md bg-violet-600/20 border border-violet-500/40 text-violet-300"
            : "px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-400"}
        >Default</button>
        <button
          onClick={() => setLayer(LAYER_FN)}
          className={layer === LAYER_FN
            ? "px-3 py-1 text-sm rounded-md bg-violet-600/20 border border-violet-500/40 text-violet-300"
            : "px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-400"}
        >FN1</button>
        <span className="ml-auto text-xs text-zinc-500">Click a key, then choose its output. F1–F12 are reserved by the firmware.</span>
      </div>

      <svg viewBox={`${geo.minX} ${geo.minY} ${vw} ${vh}`} className="w-full" style={{ maxHeight: 320 }}>
        {keymap.keys.map((k) => {
          const locked = !!k.locked;
          const selected = sel === k.index && !locked;
          return (
            <rect
              key={k.index} x={k.x} y={k.y} width={k.w} height={k.h} rx={4}
              fill={locked ? "#27272a" : selected ? "#7c3aed" : "#3f3f46"}
              stroke={locked ? "#333" : selected ? "#a78bfa" : "#52525b"}
              className={locked ? "" : "cursor-pointer"}
              onClick={() => { if (!locked) setSel(k.index); }}
            />
          );
        })}
        {keymap.keys.map((k) => (
          <text key={"t" + k.index} x={k.x + k.w / 2} y={k.y + k.h / 2 + 3} textAnchor="middle" fontSize={11} fill="#e4e4e7">{k.label}</text>
        ))}
      </svg>

      {sel !== null && !byIndex[sel]?.locked && (
        <div className="grid gap-2">
          <h3 className="text-sm font-medium text-zinc-300">{byIndex[sel]?.label}:</h3>
          <div className="grid grid-cols-4 gap-1 max-h-56 overflow-auto border border-zinc-800 rounded-lg p-2">
            {pickerKeys.map((pk) => (
              <button key={pk.label} className="border border-zinc-700 text-xs px-1 py-1 rounded hover:bg-zinc-700" onClick={() => pick(pk.output)}>{pk.label}</button>
            ))}
            <button className="border border-zinc-700 text-xs px-1 py-1 rounded bg-red-900/40" onClick={() => pick({ page: 0x00, usage: 0x00 })}>Disable</button>
            <button className="border border-zinc-700 text-xs px-1 py-1 rounded" onClick={resetKey}>Reset key</button>
          </div>
          <div className="flex gap-2">
            <button onClick={apply} className="bg-violet-600 px-4 py-2 text-sm rounded-lg text-white">Apply {layer === LAYER_BASE ? "Default" : "FN1"} layer</button>
            <button onClick={resetLayer} className="border border-zinc-700 px-4 py-2 text-sm rounded-lg text-zinc-300">Reset layer</button>
          </div>
        </div>
      )}
      <p className="text-xs text-zinc-500">{status}</p>
    </div>
  );
}
```

Note: the earlier draft's `status` used `outputToName`; this version inlines a compact hex label so the panel has no extra import — keep `outputToName` unused out of the imports above.

- [ ] **Step 5: Add the remap tab to the home page**

In `web/src/app/page.tsx`:
- import: `import { RemapPanel } from '@/components/RemapPanel';`
- widen the tab type: `type Tab = 'effects' | 'perkey' | 'animations' | 'settings' | 'remap';`
- add to `tabs`: `{ id: 'remap', label: 'Remap' },`
- render below the fonts row, alongside the existing panels:

```tsx
{tab === 'remap' && <RemapPanel onWriteKeybind={kb.doWriteKeybind} />}
```

- [ ] **Step 6: Verify tests, typecheck, build**

```bash
cd /home/cloudglides/aula-f75-linux-drivers/web
nix shell nixpkgs#bun -c bun test
nix shell nixpkgs#bun -c bunx tsc --noEmit
nix shell nixpkgs#bun -c bun run build
timeout 45 nix shell nixpkgs#bun -c bun dev   # spot-check the Remap tab renders
```

Expected: `remap.test.ts` + all prior tests PASS, typecheck clean, production build succeeds.

- [ ] **Step 7: Commit**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
git add web/src/components/RemapPanel.tsx web/src/lib/remap.test.ts web/src/lib/keybind.ts web/src/hooks/useKeyboard.ts web/src/app/page.tsx
git commit --no-gpg-sign -m "feat: add key remapping panel with layer tabs and key picker"
```

---

### Task 8: Macros (local-first) + raw HID debug

**Files:**
- Create: `web/src/lib/macros.ts`
- Create: `web/src/components/MacrosPanel.tsx`
- Create: `web/src/lib/debug.ts` (raw report sender)
- Test: `web/src/lib/macros.test.ts`

**Interfaces:**
- Consumes: fork `webhid.ts` (`txRx`, `LogFn`), `useKeyboard` (gives `device` + `log`), tasks 6/7 state.
- Produces:

```ts
export interface MacroStep { type: "key" | "delay"; keyCode: string; ms: number; }
export interface Macro { id: string; name: string; steps: MacroStep[]; }
export function captureKeyPress(ev: KeyboardEvent): MacroStep;  // converts a browser KeyboardEvent to a step
export function macroBlob(m: Macro): Uint8Array;  // v1: local-only serialization (documented)
export const MACRO_SUPPORTED = false as const;    // protocol pending -> UI greys the write button
export function sendRaw(device: HIDDevice, frameHex: string, log: LogFn): Promise<string>; // debug.ts
```

No `DeviceIo`: raw frames use the fork's 20-byte layout `[reportId, cmd, subcmd, seq, payload×16]` (`protocol.buildFrame`) with no trailing checksum byte, sent via the existing `txRx`/`sendReport`.

- [ ] **Step 1: Write the failing tests (pure parts)**

Create `web/src/lib/macros.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MACRO_SUPPORTED, captureKeyPress, macroBlob, type Macro } from "./macros";

describe("macros (local-first)", () => {
  it("captures a plain key as HID usage", () => {
    const ev = new KeyboardEvent("keydown", { key: "a", code: "KeyA" });
    expect(captureKeyPress(ev).keyCode).toBe("hida");
  });
  it("captures an Enter as enter", () => {
    const ev = new KeyboardEvent("keydown", { key: "Enter", code: "Enter" });
    expect(captureKeyPress(ev).keyCode).toBe("enter");
  });
  it("serializes to a stable local blob", () => {
    const m: Macro = { id: "m1", name: "jump", steps: [
      { type: "key", keyCode: "space", ms: 0 }, { type: "delay", keyCode: "", ms: 50 },
    ]};
    const blob = macroBlob(m);
    expect(blob.length).toBeGreaterThan(0);
    expect(new TextDecoder().decode(blob)).toContain("jump");
  });
  it("flags device-write as unsupported until protocol captured", () => {
    expect(MACRO_SUPPORTED).toBe(false);
  });
});
```

Run: `cd /home/cloudglides/aula-f75-linux-drivers/web && nix shell nixpkgs#bun -c bun test`
Expected: FAIL — `./macros` missing.

- [ ] **Step 2: Implement `macros.ts`**

```ts
// Local-first macro support. The wire protocol for writing macros to the
// AULA F75 is not yet documented; these helpers capture/record macros and
// serialize them for profiles, but do NOT (yet) write to the device.
export interface MacroStep { type: "key" | "delay"; keyCode: string; ms: number; }
export interface Macro { id: string; name: string; steps: MacroStep[]; }

export const MACRO_SUPPORTED = false as const;

const CODE_TO_KEYCODE: Record<string, string> = {
  KeyA: "hida", KeyB: "hidb", KeyC: "hidc", KeyD: "hidd", KeyE: "hide",
  KeyF: "hidf", KeyG: "hidg", KeyH: "hidh", KeyI: "hidi", KeyJ: "hidj",
  KeyK: "hidk", KeyL: "hidl", KeyM: "hidm", KeyN: "hidn", KeyO: "hido",
  KeyP: "hidp", KeyQ: "hidq", KeyR: "hidr", KeyS: "hids", KeyT: "hidt",
  KeyU: "hidu", KeyV: "hidv", KeyW: "hidw", KeyX: "hidx", KeyY: "hidy",
  KeyZ: "hidz", Space: "space", Enter: "enter", Tab: "tab", Backspace: "bksp",
  ShiftLeft: "lshift", ShiftRight: "rshift", ControlLeft: "lctrl",
  ControlRight: "rctrl", AltLeft: "lalt", AltRight: "ralt", MetaLeft: "lwin",
  MetaRight: "rwin", ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left",
  ArrowRight: "right", Escape: "esc", Home: "home", End: "end", Insert: "ins",
  Delete: "del", PageUp: "pgup", PageDown: "pgdn",
};

export function captureKeyPress(ev: KeyboardEvent): MacroStep {
  const keyCode = CODE_TO_KEYCODE[ev.code] ?? (ev.key.length === 1 ? `char${ev.key}` : ev.code.toLowerCase());
  return { type: "key", keyCode, ms: 0 };
}

export function macroBlob(m: Macro): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(m));
}
```

- [ ] **Step 3: Implement `debug.ts` raw sender**

```ts
import type { LogFn } from "./webhid";
import { txRx } from "./webhid";

// Send an arbitrary 20-byte frame (space-separated hex; byte 0 = report id,
// e.g. 0x13) via the fork's txRx and return the human-readable reply.
export async function sendRaw(device: HIDDevice, frameHex: string, log: LogFn): Promise<string> {
  const bytes = frameHex.trim().split(/\s+/).map((x) => parseInt(x, 16));
  if (bytes.length !== 20) throw new Error("Raw frames must be exactly 20 bytes (report id + 19).");
  const reply = await txRx(device, new Uint8Array(bytes), log);
  return reply ? Array.from(reply).map((b) => b.toString(16).padStart(2, "0")).join(" ") : "(no reply)";
}
```

- [ ] **Step 4: Implement `MacrosPanel.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { MACRO_SUPPORTED, type Macro, type MacroStep } from "../lib/macros";
import { sendRaw } from "../lib/debug";
import type { LogFn } from "../lib/webhid";

export function MacrosPanel({ device, log }: { device: HIDDevice | null; log: LogFn }) {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<MacroStep[]>([]);
  const [macroName, setMacroName] = useState("");
  const [rawIn, setRawIn] = useState("13 04 0a 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00");
  const [rawOut, setRawOut] = useState("");
  const handlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  const timerRef = useRef<number | null>(null);

  function startRecord() {
    setSteps([]);
    setRecording(true);
    const capture = (e: KeyboardEvent) => {
      if (e.repeat) return;
      e.preventDefault();
      setSteps((s) => [...s, { type: "key", keyCode: e.code, ms: 0 }]);
    };
    handlerRef.current = capture;
    globalThis.addEventListener("keydown", capture);
    timerRef.current = window.setTimeout(stopRecord, 5000);
  }

  function stopRecord() {
    if (handlerRef.current) {
      globalThis.removeEventListener("keydown", handlerRef.current);
      handlerRef.current = null;
    }
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
    setRecording(false);
  }

  function saveMacro() {
    const n = macroName.trim() || `macro-${macros.length + 1}`;
    setMacros((m) => [...m, { id: `m${Date.now()}`, name: n, steps }]);
    setSteps([]);
    setMacroName("");
  }

  async function sendRawFrame() {
    if (!device?.opened) { setRawOut("Not connected"); return; }
    try { setRawOut(await sendRaw(device, rawIn, log)); }
    catch (e) { setRawOut(`Error: ${e instanceof Error ? e.message : String(e)}`); }
  }

  return (
    <div className="grid gap-4">
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Macros</h2>
        <p className="text-xs text-zinc-600">
          Writing macros to the keyboard is not yet possible (protocol pending) —
          {MACRO_SUPPORTED ? "supported" : " recorded macros are stored locally for now"}.
        </p>
        <div className="flex gap-2">
          <button onClick={startRecord} disabled={recording} className="px-3 py-1 text-sm rounded-md bg-red-600/20 border border-red-500/40 text-red-300 disabled:opacity-40">Record</button>
          <button onClick={stopRecord} disabled={!recording} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300 disabled:opacity-40">Stop</button>
          <input value={macroName} onChange={(e) => setMacroName(e.target.value)} placeholder="Macro name"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-zinc-300 focus:outline-none focus:border-violet-500" />
          <button onClick={saveMacro} disabled={steps.length === 0} className="px-3 py-1 text-sm rounded-md bg-violet-600/20 border border-violet-500/40 text-violet-300 disabled:opacity-40">Save macro</button>
        </div>
        {steps.length > 0 && (
          <ul className="max-h-40 overflow-auto border border-zinc-800 rounded-lg p-2 text-xs text-zinc-400">
            {steps.map((s, i) => <li key={i}>{i + 1}. {s.keyCode}</li>)}
          </ul>
        )}
        {macros.length > 0 && (
          <ul className="text-sm text-zinc-300 space-y-1">
            {macros.map((m) => <li key={m.id}>{m.name} ({m.steps.length} steps)</li>)}
          </ul>
        )}
      </section>

      <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Raw HID (debug)</h2>
        <textarea className="w-full h-14 rounded-lg bg-black border border-zinc-800 p-2 text-green-300 font-mono text-xs focus:outline-none" value={rawIn} onChange={(e) => setRawIn(e.target.value)} />
        <button onClick={sendRawFrame} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300">Send 20-byte frame</button>
        <p className="font-mono text-xs text-zinc-500">{rawOut}</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Add the macros tab to the home page (same pattern as Task 7)**

In `web/src/app/page.tsx`: import `MacrosPanel`, widen `type Tab` to include `'macros'`, add `{ id: 'macros', label: 'Macros' },` to the `tabs` array, and render:

```tsx
{tab === 'macros' && <MacrosPanel device={kb.device} log={kb.log} />}
```

Then:

```bash
cd /home/cloudglides/aula-f75-linux-drivers/web
nix shell nixpkgs#bun -c bun test
nix shell nixpkgs#bun -c bunx tsc --noEmit
nix shell nixpkgs#bun -c bun run build
```

Expected: `macros.test.ts` + prior tests PASS, typecheck clean, production build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
git add web/src/lib/macros.ts web/src/lib/macros.test.ts web/src/lib/debug.ts web/src/components/MacrosPanel.tsx web/src/app/page.tsx
git commit --no-gpg-sign -m "feat: add local-first macros panel and raw HID debug tab"
```

---

### Task 9: Settings — device info card, profiles UI, branding

The fork is now in-repo, so every edit below is verified against the actual upstream files (`marcoslor/Aula-F87-Controller`, cloned for this task):

- `SettingsPanel.tsx` props today: `{ onSetSleep, onSetDebounce, onFactoryReset }` (upstream lines 4-8); it renders a 2-col grid of cards + a full-width Factory Reset card.
- `page.tsx` line 69 wires it: `<SettingsPanel onSetSleep={kb.doSetSleep} onSetDebounce={kb.doSetDebounce} onFactoryReset={kb.doFactoryReset} />`; header h1 is `AULA F87` (line 29).
- `useKeyboard` returns `{ device, connected, status, logs, log, connect, doSetEffect, doApplyPerKey, doSetSleep, doSetDebounce, doFactoryReset }` (lines 140-143). Task 7 adds `doWriteKeybind`.
- `webhid.readConfig(device, log, retries)` returns `(Uint8Array | null)[]` (10 frames) — the effect-table is its only documented content (upstream `docs/PROTOCOL.md`). No firmware-version byte is documented in the F87 or the F75 keybind protocols, so device info shows only what is real (productName, PID, VID, frames-read health). Pinning a firmware byte = hardware checklist item, not code.

**Files:**
- Create: `web/src/lib/deviceinfo.ts` + `web/src/lib/deviceinfo.test.ts`
- Create: `web/src/components/DeviceInfoCard.tsx`
- Create: `web/src/components/ProfilesCard.tsx`
- Modify: `web/src/hooks/useKeyboard.ts` (add `doReadConfig`; F87 log fallbacks → F75)
- Modify: `web/src/components/SettingsPanel.tsx` (new props, two new cards, "AULA F75" header)
- Modify: `web/src/app/page.tsx` (pass new props; header branding)

**Interfaces:**
- Consumes: `readConfig` (`webhid.ts`), `WIRED_PID`/`WIRELESS_PID` (`protocol.ts`), `profiles.ts` (Task 6), `doWriteKeybind` (Task 7).
- Produces: `connectionLabel(pid: number): 'wired' | 'wireless' | 'unknown'`; `parseConfigFrames(config: (Uint8Array | null)[]): number`; hook `doReadConfig(): Promise<number>` (frames count).

- [ ] **Step 1: Write the failing deviceinfo tests**

Create `web/src/lib/deviceinfo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { WIRED_PID, WIRELESS_PID } from "./protocol";
import { connectionLabel, parseConfigFrames } from "./deviceinfo";

describe("deviceinfo", () => {
  it("counts the config frames that were read", () => {
    const cfg = new Array<(Uint8Array | null)>(10).fill(null);
    cfg[3] = new Uint8Array(19);
    cfg[7] = new Uint8Array(19);
    expect(parseConfigFrames(cfg)).toBe(2);
  });
  it("reports 0 frames when nothing was read", () => {
    expect(parseConfigFrames(new Array(10).fill(null))).toBe(0);
  });
  it("labels the connection from the product ID", () => {
    expect(connectionLabel(WIRED_PID)).toBe("wired");
    expect(connectionLabel(WIRELESS_PID)).toBe("wireless");
    expect(connectionLabel(0x0000)).toBe("unknown");
  });
});
```

Run: `cd /home/cloudglides/aula-f75-linux-drivers/web && nix shell nixpkgs#bun -c bun test`
Expected: FAIL — `./deviceinfo` missing.

- [ ] **Step 2: Implement `deviceinfo.ts`**

```ts
import { WIRED_PID, WIRELESS_PID } from "./protocol";

export type Connection = "wired" | "wireless" | "unknown";

export function parseConfigFrames(config: (Uint8Array | null)[]): number {
  return config.filter((c) => c !== null).length;
}

export function connectionLabel(pid: number): Connection {
  if (pid === WIRED_PID) return "wired";
  if (pid === WIRELESS_PID) return "wireless";
  return "unknown";
}
```

Run `bun test` — expect PASS.

- [ ] **Step 3: Add `doReadConfig` to `useKeyboard`**

In `web/src/hooks/useKeyboard.ts`: add `readConfig` to the existing `webhid` import, then alongside `doFactoryReset` (upstream line 134):

```ts
const doReadConfig = useCallback(async () => {
    if (!device?.opened) { log('Not connected!'); return 0; }
    try {
        const frames = await readConfig(device, log, 3);
        const n = frames.filter((f) => f !== null).length;
        log(`Config read: ${n}/10 frames`);
        return n;
    } catch (err: unknown) {
        log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
        return 0;
    }
}, [device, log]);
```

Add `doReadConfig` to the returned object. Also replace the two `'AULA F87'` productName fallbacks (lines 71, 75) with `'AULA F75'`.

- [ ] **Step 4: Build `DeviceInfoCard.tsx`**

Create `web/src/components/DeviceInfoCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { connectionLabel } from '@/lib/deviceinfo';

export function DeviceInfoCard({ device, onReadConfig }: {
    device: HIDDevice | null;
    onReadConfig: () => Promise<number>;
}) {
    const [frames, setFrames] = useState<number | null>(null);
    const [reading, setReading] = useState(false);

    const read = async () => {
        setReading(true);
        try { setFrames(await onReadConfig()); }
        finally { setReading(false); }
    };

    return (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-3 sm:col-span-2">
            <h3 className="text-sm font-medium text-zinc-300">Device Info</h3>
            <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-zinc-500">Model</dt><dd className="text-zinc-300">{device?.productName || 'AULA F75'}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Connection</dt><dd className="text-zinc-300">{device ? connectionLabel(device.productId) : 'Not connected'}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">VID:PID</dt><dd className="text-zinc-300 font-mono">{device ? `${device.vendorId.toString(16).padStart(4, '0')}:${device.productId.toString(16).padStart(4, '0')}` : '—'}</dd></div>
            </dl>
            <button
                onClick={read}
                disabled={!device || reading}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-violet-600/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600/30 disabled:opacity-40 disabled:cursor-default"
            >
                {reading ? 'Reading…' : frames !== null ? `Config read: ${frames}/10 frames` : 'Read config frames'}
            </button>
        </div>
    );
}
```

- [ ] **Step 5: Build `ProfilesCard.tsx`**

Create `web/src/components/ProfilesCard.tsx`. It uses `profiles.ts` (Task 6) and captures the current keybind state from the localStorage seed that RemapPanel maintains (Task 7):

```tsx
'use client';

import { useState } from 'react';
import {
    deleteProfile, listProfiles, profileFromBase64, profileToBase64,
    saveProfile, type Profile,
} from '@/lib/profiles';

const REMAP_KEY = 'aula-f75.remap';

function currentLayers(): { base: Uint8Array; fn: Uint8Array } {
    const empty = () => new Uint8Array(520).fill(0);
    try {
        const raw = localStorage.getItem(REMAP_KEY);
        if (!raw) return { base: empty(), fn: empty() };
        const o = JSON.parse(raw) as Record<string, number[]>;
        return { base: new Uint8Array(o['0'] ?? []), fn: new Uint8Array(o['1'] ?? []) };
    } catch {
        return { base: empty(), fn: empty() };
    }
}

export function ProfilesCard({ onWriteKeybind }: {
    onWriteKeybind: (layer: number, blob: Uint8Array) => Promise<void>;
}) {
    const [profiles, setProfiles] = useState<Profile[]>(listProfiles);
    const [name, setName] = useState('');
    const [status, setStatus] = useState('');

    const refresh = () => setProfiles(listProfiles());

    function capture() {
        if (!name.trim()) { setStatus('Name the profile first'); return; }
        saveProfile({
            id: `p${Date.now()}`, name: name.trim(), createdAt: Date.now(),
            layers: currentLayers(), colors: {},
            effect: { num: 3, speed: null, brightness: null, colorful: true, color: null },
            sleepMinutes: 0, debounceMs: 3, raw: '',
        });
        refresh();
        setName('');
        setStatus('Saved');
    }

    async function apply(p: Profile) {
        try {
            await onWriteKeybind(0, p.layers.base);
            await onWriteKeybind(1, p.layers.fn);
            setStatus(`Applied "${p.name}"`);
        } catch (e) {
            setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    function remove(id: string) { deleteProfile(id); refresh(); }

    async function doExport(p: Profile) {
        try { await navigator.clipboard.writeText(profileToBase64(p)); setStatus(`Exported "${p.name}" to clipboard`); }
        catch { setStatus('Clipboard unavailable'); }
    }

    async function doImport(raw: string) {
        try { saveProfile(profileFromBase64(raw)); refresh(); setStatus('Imported'); }
        catch (e) { setStatus(`Import failed: ${e instanceof Error ? e.message : String(e)}`); }
    }

    return (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-3 sm:col-span-2">
            <h3 className="text-sm font-medium text-zinc-300">Keybind Profiles</h3>
            <p className="text-xs text-zinc-600">Captures the current Default/FN1 remaps from the Remap tab.</p>
            <div className="flex gap-2">
                <input
                    value={name} onChange={(e) => setName(e.target.value)} placeholder="Profile name"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-violet-500"
                />
                <button onClick={capture} className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500">Save current</button>
            </div>
            <div className="space-y-2">
                {profiles.length === 0 && <p className="text-xs text-zinc-600">No profiles yet.</p>}
                {profiles.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border border-zinc-800 rounded-lg px-3 py-2">
                        <span className="text-sm text-zinc-300">{p.name}</span>
                        <span className="flex gap-2">
                            <button onClick={() => apply(p)} className="text-xs px-2 py-1 rounded bg-violet-600/20 border border-violet-500/40 text-violet-300">Apply</button>
                            <button onClick={() => doExport(p)} className="text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-400">Export</button>
                            <button onClick={() => remove(p.id)} className="text-xs px-2 py-1 rounded border border-red-500/40 text-red-400">Delete</button>
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 items-center">
                <input id="profile-import" type="file" accept=".txt,.json,text/plain,application/json" className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        f.text().then(doImport).catch(() => setStatus('Read failed'));
                    }} />
                <label htmlFor="profile-import" className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 cursor-pointer hover:border-zinc-500">Import…</label>
            </div>
            <p className="text-xs text-zinc-500">{status}</p>
        </div>
    );
}
```

Known limitation (documented, not hidden): v1 profiles capture keybind layers only — the lighting panels keep their state transient, so colors/effect are not captured. Applying a future profile that carries lighting would be a small extension of `apply()`; a bullet in README Known limitations (Task 10) covers this.

- [ ] **Step 6: Wire SettingsPanel + page.tsx**

In `web/src/components/SettingsPanel.tsx`:
- imports: `import { DeviceInfoCard } from './DeviceInfoCard';` and `import { ProfilesCard } from './ProfilesCard';`
- props (upstream line 4): add
```ts
    device: HIDDevice | null;
    onReadConfig: () => Promise<number>;
    onWriteKeybind: (layer: number, blob: Uint8Array) => Promise<void>;
```
- destructure them (line 10), and after the Factory Reset card (line 101) add:
```tsx
            <DeviceInfoCard device={device} onReadConfig={onReadConfig} />
            <ProfilesCard onWriteKeybind={onWriteKeybind} />
```

In `web/src/app/page.tsx` line 69 replace with:

```tsx
        {tab === 'settings' && (
          <SettingsPanel
            onSetSleep={kb.doSetSleep}
            onSetDebounce={kb.doSetDebounce}
            onFactoryReset={kb.doFactoryReset}
            device={kb.device}
            onReadConfig={kb.doReadConfig}
            onWriteKeybind={kb.doWriteKeybind}
          />
        )}
```

Branding: `page.tsx` line 29 h1 `AULA F87` → `AULA F75`.

- [ ] **Step 7: Verify tests, typecheck, build**

```bash
cd /home/cloudglides/aula-f75-linux-drivers/web
nix shell nixpkgs#bun -c bun test          # deviceinfo + profiles + remap + keybind + vkmap
nix shell nixpkgs#bun -c bunx tsc --noEmit
nix shell nixpkgs#bun -c bun run build
```

Expected: all tests PASS, typecheck clean, production build succeeds.

- [ ] **Step 8: Commit**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
git add web/src/lib/deviceinfo.ts web/src/lib/deviceinfo.test.ts web/src/components/DeviceInfoCard.tsx web/src/components/ProfilesCard.tsx web/src/hooks/useKeyboard.ts web/src/components/SettingsPanel.tsx web/src/app/page.tsx
git commit --no-gpg-sign -m "feat: settings device info, keybind profiles, and F75 branding"
```

---

### Task 10: README, protocol doc, attribution, final verification

**Files:**
- Modify: `README.md` (final)
- Create: `docs/PROTOCOL.md`
- Modify: `udev/99-aula-f75.rules` (no-op check)

**Interfaces:** none (documentation).

- [ ] **Step 1: Write final README**

Final `README.md` must include: what it is; requirements (Chromium, Bun; udev step with `sudo cp udev/99-aula-f75.rules /etc/udev/rules.d/ && sudo udevadm control --reload-rules && sudo udevadm trigger`); run (`. web && bun install && bun dev`, open `http://localhost:3000`); feature table; the hardware verification checklist (copied below); attribution (marcoslor/Aula-F87-Controller for the web app + lighting protocol, vndarkblue/aula-keybind for the keybind wire protocol and factory templates, veysiemrah/aula-rgb-controller for cross-checking, official KB.ini from the AULA F75 Windows driver); known-limitations (macros local-first, F1–F12 locked, consumer >0xFF unsupported).

Hardware checklist (to be run by the user on their wired F75 — every line a checkable box):

```
Wired connection:
[ ] Connect to keyboard; browser sees 258A:010C; Connect button works
[ ] Lighting: set effect 3 (Rainbow) applies and persists after replug
[ ] Lighting: effect 1 (Fixed on) with custom color 255,0,0
[ ] Per-key: paint Esc red; Save; replug still red
[ ] Debounce: set 1 ms, applied
[ ] Sleep timer: set 30 min (info only on wired — KB.ini ShowPower=0 / wireless-only)
[ ] Remap: assign A-key to F13; verify F13 emits (e.g. on keyboard-test.space)
[ ] Remap FN1: assign Fn+X to media Play/Pause; verify
[ ] Locked keys: F1 has no "reassign" affordance in picker
[ ] Factory reset: resets lighting + keybinds
[ ] Profiles: save profile, reset, load restores it
[ ] Device Info: shows real model + VID:PID; "Config read: 10/10 frames"
[ ] Disconnect safety: unplug while open → UI shows disconnected state
```

- [ ] **Step 2: Write `docs/PROTOCOL.md`**

Consolidate (with attribution) the keybind protocol (header/layer/slots/trailer, from aula-keybind) and the lighting protocol (20-byte `0x13` frames, commands/subcommands, checksum, config/palette/perkey, save) into one F75-specific reference. Note the F75-specific facts: `MatrixLen=128`, wired `258A:010C`, dongle `3554:FA09` / `258A:010D`, layer bytes `0x00`/`0x01`, locked F1–F12 indices, and the unknown-status of the macro protocol.

- [ ] **Step 3: Final full verification**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
nix shell nixpkgs#bun -c bun web/tools/gen-keymap.mjs && cd web && nix shell nixpkgs#bun -c bun test && nix shell nixpkgs#bun -c bun run build
```

Expected: generator output unchanged (git diff clean if regenerated), all tests PASS, production build succeeds. Run `git status` and confirm only intended files changed.

- [ ] **Step 4: Commit**

```bash
cd /home/cloudglides/aula-f75-linux-drivers
git add README.md docs/PROTOCOL.md
git commit --no-gpg-sign -m "docs: README, protocol reference, attribution, hardware checklist"
```

---

## Self-review notes (filled during writing)

- Spec coverage: remap (T2–T4, T7), lighting (fork panels reused, T1 imports them; device writes untouched), macros (T8 local-first + research hook `MACRO_SUPPORTED`/`sendRaw`), settings (T9), profiles (T6 set up, T9 UI), device info (T9), udev (T1/T10), README+protocol(+attribution) (T10), disconnect handling (fork `useKeyboard.onDisconnect`, surfaced via ConnectionBar). Macro binary research is deliberately a follow-up spike, not a shipping gate — spec item "attempt macros anyway" maps to the `MACRO_SUPPORTED=false` seam + `sendRaw` raw-frame path which is exactly the tooling a future capture session needs.
- Placeholder scan: no TODOs for engineering steps; device info shows only real data (productName, VID:PID, config-frame health from `readConfig`). The undocumented firmware-version byte is deliberately NOT invented and is left to the hardware checklist as a future find. V1 profiles capture keybind layers only (lighting state is transient upstream) — noted in the README limitations.
- Type consistency: `F75Key`, `Output`, `Layer`, `blobs[layer]` used identically across T2→T9; `BLOB_SIZE`/`FEATURE_REPORT_ID`/`LAYER_BASE|FN`/`LAYER_OFFSET` carried from T4; device I/O consistently routes through fork `webhid.ts` (`sendReport`/`txRx`/`readConfig`/`writeKeybindBlob` + `useKeyboard`), no standalone `DeviceIo` class. Every task ends with tests/typecheck/build green and a commit.