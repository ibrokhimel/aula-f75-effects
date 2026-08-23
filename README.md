# AULA F75 controller for Linux

A browser app that configures the AULA F75 mechanical keyboard from Linux,
over WebHID. AULA only ships a Windows driver; this speaks the keyboard's
own config protocol directly from Chromium, so there's nothing to install
and nothing runs as root. All traffic stays on your machine.

Wired, it can do most of what the official driver does:

| Feature | Status | Where |
| --- | --- | --- |
| RGB effect switching, speed, brightness | works (wired) | Effects |
| Per-key colors, live | works (wired + 2.4G dongle) | Per-Key / Animations |
| Key remapping, Default + FN1 layers | works (wired) | Remap |
| Debounce, device info, keybind profiles | works | Settings |
| Snapshot & restore lighting defaults | works (wired) | Macros |
| Macro recording | keyboard upload not figured out yet; macros are stored locally | Macros |

The 2.4G dongle currently only supports the live per-key animation stream.
Reading or writing settings over the radio is still unsolved — use the cable
for anything except Animations.

## Setup

You need a Chromium-based browser (Chrome, Edge, Brave) and
[Bun](https://bun.sh) or Node 18+. Then give your user access to the
keyboard's hidraw node:

```bash
sudo cp udev/99-aula-f75.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules && sudo udevadm trigger
```

Unplug and replug the keyboard once after this. The rule grants read/write
on the F75's `/dev/hidraw` devices (`MODE="0666"`); if that's too wide for
your taste, the file header shows a `GROUP="input"` variant.

Run it:

```bash
cd web
bun install
bun dev
```

Open http://localhost:3000 and click **Connect keyboard**. Chromium will ask
which device to share. You'll see the F75 twice — pick the entry whose
collections include feature report `0x06` (the app warns you if you pick the
plain keyboard interface). Production build: `bun run build && bun start`.

## If something doesn't work

Click **save trace** above the console first — it downloads a `.trace` file
with your browser info, device state, and everything the app logged. Attach
it when opening an issue and diagnosis gets much faster.

Things we've run into, in roughly the order people hit them:

- **The keyboard isn't in the chooser at all.** Check `journalctl -k`. No
  `258a:010c` line means the OS doesn't see it: try a port on the computer
  itself rather than a hub (we watched a flaky hub eat half a day), make sure
  the side switch is set to Wired, and remember the cable matters.
- **"Failed to open" on connect.** The udev rule isn't loaded (replug after
  installing it), or another tab/app is holding the keyboard — WebHID allows
  one claimant at a time. Close other tabs, including old ones.
- **Connected but nothing applies.** You probably picked the plain keyboard
  interface. Disconnect and reconnect, choosing the vendor interface.
- **Lights went haywire from experimenting.** Hold Fn+Esc for ~5 seconds:
  that's the keyboard's built-in factory reset and it recovers from almost
  anything, wireless modes included. Macros → *Snapshot defaults* before
  heavy tinkering gives you a one-click undo.
- **Wired suddenly won't enumerate but 2.4G still types.** The MCU is fine;
  it's sitting in a wireless state. Flip the side switch to Wired, replug,
  and if needed do the Fn+Esc reset.

## How it works

Two protocols live inside this keyboard, selected by USB product ID:

- Wired (`258A:010C`) uses 520-byte feature reports with id `0x06`. A
  128-byte config region holds the current-effect byte (offset 10), a
  debounce value, and a table of per-effect brightness/speed/color slots
  starting at offset 64. Writes apply live — no save command observed.
- The dongle (`3554:FA09`) takes 20-byte output reports (id `0x13`) carrying
  grouped per-key colors, which is what powers the Animations tab.

We found the current-effect offset by snapshotting the config region while
pressing the keyboard's own knob and diffing the reads — no writes involved.
There's a button for this under Macros (*Probe select, read-only*) if you
want to reproduce it on yours. Full wire details, offsets, and framing are
documented in [docs/PROTOCOL.md](docs/PROTOCOL.md).

## Development

```bash
cd web
bun test            # unit tests (protocol, layout, keybind, profiles, ...)
bunx tsc --noEmit   # typecheck
```

The protocol layer is separated from React: `web/src/lib/f75.ts` is the
transport, `f75-layout.ts` maps config bytes to meaning, and `webhid.ts`
dispatches per connection type. Layout constants that came from hardware
experiments are marked as such in comments.

## Credits

This stands on prior reverse-engineering work — thank you:

- [marcoslor/Aula-F87-Controller](https://github.com/marcoslor/Aula-F87-Controller) —
  web app structure and the lighting wire protocol
- [vndarkblue/aula-keybind](https://github.com/vndarkblue/aula-keybind) (MIT) —
  keybind wire format and factory templates (used as test fixtures)
- [veysiemrah/aula-rgb-controller](https://github.com/veysiemrah/aula-rgb-controller) —
  cross-checking of the lighting protocol
- The OEM `KB.ini` from AULA's Windows driver — ground truth for the key
  matrix; see `assets/oem/PROVENANCE.md`

## Known limitations

- Macros never leave the app: the keyboard's macro-write frames haven't been
  captured, so recordings are stored in local profiles awaiting that work.
- F1–F12 can't be remapped; those firmware slots are pinned.
- Config over the 2.4G dongle isn't implemented (animations only).
- Sleep timer is informational on wired mode — the OEM driver hides it there
  too (`KB.ini` `ShowPower=0`).
- Profiles capture keybind layers only; lighting isn't saved into profiles.
