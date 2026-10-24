import { describe, expect, it } from 'vitest';
import {
  BridgeSession, EffectsEngine, VirtualKeyboardBridge, createGeometry,
  type Frame, type KeyboardLayout, type KeyboardBridge,
} from '../../../packages/engine/src';
import { F75_LAYOUT, createF75Bridge } from './bridges/f75';
import { WIRED_VID, WIRED_PID, WIRELESS_VID, WIRELESS_PID } from './protocol';

const macropad: KeyboardLayout = {
  id: 'macropad', name: 'Single row macropad',
  leds: ['KeyA', 'KeyB', 'Enter'].map((keyCode, i) => ({
    id: 1000 + i * 257, label: `Custom ${i}`, keyCode, x: i + 0.5, y: 0, row: 0, column: i,
  })),
};
const single: KeyboardLayout = { id: 'single', name: 'One LED', leds: [macropad.leds[0]] };
const irregular: KeyboardLayout = {
  id: 'split', name: 'Split keyboard with gaps',
  leds: Array.from({ length: 15 }, (_, i) => ({
    id: 900 + i * 131, label: `Key ${i}`, keyCode: `Key${String.fromCharCode(65 + i)}`,
    x: i % 5 + (i % 5 > 2 ? 4 : 0) + 0.5, y: Math.floor(i / 5),
    row: Math.floor(i / 5), column: i % 5 + (i % 5 > 2 ? 4 : 0),
  })),
};
const remapped: KeyboardLayout = {
  ...F75_LAYOUT, id: 'remapped', name: 'F75 geometry with unrelated LED IDs',
  leds: F75_LAYOUT.leds.map((led, i) => ({ ...led, id: 10000 + i * 257 })),
};

function assertFrame(frame: Frame, layout: KeyboardLayout, context: string) {
  const ids = new Set(layout.leds.map((led) => led.id));
  const invalid = [...frame].find(([id, rgb]) => !ids.has(id) || rgb.length !== 3
    || rgb.some((value) => !Number.isInteger(value) || value < 0 || value > 255));
  expect(invalid, `${context}: invalid LED/color ${JSON.stringify(invalid)}`).toBeUndefined();
}

describe.each([single, macropad, irregular, remapped])('$name', (layout) => {
  const engine = new EffectsEngine(layout, () => 1000);

  it('runs every animation with only this layout’s LED IDs', () => {
    for (const [id, effect] of Object.entries(engine.library.animations)) {
      for (const t of [0, 0.037, 0.5, 3, 30, 100000]) {
        assertFrame(effect.fn(t), layout, `${id} @ ${t}`);
      }
    }
  });

  it('runs every reactive effect with empty, held, and released input', () => {
    const core = engine.library.reactiveCore;
    const presses = Array.from({ length: 20 }, (_, i) => {
      const press = core.makePress(layout.leds[i % layout.leds.length].id, i * 0.05, i);
      press.release = i % 3 === 0 && i >= 20 - layout.leds.length ? null : i * 0.05 + 0.03;
      return press;
    });
    const audio = engine.library.audio;
    audio.pushAudioSample({ level: 0.7, bass: 0.8, mid: 0.6, treble: 0.3, centroid: 0.5, spectrum: Array(20).fill(0.7) });
    for (const [id, effect] of Object.entries(engine.library.reactive)) {
      for (const t of [0, 0.037, 0.5, 3, 30, 100000]) {
        assertFrame(effect.fn(t, []), layout, `${id} empty @ ${t}`);
        assertFrame(effect.fn(t, presses.filter((press) => press.t <= t)), layout, `${id} input @ ${t}`);
      }
    }
  });
});

describe('layout-independent engines', () => {
  it('maps input to sparse IDs, independently in two engines', () => {
    const a = new EffectsEngine(macropad);
    const b = new EffectsEngine(remapped);
    a.startReactive('held');
    b.startReactive('held');
    a.keyDown('KeyA');
    expect([...a.render().keys()]).toEqual([1000]);
    expect(b.render().size).toBe(0);
    b.keyDown('KeyA');
    expect([...b.render().keys()]).toEqual([remapped.leds.find((led) => led.keyCode === 'KeyA')!.id]);
    a.keyUp('KeyA');
    a.releaseAll();
    a.stop();
    expect(b.render().size).toBeGreaterThan(0);
  });

  it('builds adjacency from layout positions, without interpreting IDs', () => {
    const geometry = createGeometry(macropad);
    expect(geometry.NEIGHBOURS.get(1257)).toEqual([1000, 1514]);
    expect(geometry.ROW_OF.get(1000)).toEqual([1000, 1257, 1514]);
    expect(geometry.LED_BY_NAME.get('A')).toBe(1000);
    expect(createGeometry(irregular).NEIGHBOURS.get(irregular.leds[2].id)).not.toContain(irregular.leds[3].id);
  });

  it('rejects broken layouts before rendering effects', () => {
    expect(() => createGeometry({ ...single, leds: [] })).toThrow();
    expect(() => createGeometry({ ...single, leds: [...single.leds, ...single.leds] })).toThrow();
    expect(() => createGeometry({ ...single, leds: [{ ...single.leds[0], x: NaN }] })).toThrow();
  });

  it('keeps audio separate and preserves a running effect on unknown selections', () => {
    const a = new EffectsEngine(macropad), b = new EffectsEngine(single);
    a.library.audio.pushAudioSample({ level: 0.7, bass: 0.8, mid: 0.6, treble: 0.3, centroid: 0.5, spectrum: Array(20).fill(0.7) });
    expect(a.library.audio.SOUND_STATE.level).toBeGreaterThan(0);
    expect(b.library.audio.SOUND_STATE.level).toBe(0);
    a.startAnimation('rainbow');
    expect(a.startReactive('unknown')).toBe(false);
    expect(a.animation).toBe('rainbow');
    expect(a.startAnimation('unknown')).toBe(false);
    a.startReactive('held');
    expect(a.animation).toBeNull();
  });
});

