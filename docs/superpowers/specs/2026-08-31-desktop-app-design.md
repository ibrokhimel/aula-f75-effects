# AULA F75 Desktop App — Design

Date: 2026-08-31 · Status: approved (user: "just do it")

## Goal

Turn the browser-only controller into a real Windows application: effects
keep running while the user works in any other program, the app lives in the
system tray, survives the window being closed, and reacts to keystrokes
system-wide. The browser app keeps working unchanged for development.

## Decisions (user-approved)

- **Full app in one window** — all nine tabs ship in the desktop app; the
  browser build becomes a dev playground.
- **Engine in the Electron main process** — effects, global key hook, and
  HID I/O run in Node, fully independent of any window. The UI is pure
  control/preview over IPC.

## Architecture

```
┌─ Electron main process (always running) ─┐
│  keyhook.ts   uiohook-napi → e.code      │
│  engine-host  ReactiveEngine + ticker    │
│  hid.ts       node-hid ↔ HIDDevice shim  │
│  tray, settings.json, autostart          │
└──────────────┬───────────────────────────┘
         IPC   │  invoke/on (preload bridge)
┌──────────────▼───────────────────────────┐
│  UI window: Next.js static export        │
│  native.ts detects bridge; panels become │
│  remote controls; other tabs use the     │
│  HIDDevice-shaped IPC proxy unchanged    │
└──────────────────────────────────────────┘
```

### Components

- `web/src/lib/reactive/engine.ts` — DOM-free press buffer + frame renderer
  extracted from `ReactivePanel`, shared verbatim by web and desktop.
- `web/src/lib/uiohook-map.ts` — uiohook key *name* → `KeyboardEvent.code`
  table (pure data, tested against `LED_FOR_CODE` coverage). The desktop
  resolves names to numeric keycodes via the `UiohookKey` enum at runtime.
- `web/src/lib/native.ts` — typed access to the preload bridge
  (`window.f75Native`), plus a renderer-side `HIDDevice`-shaped proxy so all
  existing lib functions work untouched via structural typing.
- `desktop/src/hid.ts` — node-hid transport: enumerate wired 258A:010C /
  wireless 3554:FA09, pick the vendor collection (usagePage 0xff00–0xff04),
  expose a `HIDDevice`-shaped adapter (sendReport, sendFeatureReport,
  receiveFeatureReport, inputreport events). Reconnect poll every 3 s.
- `desktop/src/keyhook.ts` — uiohook-napi start/stop, modifier tracking,
  keycode→`e.code` mapping.
- `desktop/src/engine-host.ts` — 30 fps `setInterval` loop (main process is
  never throttled) driving reactive or animation frames through the adapter;
  streams state + frames to the window when it is open.
- `desktop/src/main.ts` — app lifecycle, single-instance lock, tray (Open /
  Pause effects / Quit), close-to-tray, `app://` protocol serving the Next
  static export, IPC wiring, `--smoke` self-test flag.
- `desktop/src/settings.ts` — JSON in userData: last effect + color,
  autostart (default off), animation fps.

### Behavior

- Last active effect resumes on launch and on keyboard replug.
- Global hook only observes; it never swallows or alters typing.
- Games stay window-focused on purpose; starting a game stops the
  background effect first.
- HID send failure → stop effect, log; unplug → pause, auto-resume.
- Hook init failure → animations still work; UI explains reactive is off.

### Packaging & testing

- electron-builder: NSIS installer + portable exe, unsigned (personal use).
- Existing vitest suites unchanged; new tests: engine module, uiohook map
  coverage. Manual smoke: `electron . --smoke` initializes everything
  headlessly and exits 0.
