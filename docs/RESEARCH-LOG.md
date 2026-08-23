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

## Recovery notes (re-confirmed)

- Fn+Esc ~5 s factory resets the board wirelessly.
- Tri-mode side switch position gates wired enumeration entirely.
- Flaky enumeration traced to hub ports; root ports clean.
