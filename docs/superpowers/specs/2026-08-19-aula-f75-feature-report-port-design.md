# AULA F75 — Wired lighting port to feature-report 0x06

Addendum to `2026-08-19-aula-f75-linux-controller-design.md`. A live
hardware investigation (udev fix, HID report-descriptor dumps, WebHID
connect logs) invalidated a core assumption of the original design: the
wired F75 (`258A:010C`) does **not** speak the F87 output-report
`0x13` lighting protocol. This spec describes the correction and the
implementation to replace it.

## Findings that change the design

- Wired `258A:010C` exposes **two** HID interfaces:
  - interface 0 (`hidrawN`/`input0`): pure keyboard — usage page `0x01`
    plus keyboard-LED output reports on page `0x08`. No vendor data.
  - interface 1 (`hidrawM`/`input1`): vendor — usage page `0xFF00`.
    Report-id `0x02` input (media/consumer), input `0x04` (page 7),
    **feature reports `0x05` and `0x06`**, input `0x06`. There are
    **no output reports** on this interface.
- The app's entire lighting/settings layer writes 20-byte output
  reports (`sendReport(0x13, ...)`, cmds `0x44/0x04/0x09/0x02/0x0A`).
  Chrome's `sendReport` cannot target a report id that does not exist on
  an opened collection, so every lighting write fails with "Failed to
  write the report." This transport **cannot work** on the wired F75.
- The working transports are all **520-byte feature reports on report
  `0x06`** (verified independently by [xevrion.dev] and the
  [OpenRGB `SinowealthKeyboard10c` MR][openrgb]):
  - `06 04 A0 A1 A2 A3 L0 L1 <data...>` write config region
  - `06 84 A0 A1 A2 A3 L0 L1 <000...>` then `GET_FEATURE(0x06)` ->
    config bytes (SET-then-GET is required; bare GET returns noise)
  - `06 0A ...` write per-key color table, `06 8A ...` read it
  - `06 08 00 00 01 00 7A 01 <RRGGBB x122>` live direct-per-key packet
    (needs a keepalive stream or the board reverts out of direct mode)
- Config region: address `00 00 01 00` (big-endian 0x00000100), length
  `0x0080` (128 bytes, little-endian `80 00`). Contains a per-effect
  `(brightness, speed|color)` table: brightness `0x09`=full ..
  `0x01`=dim; `speed|color` = `(speed << 4) | color`. Ripple lives at
  offsets 78-79. Writes apply live (no persist command captured).
- Color table: 512 bytes, 4 bytes per key (`RR GG BB 00`), 128 keys.
  Displaying per-key colors may still require a firmware "latch"; the
  live `0x08` directive packet is the reliable route for direct mode.
- The 2.4 GHz dongle (`3554:FA09`) legitimately uses output report
  `0x13` (20-byte frames). That path is unchanged.

[xevrion.dev]: https://xevrion.dev/blogs/aula-f75-linux-reverse-engineering
[openrgb]: https://gitlab.com/CalcProgrammer1/OpenRGB/-/merge_requests/3062.patch

## Goals

1. Make lighting presets (effects, brightness, speed), per-key colors,
   sleep timer, debounce work over the wired F75.
2. Keep the wireless (`3554:FA09`) path working unchanged.
3. Determine the config-region byte layout autonomously (self-
   calibrating probe), so the device's real layout is discovered and
   recorded without manual transcription by the user.

## Non-goals

- Macro protocol (still undocumented; unchanged).
- Bluetooth (out of scope for WebHID).
- Firmware-level speed unlock (the firmware clamps speed at 4).

## Design

### Transport dispatch (per PID)

