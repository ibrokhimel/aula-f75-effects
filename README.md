# AULA F75 controller

An RGB effects engine and full configuration tool for the AULA F75 mechanical
keyboard, speaking the keyboard's own protocol directly — no OEM driver, and
no traffic ever leaves your machine.

It comes in two forms:

- **Windows desktop app** — the full experience. Effects react to your typing
  in *any* application, keep running with the window closed, and live in the
  system tray. [Grab it from Releases](../../releases/latest).
- **Browser app** — runs on Linux (or anywhere Chromium runs) over WebHID.
  No install, nothing runs as root. Effects only react while the tab is
  focused; browsers can't see keystrokes sent to other apps.

What's inside either way:

- **211 reactive effects** — lighting driven by your typing: ripples, holds,
  chords, rhythm, typing-speed, zones, memory effects that build up patina
  over a minute of use, and more. Every effect works on the on-screen preview
  even with no keyboard plugged in.
- **116 animations** — self-running patterns streamed at up to 30 fps.
- **14 games played on the keyboard itself** — snake, pong, breakout,
  invaders, whack-a-mole, rhythm…
- Full configuration: per-key colors, onboard effect switching, key
  remapping (Default + FN1 layers), debounce, profiles, snapshots.

## Windows desktop app

Download from [Releases](../../releases/latest) — installer, portable exe, or
zip. Builds are unsigned, so SmartScreen may prompt on first run (*More info →
Run anyway*).

- **Reactive effects work everywhere**: a global keyboard hook (observe-only —
  it never intercepts, swallows, or remaps anything) feeds the same effect
  engine the browser uses, so the board lights up while you work, game, or
  type in any app.
- **Closing the window doesn't stop anything.** The app hides to the tray;
  the tray menu has Open / Pause / Stop / Quit.
- **Your last effect and color resume on launch**, and Settings has an
  optional *Start with Windows* toggle (starts hidden in the tray).
- Works over USB-C and the 2.4 GHz dongle (wired preferred when both are
  present; hot-unplug pauses the effect and replug resumes it).

Build it yourself:

```bash
cd desktop
npm install
npm run build:web   # static-exports the UI from ../web
npm run start       # typecheck + bundle + launch
npm run dist        # → release/ (installer, portable, zip)
```

`npx electron . --smoke` is a headless self-test: it connects, arms the key
hook, streams a real animation for 2.5 s, prints a status JSON line, and
exits.

## Browser app (Linux)

You need a Chromium-based browser (Chrome, Edge, Brave) and
[Bun](https://bun.sh) or Node 18+. Give your user access to the keyboard's
hidraw node:

```bash
sudo cp udev/99-aula-f75.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules && sudo udevadm trigger
```

Unplug and replug the keyboard once after this. The rule grants read/write on
the F75's `/dev/hidraw` devices (`MODE="0666"`); the file header shows a
`GROUP="input"` variant if that's too wide for your taste.

Run it:

```bash
cd web
bun install
bun dev
```

Open http://localhost:3000 and click **Connect keyboard**. You'll see the F75
twice in the chooser — pick the entry whose collections include feature
report `0x06` (the app warns you if you pick the plain keyboard interface).

## Feature support by transport

| Feature | Status | Where |
| --- | --- | --- |
| Reactive effects, animations, games | works (wired + 2.4G dongle) | Reactive / Animations / Games |
| RGB effect switching, speed, brightness | works (wired) | Effects |
| Per-key colors, live | works (wired + 2.4G dongle) | Per-Key |
| Key remapping, Default + FN1 layers | works (wired) | Remap |
| Debounce, device info, keybind profiles | works | Settings |
| Snapshot & restore lighting defaults | works (wired) | Macros |
| Macro recording | stored locally; keyboard upload not figured out yet | Macros |

Reading or writing *settings* over the radio is still unsolved — use the
cable for anything except the live effect stream.

## If something doesn't work

In the browser app, click **save trace** above the console first — it
downloads a `.trace` file with your browser info, device state, and
everything the app logged. Attach it when opening an issue.

Things we've run into, in roughly the order people hit them:

- **The keyboard isn't detected at all.** On Linux check `journalctl -k` for
  a `258a:010c` line. Try a port on the computer itself rather than a hub,
  make sure the side switch is set to Wired, and remember the cable matters.
- **"Failed to open" on connect (browser).** The udev rule isn't loaded
  (replug after installing it), or another tab/app is holding the keyboard —
  WebHID allows one claimant at a time. The desktop app and a browser tab
  can't drive the board at the same time either.
- **Connected but nothing applies (browser).** You probably picked the plain
  keyboard interface. Disconnect and reconnect, choosing the vendor one.
- **Lights went haywire from experimenting.** Hold Fn+Esc for ~5 seconds:
  the keyboard's built-in factory reset recovers from almost anything,
  wireless modes included. Macros → *Snapshot defaults* before heavy
  tinkering gives you a one-click undo.
- **Wired suddenly won't enumerate but 2.4G still types.** The MCU is fine;
  it's sitting in a wireless state. Flip the side switch to Wired, replug,
  and if needed do the Fn+Esc reset.

## How it works

Two protocols live inside this keyboard, selected by USB product ID:

- Wired (`258A:010C`) uses 520-byte feature reports with id `0x06`. A
  128-byte config region holds the current-effect byte, a debounce value,
  and a table of per-effect brightness/speed/color slots. Live per-LED
  streaming ("direct mode") pushes whole frames through the same reports.
- The dongle (`3554:FA09`) takes 20-byte output reports (id `0x13`) carrying
  grouped per-key colors, which is what powers the live effect stream.

Full wire details, offsets, and framing are in
[docs/PROTOCOL.md](docs/PROTOCOL.md).

The effect engine is plain TypeScript with no DOM dependency
(`web/src/lib/`), which is what makes the desktop app possible: Electron's
main process runs the exact same reactive engine and animation functions,
fed by a global key hook (uiohook) instead of browser events and writing to
the keyboard through node-hid instead of WebHID. One Windows quirk worth
knowing: the F75 spreads its vendor traffic across three HID collections,
which Windows exposes as separate devices — the desktop transport opens all
of them and learns which one accepts each report type.

## Development

```bash
cd web
bun test            # 2,400+ unit tests (protocol, effects, layout, ...)
bunx tsc --noEmit   # typecheck

cd ../desktop
npm run typecheck
```

The protocol layer is separated from React: `web/src/lib/f75.ts` is the
transport, `f75-layout.ts` maps config bytes to meaning, and `webhid.ts`
dispatches per connection type. The desktop app reuses all of it —
`desktop/src/` contains only the Electron shell (tray, HID routing, key
hook, IPC).

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
- Config over the 2.4G dongle isn't implemented (live effects only).
- Sleep timer is informational on wired mode — the OEM driver hides it there
  too (`KB.ini` `ShowPower=0`).
- Profiles capture keybind layers only; lighting isn't saved into profiles.
- Desktop builds are unsigned and Windows-only for now (nothing in the
  architecture is Windows-specific — the hook and HID libraries both support
  macOS/Linux).
