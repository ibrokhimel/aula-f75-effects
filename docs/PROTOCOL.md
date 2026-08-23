# AULA F75 — Wire protocol reference

Consolidated reference for the AULA F75 keyboard protocols used by this
app. Attribution: lighting protocol + the web app from
[marcoslor/Aula-F87-Controller](https://github.com/marcoslor/Aula-F87-Controller);
keybind wire format and factory templates from (MIT)
[vndarkblue/aula-keybind](https://github.com/vndarkblue/aula-keybind).
Cross-checks against `veysiemrah/aula-rgb-controller`. F75 layout facts
from the OEM `KB.ini` (see `assets/oem/PROVENANCE.md`).

## Device facts (F75)

- Wired: USB VID:PID `258A:010C`, `MatrixLen=128`.
- Wireless / dongle: `3554:FA09`.
- Layer bytes (`FeatureReport 0x06`, byte 2): `0x00` Default, `0x01` FN1.
- Locked (firmware-pinned) keybind slots: F1–F12 = matrix indexes
  `[12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78]`.
- Keybind output pages: `0x00` = HID Usage Page 0x07 (keyboard/keypad),
  `0x02` = HID Usage Page 0x0C (consumer/media).

## Keybind protocol (feature report 0x06, 520 bytes)

A keybind "blob" is sent via `sendFeatureReport(0x06, blob[1..])` — WebHID
strips byte 0, so the on-wire body is the 519 bytes `blob[1..520)`.

Layout (offsets 0-based within the 520-byte blob):

| offset | size | meaning |
| --- | --- | --- |
| 0 | 1 | report id `0x06` |
| 1 | 1 | `0x03` (constant) |
| 2 | 1 | layer: `0x00` base, `0x01` FN1 |
| 3 | 1 | `0x00` |
| 4 | 1 | `0x01` |
| 5 | 1 | `0x00` |
| 6–7 | 2 | `0x00`, `0xff` |
| 8 + 4·i | 1 | keybind slot i: output page byte |
| 9 + 4·i | 2 | `0x00`, `0x00` (reserved) |
| 11 + 4·i | 1 | keybind slot i: usage id byte |
| 518 | 1 | `0x5a` |
| 519 | 1 | `0xa5` (trailer) |

Each physical key has one 4-byte slot: `page, 0x00, 0x00, usage`.
Unbound (none / disable) = `page 0x00, usage 0x00`. Valid slot indexes
range `0..126` (slot 127 would overlap the trailer).

Defaults are derived from the OEM `[KEY]` (+`[FN1]`) tables in `KB.ini`:
`[KEY]` gives each key's Windows VK code → mapped to a HID usage via
`web/src/lib/vkmap.ts`; `[FN1]` gives the packed override
`0xHHHHHHHH` = HID usage page (high 16 bits) | usage id (low 16 bits).

See `web/src/lib/keybind.ts` (`BLOB_SIZE`, `LAYER_*`, `validateBlob`,
`emptyBlob`, `defaultBlob`, `setSlot`/`getSlot`) and the F87 factory
cross-check fixtures in `web/tests/fixtures/`.

## Lighting protocol

Two transports, dispatched per PID in `web/src/lib/f75.ts`
(`isFeatureTransport`): the wired F75 (`258A:010C`) speaks 520-byte
feature report `0x06` frames; the dongle (`3554:FA09`) keeps the
output-report `0x13` protocol below. Items marked **VERIFIED** were
confirmed against live hardware (2026-08-24 sessions).

Wired transport (**VERIFIED**): feature report `0x06`, 520-byte frames.
Header (8 bytes): `06 CMD A0 A1 A2 A3 L0 L1` — `0x06` report id, `CMD`,
4-byte address `A0..A3`, 2-byte little-endian length `L0 L1`; payload
follows at offset 8. As with the keybind blob above, WebHID strips byte
0, so the on-wire body is `frame.slice(1)`.

| name | cmd | addr | len | use |
| --- | --- | --- | --- | --- |
| Read config region | `0x84` | `00 00 01 00` | `0x0080` | SET-then-GET read of the 128-byte config region |
| Write config region | `0x04` | `00 00 01 00` | `0x0080` | write the 128-byte config region |
| Read color table | `0x8a` | `00 00 01 00` | `0x0200` | SET-then-GET read of the 512-byte color table |
| Write color table | `0x0a` | `00 00 01 00` | `0x0200` | write per-key color table (`RR GG BB 00` × 128) |
| Live per-key stream | `0x08` | — | — | direct-mode RGB stream; needs continuous frames (see Direct mode stream below) |

- **Reads are SET-then-GET (VERIFIED)**: `sendFeatureReport`(request)
  followed by `receiveFeatureReport`. A bare GET (no preceding request)
  returns flash/status noise, never config data.
- **Shared address, length-disambiguated (VERIFIED)**: config region and
  color table both live at `[0x00, 0x00, 0x01, 0x00]`; the little-endian
  length in header bytes 6–7 (`0x0080` vs `0x0200`) selects the region
  the firmware serves.
- **Write reliability (VERIFIED)**: per-effect table writes echo and
  persist reliably — confirmed via read-back diffs across sessions.

### Config region (wired) — addr `00 00 01 00`, len `0x0080` — VERIFIED

Layout (offsets 0-based within the 128-byte region):

| offsets | contents |
| --- | --- |
| 0–63 | control bytes; current-effect select byte at offset 10 (see Effect select below) |
| 64 + 2n | effect n brightness — `0x09`=full … `0x01`=dim |
| 65 + 2n | effect n speed/color — `speed\|color = (speed << 4) \| colorful` |
| 78–79 | ripple pair (app id 7) — verified anchor |
| 126–127 | trailer `5A A5` |

- Effect table starts at offset 64 (`EFFECT_TABLE_BASE` in
  `web/src/lib/f75-layout.ts`); the debounce and sleep offsets there
  remain calibration-derived — see `calibrate()`/`loadLayout()`.
- **Writes apply live (VERIFIED)**: switching effects by writing the
  select byte + slot settings takes effect immediately. No save command
  observed or needed for the config region (contrast the dongle's
  `0x0A` Save below).

### Color table (wired) — addr `00 00 01 00`, len `0x0200`

- Layout: `RR GG BB 00` × 128 keys.
- **Persistence VERIFIED**: writes persist and read back byte-exact
  (3/3 probed keys).
- **Display UNSOLVED**: pointing the select byte at `21` (F87-style
  SELF_DEFINE) blanks the LEDs instead of showing the custom colors.
  Working hypothesis (**UNCONFIRMED, in test**): the hardware
  self-define slot is `22` (`21 + 1`, per the numbering quirk below).

### Effect select — offset 10 (+ hardware numbering quirk)

- Current-effect select byte = **config-region offset 10**
  (**VERIFIED**) via a read-only knob-diff probe: the byte tracked
  `2→3→4→5` across knob effect cycles. Offset 12 is *not* the select —
  it stays frozen during cycling.
- **Hardware numbering quirk (PARTIALLY VERIFIED — needs
  confirmation)**: hardware ids appear to run one ahead of the app's
  `EFFECTS` table — steady single-color showed select `0x02` while the
  app maps Fixed-on to `1`.

### Direct mode stream (cmd `0x08`) — heartbeat required — VERIFIED

Live per-key RGB streaming over feature report `0x06`, cmd `0x08`:

- Payload: 122 LEDs × `R G B` at payload offset 8; zone byte
  `d[4] = 0x01`; LED count `0x7A` (122) at `d[6]`.

Enable sequence — three small feature reports (body shown after the
report id byte):

| step | report id | body |
| --- | --- | --- |
| 1 | `0x39` | `20 06 00 01 00` |
| 2 | `0x3c` | `20 01 00` |
| 3 | `0x39` | `20 06 01 01 00` |

- Disable: report `0x3c`, body `20 00 00`.
- **Heartbeat requirement (critical — VERIFIED by experiment)**: direct
  mode holds ONLY while frames keep arriving. Sustained ~20 fps keeps
  it indefinitely; sparse frames (a one-shot write, or even a 400 ms
  heartbeat) let the firmware revert to the configured effect.

### Dongle (`3554:FA09`) — output report `0x13`, 20-byte frames

All frames are 20 bytes: `[0]=0x13 reportId, [1]=cmd, [2]=subcmd,
[3]=seq, [4..18]=15-byte payload, [19]=checksum`.

```
checksum(b) = (b[0] + b[1] + ... + b[18]) & 0xFF
```

| name | cmd | subcmd | use |
| --- | --- | --- | --- |
| Read config | `0x44` | `0x0A` | read 10 config frames (each echoed with cmd `0x44`, subcmd `0x0A`, seq 0–9) |
| Write config | `0x04` | `0x0A` | write config frame seq N |
| Write palette | `0x09` | `0x25` | palette entry, seq 0–36 |
| Write per-key | `0x02` | `0x1C` | per-key RGB planes, seq 0–26 |
| Save | `0x0A` | `0x01` | persist (payload `0x04 0x07 …`) |

- **Config**: 10 frames (seq 0–9). Effects table lives in frames 4–6
  (`effectTableLoc`); frame 0 also carries debounce (byte 8) and current
  effect (byte 15); frame 1 carries the sleep timer (byte 15,
  `minutes = value / 2`).
- **Palette**: 37 entries (seq 0–36); active color goes in entry 1
  (payload bytes `[8]=R, [9]=G, [10]=B`); the upload is terminated by a
  trailer payload (`PAL_LAST`).
- **Per-key**: 3 × 9 = 27 frames, one 14-byte plane slice per frame
  (`R, G, B` × 9 seq), then a trailer payload (`0x06 0x5a 0xa5 …`).
  The F75 matrix has 80 remappable keys (`MatrixLen=128`).
- **Save** is always issued last or nothing persists.
- Effects: `0`=OFF … `18`=Rotating storm (see `EFFECTS` in
  `web/src/lib/protocol.ts`); `21` = self-define (per-key mode).

## Macro protocol

Not yet documented/captured for the F75. This app records macros
locally (`MACRO_SUPPORTED = false`) and exposes a Raw HID debug tab
(`web/src/lib/debug.ts:sendRaw`) for capturing the missing frames.

## Reverse-engineering notes

- The keybind blob byte offsets are doubly confirmed against the F87
  factory default blobs in `web/tests/fixtures/`
  (`validateBlob` structural checks).
- No firmware-version byte is documented anywhere (F87 master or F75 keybind);
  the Device Info card reports only real data (productName, VID:PID, and
  config-frames health from `readConfig`).
- Recovery / enumeration notes (**VERIFIED**, live sessions 2026-08-24):
  - Holding `Fn+Esc` for ~5 s performs a board-wide factory reset.
  - The tri-mode side switch position gates wired enumeration: wireless
    positions mux the USB data lines off, so nothing enumerates over USB
    until wired is selected.
  - USB hub ports caused flaky enumeration; direct root ports enumerated
    reliably.