`connect` already records `vid:pid`. A helper
`isFeatureTransport(pid)` returns `false` for `3554:FA09` (output
`0x13` path, today's code) and `true` for `258A:010C` and any other
PID. Every lighting operation gets both branches; the existing output
`0x13` code becomes the wireless branch.

### New module `web/src/lib/f75.ts`

Pure protocol + transport helpers (unit-testable without hardware):

- `FEATURE_REPORT_ID = 0x06` (re-export `direct-mode.ts`'s
  `DIRECT_REPORT_ID` so the two modules share one constant)
- `CMD_WRITE_REGION=0x04`, `CMD_READ_REGION=0x84`,
  `CMD_WRITE_COLORS=0x0A`, `CMD_READ_COLORS=0x8A`, `CMD_SET_LEDS=0x08`
  (`CMD_SET_LEDS` also re-exported from `direct-mode.ts`)
- `CFG_ADDR=[0x00,0x00,0x01,0x00]`, `CFG_LEN=0x0080`,
  `COLOR_LEN=0x0200`, `REPORT_SIZE=520`
- `buildFrame(cmd, addr, len)` -> `Uint8Array(520)`:
  `[0x06, cmd, addr[0..3], len&0xff, len>>8, 0...]`
- `sendFeature(device, frame)` -> `device.sendFeatureReport(0x06,
  frame.slice(1))`
- `readRegion(device, cmd, addr, len, log)` -> `Uint8Array | null`:
  sends the read request, then `device.receiveFeatureReport(0x06)` with
  a timeout; returns the 520-byte report (payload extracted later).
- `readConfigRegion`, `writeConfigRegion`, `readColorTable`,
  `writeColorTable` — convenience wrappers with logging.

The read-response payload offset (`8` = after the 8-byte header) is the
default; `extractData(report, len, offset=8)` is parameterized so the
calibration step can pin the real value.

### Config-region layout layer `web/src/lib/f75-layout.ts`

Two kinds of knowledge:

- **Anchors** (known from reverse-engineering):
  - per-effect pair offset map starts at `EFFECT_TABLE_START`; Ripple
    = offsets 78-79. Until calibrated, treat the exact table as a map
    that calibration completes.
  - brightness encoding `0x01..0x09`, `speed|color = (speed<<4)|color`.
- **Calibrated map** `F75Layout`: `{ effectSelectOffset, effect:
  Record<effectId, {brightOffset, speedColorOffset}>, debounceOffset,
  sleepOffset, paletteOffsets, responseDataOffset }`. Persisted in
  `localStorage` (`aula.f75.layout`); `Recalibrate` clears it.

`calibrate(device, log)` runs a sequence of read-modify-write probes and
diffs to derive the map autonomously:

1. Read config region -> baseline.
2. For each effect id in 0..18: write the effect-select candidate byte
   (scan strategy: for a set of candidate offsets, set byte `1..255`,
   re-read, diff) to discover `effectSelectOffset` and the effect ids.
3. For each effect, write brightness levels and speed|color values,
   re-read, and record which region bytes moved -> fill the per-effect
   offsets.
4. Sleep timer / debounce: write known values (`sleep` 2/5/10 min,
   debounce 1/2/4/8ms) and diff -> offsets.
5. Restore the baseline region, persist the map, log the result.

Guards: every probe restores baseline before the next; a probe that
causes no byte change is skipped, not treated as success. Calibration is
idempotent and safe to re-run.

### Rewritten operations (`web/src/lib/webhid.ts`)

Each operation dispatches on `isFeatureTransport(pid)`; the wireless
branch is the current output-`0x13` code moved under a `wireless`
switch.

- `readConfig` -> feature branch reads the 128-byte region and returns
  the mapped view (current effect id, debounce, sleep, palette) with the
  template fallback removed.
- `setEffect` -> select effect byte + write the effect's brightness and
  `speed|color` bytes + palette color bytes (color effects) in one
  read-modify-write of the region; live apply, no save.
- `setSleepTimer` / `setDebounce` -> read-modify-write the mapped
  offsets.
- `factoryReset` -> region template from `CFG_TEMPLATE` adapted to the
  flat region layout.
- `applyPerKey` -> feature branch: select self-define effect + write the
  color table (`0x0A`); if display needs a latch, fall back to the live
  `0x08` directive stream from `direct-mode.ts` with a 1s keepalive
  (matching OpenRGB's observed requirement).

Both branches wrap the same high-level entry points so callers in
`useKeyboard.ts` and the UI stay stable. The one intentional contract
change: `readConfig`'s return value changes from the 10-frame array to
the mapped region view (current effect, debounce, sleep, palette);
`useKeyboard.doReadConfig` is updated in the same change. Every other
operation keeps its signature.

### Diagnostics

- `useKeyboard.connect` replaces the `0x13` warning with a feature-
  report check: warn if no collection exposes feature report `0x06`
  (that is the "you picked the keyboard interface / not the vendor one"
  signal on wired).
- Raw-tab additions: "Dump config region", "Dump color table",
  "Calibrate layout" buttons, all logging hex so unknowns remain
  observable.

### Testing

- Unit tests (`vitest`) with a virtual HID device mock (already used
  for keybind tests): frame builders, `readRegion` send-then-receive
  sequencing, `extractData`, layout calibration diff logic.
- Wired serial behavior verified live by the user: set Rainbow
  (effect choose + speed|color write), brightness, sleep, debounce,
  per-key colors.

## Data flow

```
Effects tab ──> setEffect(pid dispatch)
                 └─ feature: readConfigRegion → map offsets →
                    writeConfigRegion(read-modify-write)
Raw tab ────> dump/calibrate ─> readFeatureRegion ➜ hex log / map
Per-Key ────> applyPerKey ─> self-define select + writeColorTable
              (fallback) direct-mode keepalive stream
```

## Risks

- **Config-region byte map is still partial.** Calibration may not find
  every offset on the first run (firmware variants). Mitigation: raw
  dump + diff-driven probe + persisted map; worst case a setting
  silently no-ops and the raw dump exposes it.
- **Color-table latch unknown.** If per-key colors do not display after
  a `0x0A` write, the design already falls back to the live `0x08`
  directive stream, which is independently verified to work.
- **Firmware writes are destructive if malformed.** Region writes are
  read-modify-write on the current live region (probe/calibrate first),
  never blind templates except explicit factory-reset.