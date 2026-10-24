# AULA F75 controller

A Windows keyboard RGB app with a reusable, layout-driven effects engine.
AULA F75 is the first hardware bridge, speaking its protocol directly without
an OEM driver. Other keyboards can reuse the effects by supplying a layout
and bridge; see [Adding a keyboard](docs/KEYBOARD-BRIDGES.md).

It comes in two forms:

- **Windows desktop app** — the full experience. Effects react to your typing
  in *any* application, keep running with the window closed, and live in the
  system tray. [Grab it from Releases](../../releases/latest).
- **Browser preview / development app** — runs in Chromium over WebHID.
  Effects react while the tab is focused; use the Windows desktop app for
  background lighting.

What's inside either way:

- **227 reactive effects** — lighting driven by your typing: ripples, holds,
  chords, rhythm, typing-speed, zones, memory effects that build up patina
  over a minute of use, and more. Every effect works on the on-screen preview
  even with no keyboard plugged in.
- **116 animations** — self-running patterns streamed at up to 30 fps.
- **14 games played on the keyboard itself** — snake, pong, breakout,
  invaders, whack-a-mole, rhythm…
- Full configuration: per-key colors, onboard effect switching, key
  remapping (Default + FN1 layers), debounce, profiles, snapshots.

## New studio

Open **http://127.0.0.1:3000/studio** after running `node scripts/dev-studio.mjs`
from `web/`. The studio includes seven lighting modes plus Key mapping,
Macros, Profiles, Games, Settings, and Advanced. Navigation uses icons with
accessible labels; keyboard thumbnails animate on hover or focus.

Profiles save the complete setup, including both mapping layers and macros.
Mapping edits stay local until **Apply to keyboard**. Macros support recording,
editable presses/releases/delays, import/export, and visual simulation;
firmware macro upload is not implemented.

Connect in **Settings** and enable **Keyboard lighting output** to stream RGB.
The browser uses WebHID. The Windows app renders effects in the main process,
supports global typing and tray playback, and reads CPU/memory through IPC.
Audio and screen capture start only after an explicit capture action.

Build the studio desktop UI with `node scripts/build-studio-web.mjs` from
`desktop/`, then run `node scripts/build.mjs`. The static UI goes to
`web/studio-out`, independently of the browser development server.
`electron . --smoke` checks the native UI, global hook, telemetry, and virtual
frame delivery without writing to the physical keyboard or changing saved settings.

The studio keeps the reviewed 72-family / 116-renderer collection. Experimental
engine expansion effects remain outside this collection until their validation
and visual review are complete.

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
cd web
npm install
cd ../desktop
npm install
npm run build:web   # static-exports the UI from ../web
npm run start       # typecheck + bundle + launch
npm run dist        # → release/ (installer, portable, zip)
```

`npx electron . --smoke` is a headless self-test: it connects, arms the key
hook, streams a real animation for 2.5 s, prints a status JSON line, and
exits.

## Browser preview / development

Use a Chromium-based browser and [Bun](https://bun.sh), or Node.js with npm.

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

- **The keyboard isn't detected at all.** Try a port on the computer itself rather than a hub,
  make sure the side switch is set to Wired, and remember the cable matters.
- **"Failed to open" on connect (browser).** Another tab/app may be holding the keyboard —
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

The effect engine lives in `packages/engine/src`. It takes a keyboard layout
and key/audio input and returns frames of LED colors. Layout geometry, key
mapping, neighbor relationships, and effect caches belong to each engine
instance; no F75 LED numbering is assumed by the shared engine.

The first bridge lives in `web/src/lib/bridges/f75` and handles wired/dongle
RGB packets. Both the Windows desktop host and browser effects panels use the
bridge contract. A virtual bridge runs the same effects without hardware.
F75 remapping, onboard configuration, and games remain app-specific.

See [the bridge guide](docs/KEYBOARD-BRIDGES.md) for the contract, a runnable
virtual-keyboard example, host integration, and validation instructions.

One Windows quirk: the F75 spreads vendor traffic across three HID
collections. The desktop transport opens all of them and learns which one
accepts each report type.

## Development

```bash
cd web
bun run test        # Vitest: protocol, effects, layouts, bridges, games
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
- The supported desktop app is Windows-only and builds are unsigned.
- AULA F75 is the only hardware bridge supplied so far. The shared engine
  supports other layouts, but a new board still needs a working RGB bridge
  and integration into device discovery/UI.
