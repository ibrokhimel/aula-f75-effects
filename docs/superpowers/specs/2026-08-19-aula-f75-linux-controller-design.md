# AULA F75 Linux Controller — Design

- Date: 2026-08-19
- Status: Approved (brainstormed with user)
- Product: web app (WebHID) giving Windows-driver parity for the AULA F75 keyboard, running locally in Chromium on Linux.

## Context

The Windows driver for the AULA F75 (`AULA F75 Setup v2.0 20240509.exe`, an Inno Setup
installer) does not run under VMware/Linux. The goal is a native-Linux tool that
replicates its functionality. The official installer was reverse-engineered by us; the
community has already documented the underlying SinoWealth (`258A`) HID protocol for the
sibling AULA F87/F75 family.

### Evidence gathered

- The installer (`AULA F75 Setup v2.0 20240509.exe`) is Inno Setup 5.3.3. Extracted with
  `innoextract`. The payload is `app/OemDrv.exe` (Delphi/MFC device app) plus layout data:
  - `app/Dev/kb/1/KB.ini` — F75 wireless+wired model. `VID=0x258a PID=0x010C`,
    `VID_Wireless=0x3554 PID_Wireless=0xfa09`, `MatrixLen=128`, `Fw=24`.
  - `app/Dev/kb/wired/KB.ini` — wired-only model (`PID_Wireless=0`).
  - `app/Dev/kb/F75KR/KB.ini` — F75 KR variant.
  - `app/Text/en/text.xml` — full UI feature list (key assignment, macros, media/system
    commands, lighting effects, per-key color, sleep, debounce, profiles, reset).
- `OemDrv.exe` strings confirm HID feature-report transport with command IDs, CRC checks
  (`AccessData: SetFeature nErr=%d, nCmdID=%x`, `CRC err`), and chipsets
  `CDev916KB`, `CDev3632`, `CDevG5KB`, `CDevComboFilm`.
- Community reverse engineering (verified on AULA F87, confirmed on F75 — same firmware
  family / SinoWealth chipset):
  - `vndarkblue/aula-keybind` — keybind wire protocol: 520-byte HID Feature Report
    `0x06` on HID interface #1, `SET_REPORT`. Layer byte selects Default (`0x00`) or Fn
    (`0x01`). Slot per LED: `[page, mod, mod, usage]`, stride 4, `usage_off = 0x0B + 4*led`.
  - `marcoslor/Aula-F87-Controller` — lighting/per-key/settings webapp + Python CLI and
    protocol: 20-byte frames, Report ID `0x13`, `CMD_READ 0x44`, `CMD_WRITE 0x04`,
    `CMD_COLOR 0x09`, `CMD_PERKEY 0x02`, `CMD_SAVE 0x0A`, subcommands
    `CONFIG 0x0A` / `PALETTE 0x25` / `PERKEY 0x1C` / `CONFIRM 0x01`, frame checksum.
  - `veysiemrah/aula-rgb-controller` — C11 GTK4 suite for the same family; protocol
    notes cross-check.

### Key facts that shape the design

- USB identifiers: wired `258A:010C`; 2.4 GHz dongle `3554:FA09` (driver config) and
  `258A:010D` (aula-keybind). Bluetooth is out of scope (WebHID cannot reach it).
- F75 has **two remappable layers**: Default and FN1. `[FN1]` in the F75 KB.ini only
  overrides Esc, so FN1 defaults are mostly unbound. There is no FN2 section in this
  layout.
- `GET_REPORT(0x06)` returns flash/status noise on this firmware — remap is
  **write-only read-modify-write** seeded from a default template.
- **F1–F12 row is locked** by firmware; the OEM app refuses to rebind it. The remapper
  must exclude those keys.
- KB.ini `[KEY]` entries encode defaults as category byte + **Windows VK code** +
  matrix index (`Esc = 0x02,0x1B,0x00,0` → VK_ESCAPE=0x1B, matrix index 0). Slot blobs
  store **HID usages**, so a VK → HID usage translation table is required.
