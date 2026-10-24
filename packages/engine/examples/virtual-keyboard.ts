import { BridgeSession, EffectsEngine, VirtualKeyboardBridge, type KeyboardLayout } from '../src';

const layout: KeyboardLayout = {
  id: 'example-macropad', name: 'Three-key macropad',
  leds: ['KeyA', 'KeyS', 'KeyD'].map((keyCode, column) => ({
    id: 1000 + column * 257, label: keyCode.slice(3), keyCode,
    x: column + 0.5, y: 0, row: 0, column,
  })),
};

const engine = new EffectsEngine(layout);
const bridge = new VirtualKeyboardBridge(layout);
const session = new BridgeSession(bridge);
await session.connect();
try {
  engine.startReactive('held');
  engine.keyDown('KeyS');
  await session.sendFrame(engine.render());
  console.log(JSON.stringify({
    keyboard: layout.name,
    effect: engine.reactive,
    frame: Object.fromEntries(bridge.frame),
  }, null, 2));
} finally {
  engine.releaseAll();
  engine.stop();
  await session.disconnect();
}
