# AULA F75 Linux Controller

Local WebHID web app to configure the AULA F75 keyboard in Chromium on
Linux — remap keys (Default/FN1 layers), control RGB lighting, set debounce
and sleep timer, and capture macros. No Windows driver needed.

- **Remap**: per-key remapping of the base and FN1 layers from a visual key
  layout; F1–F12 are reserved by the firmware and pinned.
- **Lighting**: effects, per-key colors, custom palette (from the upstream
  F87 app, verified against the F75's own protocol).
- **Settings**: debounce, sleep timer, factory reset, device info, and
  exportable keybind profiles.

## Requirements

- Chromium-based browser with WebHID (Chrome/Edge; `navigator.hid` present)
- [Bun](https://bun.sh) (or Node 18+ with `npm`/`yarn`/`pnpm`)
- Linux; install the udev rule so the keyboard is accessible without root:

```bash
sudo cp udev/99-aula-f75.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Re-plug the keyboard after installing the rule.

## Run

```bash
cd web
bun install
bun dev
```

Open http://localhost:3000, click **Connect**, pick the AULA F75, and
grant the WebHID permission prompt. (On Linux, Chromium shows the chooser;
a paired device is usually remembered.)

## Test / build

```bash
cd web
bun test            # unit tests (keymap, vkmap, keybind, profiles, macros, deviceinfo)
bunx tsc --noEmit   # typecheck
bun run build       # production build
```

## Features

| Feature | How |
| --- | --- |
| Key remap (Default / FN1) | Remap tab — click a key, pick an output, Apply |
| Locked keys | F1–F12 dimmed, not re-assignable (firmware slot pin) |
| RGB effects + speed/brightness | Effects tab |
| Per-key colors | Per-Key tab (self-define effect) |
| Debounce (1–5 ms) | Settings → Debounce |
| Sleep timer (0–60 min; wireless note) | Settings → Sleep Timer |
| Macro capture | Macros tab — recorded locally, stored in profiles |
| Raw HID debug | Macros tab → send arbitrary 20-byte frame |
| Keybind profiles | Settings → Keybind Profiles — save/apply/export/import |
| Device info | Settings → Device Info — model, connection, VID:PID, config frames |

## Hardware verification checklist

Run these on your wired F75 (every line is a checkable box):

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

## Attribution

- [marcoslor/Aula-F87-Controller](https://github.com/marcoslor/Aula-F87-Controller)
  — the web app and the lighting (per-key/config/palette) wire protocol.
- [vndarkblue/aula-keybind](https://github.com/vndarkblue/aula-keybind) (MIT)
  — the keybind wire format, factory templates used as structural fixtures in
  `web/tests/fixtures/`.
- [veysiemrah/aula-rgb-controller](https://github.com/veysiemrah/aula-rgb-controller)
  — cross-checking of the lighting protocol.
- Official AULA F75 Windows driver (`KB.ini`) — the key layout ground truth;
  provenance in `assets/oem/PROVENANCE.md`.
- Wire details consolidated in `docs/PROTOCOL.md`.

## Known limitations

- **Macros are local-first**: the F75's macro write protocol is not yet
  captured, so recorded macros are stored in profiles for later migration
  (see `MACRO_SUPPORTED` in `web/src/lib/macros.ts` and the Raw HID debug tab).
- **F1–F12 remapping is disabled** (firmware-locked slots).
- Keybind outputs beyond the keyboard/consumer pages (usage `> 0xFF`) are not
  representable and are ignored on apply.
- **V1 profiles capture keybind layers only** — lighting state is transient
  in this app and is not saved into profiles.
- Sleep timer on wired mode is informational only (`KB.ini` `ShowPower=0`).