- F87 KB matrix indices (in the fork's `KB_ROWS`) match the F75 KB.ini indices exactly.

## Goals

Full functional parity with the Windows driver for a wired AULA F75:

1. Key remapping — Default + FN1 layers, saved to the keyboard's flash.
2. Macros — record/edit/assign. (Acknowledged hard: wire protocol undocumented; see
   Macros track.)
3. Lighting — effects, per-key RGB, brightness/speed/color, custom per-key colors.
4. Settings — sleep timer (wireless), debounce, factory reset, device info
   (model/firmware), reset-to-defaults.
5. Profiles — save/restore full configurations.
6. Runs in Chromium on Linux via WebHID; zero-install for the user beyond a udev rule.

Non-goals: Bluetooth support, firmware/EFI bootloader flashing, cloud sync (the OEM
"Sharing Center"), mouse features, music-reactive FX (audio capture is out of scope
for v1).

## Stack

- Fork/adapt `marcoslor/Aula-F87-Controller` `web/` (Next.js 14 + TypeScript + React +
  Tailwind, Bun). Upstream is unlicensed — attribute clearly in README; keep the
  protocol ported code recognizable (it is). Alternatives to a framework were presented
  and the fork approach was chosen.
- Runtime: Chromium-family browser → WebHID (`navigator.hid`), served from `localhost`
  (a secure context) via `bun dev` or a static server.
- Udev rule so non-root users can open `/dev/hidraw*`.

## Architecture

```
web/src/
  app/                 Next.js shell (layout, pages)
  components/          React panels
    ConnectionBar.*    device connect/disconnect (fork)
    RemapPanel.*       NEW  key remapper (Default / FN1)
    EffectsPanel.*     lighting effects (fork, F75 labels)
    PerKeyPanel.*      per-key RGB (fork)
    MacrosPanel.*      NEW  macros (local-first; protocol pending)
    SettingsPanel.*    sleep, debounce, profiles, reset, device info (fork + additions)
    LogPanel.*         raw TX/RX hex (fork)
  hooks/
    useKeyboard.ts     device lifecycle + disconnect events
  lib/
    webhid.ts          WebHID I/O: sendReport/readReport/txRx/readConfig (fork)
    protocol.ts        lighting protocol consts + buildFrame/checksum (fork)
    keymap.ts          NEW  F75 matrix from official KB.ini (116 keys)
    vkmap.ts           NEW  Windows VK code → HID usage translation
    keybind.ts         NEW  520-byte keybind blob builder/parser
    macros.ts          NEW  macro storage + (eventual) protocol writes
    profiles.ts        NEW  localStorage profile store
```

Device flow: page loads → user clicks Connect → `navigator.hid.requestDevice` filtered
to `258A:010C` (wired) plus `3554:FA09` / `258A:010D` (dongle) → `device.open()`,
claim interface 1, subscribe `disconnect` and `inputreport` → UI enables panels.

Data flow (remap): pick layer → load blob (read attempt; on failure seed from F75
default template) → render per-key states → user edits keys → Apply builds the
520-byte blob and `sendFeatureReport(0x06, blob)`.

Data flow (lighting): panels build 20-byte frames via `buildFrame`, write via
`device.sendReport(0x13, frame)`, collect echoes, finish with `CMD_SAVE`.

## Keybind protocol (adapted from aula-keybind, verified for F75)

```
offset 0x00..0x07  header    06 03 <layer> 00 01 00 FF FF   layer: 00=Default, 01=FN1
offset 0x08..0x207 slots     128 × [page, mod0, mod1, usage]
offset 0x208..0x209 trailer   5A A5
```

- Slot for matrix index `led`: `0x08 + 4*led` (page byte), usage at `0x0B + 4*led`.
- Page byte: `0x00` Keyboard/Keypad (HID page 0x07), `0x02` Consumer (HID page 0x0C).
- Reset/unbind = page `0x00`, usage `0x00`.
- Consumer usages above 0xFF (Calculator 0x192, Browser 0x196, Mail 0x18A) cannot be
  encoded (one usage byte); they are excluded from the picker.

Default blob generation: `keymap.ts` default VK per key → `vkmap.ts` → HID usage; keys
the F75 does not expose get slot `[0x00,0x00,0x00,0x00]`. FN1 defaults from `[FN1]`
overrides (`Esc` only). Derived blobs are pinned as test fixtures and diffed against
`aula-keybind`'s `factory-base.bin` for the 128-slot skeleton.

## Lighting / settings protocol (fork, unchanged)

- 20-byte frames, Report ID 0x13, `checksum` over bytes 0..18.
- `readConfig` buffers all `inputreport`s then issues `CMD_READ` to avoid dropped
  fragments; writes replay read config (or `CFG_TEMPLATE`) with `CMD_WRITE`.
- Effects 0..18 + self-define (21); palette 37 frames; per-key = planar R/G/B via
  `CMD_PERKEY/SUBCMD_PERKEY`; save via `CMD_SAVE`.
- Sleep timer byte = minutes × 2 (config[1][15]); debounce byte = level − 1
  (config[0][8]); factory reset writes template cfg + palette.

## Macros track

The macro wire protocol is not documented anywhere we found. Plan:

1. Static analysis of `OemDrv.exe` (Ghidra/radare2): locate `AccessData`/`SetFeature`
   command-ID table and macro buffer layout (`nMacroNum`, `nMacroBufferSize` strings).
2. Sweep existing community captures (`marcoslor/Aula-F87-Controller/captures/`,
   `vndarkblue/aula-keybind/captures/`) for macro writes.
3. If no hard evidence, ship MacrosPanel as a **local-first** recorder/editor with clear
   "not yet written to device" labeling plus raw-HID debugging, keeping `macros.ts`
   isolated so a working protocol swaps in without touching the rest.

## Error handling

- Device absent / disconnected → ConnectionBar prompts; panels disable.
- Remap read failure is expected → seeded from default template (documented behavior).
- Write failures surface with the OEM driver's own language ("device busy or wireless
  interference, please try again later"), plus raw tx/rx in LogPanel.
- Frame checksums always recomputed on write; reads validated before use.
- Remaps only write the keybind table — no bootloader/firmware writes, nothing brickable.

## Testing

- Unit (Vitest): `keybind.ts` blob builder vs pinned transformer fixtures and
  aula-keybind `factory-*.bin`; `vkmap.ts` spot-checks vs KB.ini defaults; slot math;
  checksum.
- Hardware checklist (run live against the user's F75, wired): connect; read effect;
  set each effect class; per-key colors; remap a non-function-row key to F13; FN1-layer
  remap; debounce; sleep; factory reset; disconnect handling. Scripted in README.
- Browser: Chromium only (Chrome/Edge/Brave/Chromium). No Firefox/Safari support.

## Deliverables

- Fork-adapted web app under `web/`.
- `udev/99-aula-f75.rules`.
- `README.md` (run instructions, hardware checklist, attribution to upstream + protocol
  authors).
- `docs/PROTOCOL.md` — consolidated F75 protocol notes (keybind + lighting).
- Extracted official KB.ini layout data checked in with provenance (`docs/`) and the
  original installer preserved in the repo root.

## Open risks

- Macros: protocol unknown; ship local-first unless evidence found.
- RGB details (self-define/per-key pointer maps, palette indices) differ slightly
  between F87 and F75 — verified during the hardware checklist; config templates are
  read from the device at runtime where possible to avoid hardcoding stale data.