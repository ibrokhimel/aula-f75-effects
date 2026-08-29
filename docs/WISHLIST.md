# Wishlist

Things worth building, with enough detail to pick up cold.

## Native background daemon (system-wide reactive lighting)

**Why:** the reactive effects only fire while the browser tab has focus. That is
the web security model, not a bug — a page only receives keys while focused,
precisely so sites cannot read what you type elsewhere. No flag changes it. To
have the lighting react while you actually work, it has to be a native process.

**What makes this cheap:** the effect library has no browser dependencies.
`lib/animations`, `lib/reactive`, `lib/games`, `lib/protocol` and
`lib/layout-map` are pure `(t, …) => Map<led, RGB>` functions — 116 animations,
93 reactive effects and 14 games, all covered by the existing test suite. The
only WebHID-specific code is `lib/direct-mode.ts`, roughly 100 lines of
transport. Nothing else needs rewriting.

**Key capture — no general keylogger required.** The keyboard is itself the HID
device, so input can be read from it specifically rather than hooking the whole
system. That is both safer and better behaved: a second keyboard will not
trigger the lighting.

| OS | Mechanism | Notes |
|----|-----------|-------|
| Windows | Raw Input (`RegisterRawInputDevices` + `WM_INPUT`) | Filter on VID `258A` / PID `010C`. No injection, no admin, and much less likely to trip antivirus than a `WH_KEYBOARD_LL` hook |
| Linux | evdev `/dev/input/eventX`, or hidraw | `udev/99-aula-f75.rules` already grants the access |
| macOS | `IOHIDManager` | Needs an Input Monitoring grant |

**Suggested layout:**

```
packages/core/            animations, reactive, games, protocol, layout-map (moves verbatim)
packages/transport-web/   existing WebHID direct-mode.ts
packages/transport-node/  node-hid, same protocol bytes
packages/daemon/          key source + effect runner + tray
web/                      unchanged, imports core
```

Start with a Node daemon (`node-hid` out, Raw Input in) since it imports the
effect modules unchanged and the existing tests keep covering them. Tauri would
give a nicer tray later.

**Design constraint:** map scancode to LED index and discard immediately. The
daemon never needs keystroke *content*, only which key — so there is nothing
sensitive to persist or leak, and the antivirus story stays clean.

**Effort:** core daemon reacting to real keypresses, about a day. Tray,
autostart, effect picker and per-OS packaging are the long tail.

**Note:** onboard firmware cannot cover for this. Per-key control via the select
byte was found to be structurally impossible (see RESEARCH-LOG), so the board
cannot run these effects standalone. A host process is genuinely required.
