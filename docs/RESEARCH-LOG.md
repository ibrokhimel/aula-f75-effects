# Research log — F75 protocol experiments

Raw hardware experiments using `tools/hidraw_lab.c` (direct hidraw feature-report
I/O, no browser). All dates 2026-08-24 unless noted.

## Setup

- Vendor interface = `/dev/hidraw1` (`bInterfaceNumber 01`); hidraw0 is the
  plain keyboard interface.
- Feature reports via `HIDIOCSFEATURE/HIDIOCGFEATURE`, request encoding
  `_IOC(WR|RD, 'H', nr, len)` — both directions use dir bits `0xC0`.
- SET-then-GET confirmed at raw level: bare GET of report 0x06 returns zeros.
- Address bytes a0/a1/a2 are don't-care for cmd 0x84; **a3 acts as a page
  selector** (a3=01/02 read back zeros at len 16).
- Config page reads clamp at 128 bytes (len 256 returns 128 + zeros).

## Color table gating (the big one)

Symptom history: table writes verified 3/3 right after upload, but read as all
zeros hours later once effects had been switched.

Experiment: with select byte (offset 10) = 0x00, paint markers into the color
table via cmd 0x0a → SET ok, immediate readback **zeros** (write accepted,
content discarded). Then set sel=0x15 (21) first, repaint → readback shows the
markers exactly. Switching sel to 0x16 (22) keeps the same table; returning to
sel=0x00 clears it again.

**Conclusion:** the color bank is only retained while the board sits in a
self-define slot. Order of operations is mandatory: enter the slot, THEN
upload colors. This explains every earlier "per-key doesn't work" result.

## Open questions

- Which self-define slot actually RENDERS the table (21 vs 22 vs other)?
  Retention proven for both. Display requires eyes — `probeSelfDefineSlots`
  (Macros → "Per-key lab") sweeps slots 20–23 with red/green/blue markers on
  key indices 2–4 and restores state afterwards.
- Whether the retained table survives replug while in-slot.
- Feature report 0x05 exists in the descriptor but GET stalls (EPIPE) at every
  length tried (8..520). Possibly SET-only or needs an preceding handshake.
- Unknown address pages beyond a3=00 for cmd 0x84 (a3=01+ zero so far).

## Session 2 — flash banking and the boot sanitizer

Address space via cmd 0x84 is paged by a3:

| a3 | contents |
| --- | --- |
| 00 | live config region (RAM view, clamps at 128 B) |
| 01 | color bank (mirrors cmd 0x8a reads) |
| 03 / 04 | layer pair (base / FN1 keybind-ish data) |
| 05 / 06 | layer pair (small config values) |
| 13–20+ | raw flash: HID descriptors, high-entropy blobs |
| 7f / 80 | config region FLASH BANKS (dual-bank generations) |
| 81 | color bank FLASH twin |

Commit behavior (observed live):

- Writing a VALID effect id to select auto-commits the region to flash bank
  0x80 within ~600 ms; bank 0x7f keeps the previous generation.
- Writing select=22 also commits to 0x80 — flash accepts it.
- BUT on power-up the firmware validates select ≤ 18, falls back to the last
  valid generation, renders that, and re-commits it over both banks
  (observed 16 → 0b across one replug).

**Conclusion:** per-key persistence cannot ride the select byte — any value
over 18 is sanitized away at boot. Native custom-keyboard mode must be
activated by another mechanism (candidate: a mode/source control byte such as
the unstable offset 12, or palette+plane upload à la the dongle protocol
instead of a raw RGB table).

Report 0x05: accepts arbitrary SETs (no stall) with no observable region
change for payloads tried ([05], [0a 01], [0a 01 04 07], [04 07], [01]); GET
always stalls. Function unknown.

## Recovery notes (re-confirmed)

- Fn+Esc ~5 s factory resets the board wirelessly.
- Tri-mode side switch position gates wired enumeration entirely.
- Flaky enumeration traced to hub ports; root ports clean.
