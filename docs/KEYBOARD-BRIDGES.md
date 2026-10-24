# Shared engine and keyboard bridges

The Windows desktop app is the supported end-user application. The browser UI
is also useful for previews and development. Linux installation rules and the
Linux-only HID lab utility have been removed; older design documents and the
research log are historical records, not current setup instructions.

## Architecture

`packages/engine/src` contains all 116 animations, 227 reactive effects, geometry,
input history, color helpers, and audio analysis. It has no browser, Electron,
Windows, HID, or F75 imports. Each engine owns its layout and audio state;
multiple keyboard engines can coexist without changing global geometry.

```text
Host key/audio events -> EffectsEngine(layout) -> Frame -> BridgeSession -> bridge
                              |
                         preview renderer
```

The host captures input and supplies a clock. The engine renders a complete
logical frame: `Map<LED ID, [red, green, blue]>`. Missing LEDs mean black.
`BridgeSession` limits frame rate, skips frames while a write is pending, and
waits for pending writes before leaving direct mode. Hosts schedule render
calls; the engine does not start timers or capture input on its own.

`web/src/lib/bridges/f75` is the first hardware adapter. It uses the existing
wired and dongle packet encoders. `VirtualKeyboardBridge` implements the same
contract without a keyboard and keeps a copy of the last complete frame.

The F75 web modules re-export a default layout-bound library so the existing
UI, games, and tests keep working. Games, remapping, macros, and onboard
configuration remain outside the shared effects package.

## Adding a keyboard

1. Supply a `KeyboardLayout` with a unique layout ID and LED descriptors.
   Each descriptor has an opaque numeric `id`, a display `label`, optional
   physical `keyCode` such as `KeyA`, and `x`/`y` centre coordinates in key
   units. `width` defaults to 1. `row` and `column` describe logical adjacency
   and must account for gaps; the engine never decodes positions from IDs.
   A key without a `keyCode` can still display lighting.
2. Implement `KeyboardBridge` from `packages/engine/src/bridge.ts`:
   `connect()` enters live RGB mode, `writeFrame()` translates logical LED
   IDs and RGB values into device packets, and `disconnect()` restores onboard
   lighting. Declare the sustainable `maxFps` for that transport. A bridge
   receives a host-owned open device and must leave its handle open.
3. In your host, discover/select the device, open its transport, construct
   the bridge, and create `EffectsEngine(bridge.layout)` and `BridgeSession`.
   Forward physical key-down/up events to the engine and audio samples to
   `engine.library.audio.pushAudioSample()`. Call `releaseAll()` on lost focus
   or input-source disconnect. Schedule render/send at the desired FPS.
4. Add adapter tests against captured or documented packets. Test the actual
   hardware before claiming support. No effect formulas need to change.

A bridge's transport may be WebHID, node-hid, a vendor SDK, or another API.
Only devices with live per-key color control can implement this contract;
onboard-preset-only devices cannot reproduce arbitrary effects. Wireless and
wired variants may require separate bridges or different capability limits.

The supplied desktop host accepts a layout and a bridge factory. Its current
device discovery, configuration panels, and UI preview still select the F75;
adding a bridge to the engine does not automatically add that device to the
app's discovery/UI. Those host integrations are deliberately separate from
effect implementations.

## Run without hardware

From the repository root, using Bun:

```sh
bun run packages/engine/examples/virtual-keyboard.ts
```

This runs an existing reactive effect on a three-key layout with unrelated,
sparse LED IDs and sends its frame through the virtual bridge.

## Validation

```sh
cd web
bun install
bun run test
bunx tsc --noEmit
cd ..
node web/node_modules/typescript/bin/tsc -p packages/engine
cd desktop
npm install
npm run build
npm run build:web
```

The engine's TypeScript configuration uses only `ES2022`, with no DOM or Node
types. The additional contract tests run every animation and reactive effect
against a single LED, a one-row macropad, an irregular split layout, and F75
geometry with entirely different IDs. They also exercise independent input and
audio state, frame-rate limits, failed writes/reconnects, pending-write cleanup,
and F75 wired/dongle report formats. Hardware behavior requires manual testing.