describe('bridge sessions', () => {
  it('streams an existing effect through the virtual bridge and clears missing keys', async () => {
    const engine = new EffectsEngine(macropad);
    const bridge = new VirtualKeyboardBridge(macropad);
    let now = 0;
    const session = new BridgeSession(bridge, () => now);
    await session.connect();
    engine.startReactive('held');
    engine.keyDown('KeyA');
    await session.sendFrame(engine.render());
    expect(bridge.frame.get(1000)).not.toEqual([0, 0, 0]);
    expect(bridge.frame.get(1257)).toEqual([0, 0, 0]);
    now = 100;
    await session.sendFrame(new Map());
    expect([...bridge.frame.values()].every((c) => c.every((v) => v === 0))).toBe(true);
    await session.disconnect();
    expect(bridge.connected).toBe(false);
  });

  it('drops busy frames and waits for the pending write before cleanup', async () => {
    let finish!: () => void;
    const events: string[] = [];
    const bridge: KeyboardBridge = {
      id: 'slow', name: 'Slow bridge', layout: macropad,
      capabilities: { perKeyRgb: true, maxFps: 30 },
      async connect() { events.push('connect'); },
      writeFrame() { events.push('write'); return new Promise<void>((resolve) => { finish = resolve; }); },
      async disconnect() { events.push('disconnect'); },
    };
    const session = new BridgeSession(bridge);
    await session.connect();
    const pending = session.sendFrame(new Map());
    await Promise.resolve();
    expect(await session.sendFrame(new Map())).toBe(false);
    const disconnect = session.disconnect();
    await Promise.resolve();
    expect(events).toEqual(['connect', 'write']);
    finish();
    await pending;
    await disconnect;
    expect(events).toEqual(['connect', 'write', 'disconnect']);
    expect(await session.sendFrame(new Map())).toBe(false);
  });

  it('respects bridge FPS and can reconnect after a write failure', async () => {
    let now = 0, fail = false;
    const bridge = new VirtualKeyboardBridge(macropad);
    const write = bridge.writeFrame.bind(bridge);
    bridge.writeFrame = async (frame) => { if (fail) throw new Error('unplugged'); await write(frame); };
    const session = new BridgeSession(bridge, () => now);
    await session.connect();
    expect(await session.sendFrame(new Map())).toBe(true);
    expect(await session.sendFrame(new Map())).toBe(false);
    now = 100;
    fail = true;
    await expect(session.sendFrame(new Map())).rejects.toThrow('unplugged');
    expect(await session.sendFrame(new Map())).toBe(false);
    fail = false;
    await session.connect();
    expect(await session.sendFrame(new Map())).toBe(true);
    await session.disconnect();
  });
});

describe.each([
  ['USB', WIRED_VID, WIRED_PID], ['wireless', WIRELESS_VID, WIRELESS_PID],
] as const)('F75 %s bridge', (_name, vendorId, productId) => {
  it('uses the existing report protocol and preserves the host’s HID handle', async () => {
    const feature: Array<[number, Uint8Array]> = [], output: Array<[number, Uint8Array]> = [];
    const device = {
      vendorId, productId, opened: true,
      async sendFeatureReport(id: number, data: ArrayBuffer) { feature.push([id, new Uint8Array(data)]); },
      async sendReport(id: number, data: ArrayBuffer) { output.push([id, new Uint8Array(data)]); },
    } as unknown as HIDDevice;
    const bridge = createF75Bridge(device);
    await bridge.connect();
    await bridge.writeFrame(new Map([[F75_LAYOUT.leds[0].id, [255, 0, 0]]]));
    if (vendorId === WIRED_VID) {
      expect(output).toHaveLength(0);
      const frame = feature.find(([id]) => id === 0x06)!;
      expect(frame[1]).toHaveLength(519);
      expect(frame[1][0]).toBe(0x08);
      expect(frame[1][7 + F75_LAYOUT.leds[0].id * 3]).toBe(255);
    } else {
      expect(feature).toHaveLength(0);
      expect(output[0][0]).toBe(0x13);
      expect(output[0][1]).toHaveLength(19);
    }
    await bridge.disconnect();
    expect(device.opened).toBe(true);
  });
});
