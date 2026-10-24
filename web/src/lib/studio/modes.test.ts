import { describe, expect, it } from 'vitest';
import {
  AUDIO_PARAMETERS, SILENCE, LayerMixer, createEffectLibrary, composeLayers, hexColor, normalizeControls,
  renderActivity, renderAudio, renderKeyColors, renderScreen, resolveReactiveParameters,
  sampleAudio, sampleScreen, sanitizeKeyColors, smoothAudio, zoneKeys,
  type ActivityControls, type Frame, type LightingLayer, type PixelSource, type ScreenControls, type SystemSample,
} from '../../../../packages/engine/src';
import { ReactiveEngine } from '../../../../packages/engine/src/reactive/engine';
import { F75_LAYOUT } from '../bridges/f75/layout';
import { TYPING_FAMILIES, defaultModes, parseModes } from './modes';

const library = createEffectLibrary(F75_LAYOUT);
const validIds = new Set(F75_LAYOUT.leds.map(led => led.id));
const serialize = (frame: Frame) => JSON.stringify([...frame].sort(([a], [b]) => a - b));
function valid(frame: Frame) {
  for (const [id, color] of frame) if (!validIds.has(id) || color.length !== 3 || color.some(value => !Number.isInteger(value) || value < 0 || value > 255)) throw new Error(`Invalid LED ${id}: ${color}`);
}
const presses = ['KeyF', 'KeyJ', 'KeyD', 'KeyL'].map((code, i) => {
  const press = library.reactiveCore.makePress(library.reactiveCore.LED_FOR_CODE.get(code)!, i * 0.13, i, code, 0);
  press.release = i * 0.13 + 0.8;
  return press;
});
describe.each(TYPING_FAMILIES.filter(family => family.group === 'Classic').flatMap(family => [...family.variants]))('%s typing controls', id => {
  it('makes every exposed control affect the renderer and emits valid frames at its limits', () => {
    const definition = library.reactive[id];
    expect(definition.parameters?.length).toBeGreaterThan(0);
    for (const parameter of definition.parameters!) {
      if (parameter.kind !== 'range') continue;
      let changed = false;
      for (const value of [parameter.min, parameter.max]) for (const time of [0.7, 0.95, 1.1, 1.5, 2, 3, 4]) {
        const frame = definition.fn(time, presses, { [parameter.id]: value }); valid(frame);
        if (serialize(frame) !== serialize(definition.fn(time, presses))) changed = true;
      }
      expect(changed, `${id}.${parameter.id} has no effect`).toBe(true);
    }
  });
});
// Expansion entries respond to chords, long histories, live audio and app events, so the
// four-press fixture above can't exercise them. Each case gets a fresh library fed all of these.
function expansionScenario(id: string, values: Record<string, number>) {
  const l = createEffectLibrary(F75_LAYOUT);
  let now = 0;
  l.audio.setSoundClock(() => now); l.events.setClock(() => now);
  l.events.register({ id: 'probe', types: ['build', 'test', 'download', 'mute', 'timer', 'battery', 'application', 'shortcut', 'notification', 'resource', 'canvas'], ttlMs: 600000 });
  l.events.setApplicationRules({ editor: 'aurora', terminal: 'expansion.life-colony' });
  l.events.setShortcutGuides([{ process: 'editor', mods: 2, keys: ['KeyS', 'KeyF'] }]);
  const codes = ['KeyF', 'KeyJ', 'KeyD', 'KeyK', 'KeyS', 'KeyL', 'KeyA', 'Space', 'KeyE', 'KeyI'];
  const all = Array.from({ length: 60 }, (_, i) => {
    const t = i * 0.11 + (i % 5 === 0 ? 0 : 0.02), press = l.reactiveCore.makePress(l.reactiveCore.LED_FOR_CODE.get(codes[(i * 7) % codes.length])!, t, i, codes[(i * 7) % codes.length], i % 4 === 0 ? 2 : 0);
    press.release = i % 6 === 5 ? null : t + 0.08 + (i % 3) * 0.3;
    return press;
  });
  const frames: string[] = [];
  let seq = 0;
  for (let step = 0; step <= 160; step++) {
    const t = step / 20; now = t * 1000;
    const audio = sampleAudio(t);
    l.audio.pushAudioSample({ ...audio, left: audio.level * (0.5 + 0.5 * Math.sin(t)), right: audio.level * (0.5 - 0.5 * Math.sin(t)), pitch: { hz: 220 * 2 ** ((step >> 3) % 12 / 12), confidence: 0.9, pitchClass: (9 + (step >> 3)) % 12 } });
    if (step % 10 === 0) {
      const e = (type: string, data: unknown) => l.events.push({ version: 1, id: `${type}-${seq++}`, source: 'probe', at: now, type, data });
      const p = (step / 160);
      e('build', { runId: 'r', progress: p, result: p < 1 ? 'running' : 'success' });
      e('test', { runId: 'r', group: ['unit', 'e2e', 'lint'][step % 3], progress: p, result: step % 30 === 0 ? 'failure' : 'running' });
      e('download', { transferId: 'd', completed: p * 100, total: 100 });
      e('mute', { state: step % 20 === 0 ? 'muted' : 'unmuted' });
      e('timer', { timerId: 't', phase: 'work', remaining: 60 - p * 50, duration: 60, paused: false });
      e('battery', { percent: 80 - p * 60, charging: false });
      e('application', { process: step % 40 < 20 ? 'editor' : 'terminal' });
      e('shortcut', { process: 'editor', keys: ['KeyS'], mods: 2, token: `s${step}` });
      e('notification', { notificationId: `n${step}`, state: 'unread', severity: 'warning' });
      e('resource', { cpu: 30 + 50 * p, memory: 40 + 30 * p });
      e('canvas', { overlay: 'ripple', value: p, hue: p, keys: ['KeyA'] });
    }
    if (step % 8 === 0) { const frame = l.reactive[id].fn(t, all.filter(press => press.t <= t), values); valid(frame); frames.push(serialize(frame)); }
  }
  return frames.join('|');
}
// Controls that only act in a moment the busy scenario never reaches.
const SITUATIONAL = new Set([
  'expansion.release-compass.reach', 'expansion.release-compass.speed', // after every key is released
  'expansion.download-channel.width', // downloads of unknown size
  'expansion.afterwork-rain.capacity', 'expansion.quiet-reading-room.idle', // after typing goes idle
  'expansion.recurring-constellations.window', // repeated multi-key sequences
  'expansion.build-runner.resultHold', 'expansion.timer-landing.resultHold', 'expansion.download-channel.hold', // after a run finishes
  'expansion.meeting-mute.stale', // after mute events stop arriving
  'expansion.focus-arc.breakMix', // during a timer break
  'expansion.notification-inbox.expiry', 'expansion.local-event-canvas.capacity', // when events age out or overflow
]);
describe.each(TYPING_FAMILIES.filter(family => family.group !== 'Classic').map(family => family.variants[0]))('%s expansion controls', id => {
  it('changes the picture at a control limit when fed presses, audio and app events', () => {
    const definition = library.reactive[id];
    for (const parameter of definition.parameters ?? []) {
      if (parameter.kind !== 'range' || parameter.id === 'seed' || SITUATIONAL.has(`${id}.${parameter.id}`)) continue;
      const baseline = expansionScenario(id, {});
      const changed = [parameter.min, parameter.max].some(value => expansionScenario(id, { [parameter.id]: value }) !== baseline);
      expect(changed, `${id}.${parameter.id} has no effect`).toBe(true);
    }
  });
});
it('edits typing parameters without dropping held keys or restarting the clock', () => {
  let now = 0;
  const engine = new ReactiveEngine(library.reactiveCore, library.reactive, () => now);
  engine.start('fade', { decay: 0.2 }); engine.keyDown('KeyF'); now = 100; engine.keyUp('KeyF'); now = 500;
  const before = serialize(engine.render()); engine.setParameters({ decay: 4 });
  expect(serialize(engine.render())).not.toBe(before); expect(engine.hits).toBe(1); expect(engine.clock()).toBe(0.5);
  expect(engine.start('__proto__')).toBe(false);
});

describe('audio rendering', () => {
  it.each(Object.keys(AUDIO_PARAMETERS))('%s stays dark with a silent input', style => {
    expect(renderAudio(F75_LAYOUT, SILENCE, style as keyof typeof AUDIO_PARAMETERS, {}).size).toBe(0);
  });
  it.each(Object.entries(AUDIO_PARAMETERS))('%s has working controls and bounded colors', (style, schema) => {
    for (const parameter of schema) {
      if (parameter.kind !== 'range') continue;
      let changed = false;
      for (const time of [0.2, 0.7, 1.3, 2.4]) for (const value of [parameter.min, parameter.max]) {
        const frame = renderAudio(F75_LAYOUT, sampleAudio(time), style as keyof typeof AUDIO_PARAMETERS, { [parameter.id]: value }); valid(frame);
        if (serialize(frame) !== serialize(renderAudio(F75_LAYOUT, sampleAudio(time), style as keyof typeof AUDIO_PARAMETERS, {}))) changed = true;
      }
      expect(changed, `${style}.${parameter.id} has no effect`).toBe(true);
    }
  });
  it('applies gain, noise gating, and signal smoothing to actual input values', () => {
    const source = sampleAudio(0.27);
    expect(serialize(renderAudio(F75_LAYOUT, source, 'zones', {}, 0.3))).not.toBe(serialize(renderAudio(F75_LAYOUT, source, 'zones', {}, 3)));
    expect(renderAudio(F75_LAYOUT, { ...SILENCE, level: 0.01, bass: 0.01 }, 'pulse', {}, 1, 0.02).size).toBe(0);
    expect(smoothAudio(SILENCE, { ...SILENCE, level: 1, bass: 1 }, 0.8).level).toBeCloseTo(0.2);
  });
});

describe('screen color sampling', () => {
  const controls: ScreenControls = { mapping: 'spatial', crop: 'full', saturation: 1, exposure: 1 };
  const source: PixelSource = { width: 20, height: 12, data: Uint8ClampedArray.from(Array.from({ length: 20 * 12 }, (_, i) => Math.floor(i / 20) < 6 ? [240, 20, 10, 255] : [10, 30, 240, 255]).flat()) };
  it('maps distinct image regions onto distinct keyboard positions', () => {
    const frame = renderScreen(F75_LAYOUT, source, controls); valid(frame);
    const top = F75_LAYOUT.leds.find(led => led.row === 0)!.id, bottom = F75_LAYOUT.leds.find(led => led.row === 5)!.id;
    expect(frame.get(top)![0]).toBeGreaterThan(frame.get(top)![2]);
    expect(frame.get(bottom)![2]).toBeGreaterThan(frame.get(bottom)![0]);
  });
  it('averages the selected crop rather than ignoring capture-area controls', () => {
    const top = renderScreen(F75_LAYOUT, source, { ...controls, mapping: 'average', crop: 'top' });
    const bottom = renderScreen(F75_LAYOUT, source, { ...controls, mapping: 'average', crop: 'bottom' });
    expect(new Set([...top.values()].map(String)).size).toBe(1);
    expect(serialize(top)).not.toBe(serialize(bottom));
    const gray = renderScreen(F75_LAYOUT, source, { ...controls, saturation: 0 });
    for (const color of gray.values()) expect(color[0]).toBe(color[2]);
  });
  it('uses screen edges and rejects incomplete frames', () => {
    const test = sampleScreen(0.5, 'neon');
    expect(serialize(renderScreen(F75_LAYOUT, test, { ...controls, mapping: 'edges' }))).not.toBe(serialize(renderScreen(F75_LAYOUT, test, controls)));
    expect(renderScreen(F75_LAYOUT, { width: 3, height: 3, data: [0] }, controls).size).toBe(0);
    expect(renderScreen(F75_LAYOUT, null, controls).size).toBe(0);
  });
});

describe('per-key colors and layer composition', () => {
  const id = F75_LAYOUT.leds[0].id;
  it('keeps colors on their actual LED and rejects unknown ids and malformed values', () => {
    const colors = sanitizeKeyColors(F75_LAYOUT, { [id]: '#ff4400', 99999: '#ffffff', [F75_LAYOUT.leds[1].id]: 'red' });
    expect(colors).toEqual({ [id]: '#ff4400' }); expect(renderKeyColors(F75_LAYOUT, colors).get(id)).toEqual([255, 68, 0]);
    expect(hexColor('bad')).toEqual([0, 0, 0]);
    expect(zoneKeys(F75_LAYOUT, 'wasd')).toHaveLength(4);
    expect(zoneKeys(F75_LAYOUT, 'arrows')).toHaveLength(4);
  });
  const animations = {
    red: { name: 'Red', description: '', category: 'Classic' as const, parameters: [], fn: () => new Map(F75_LAYOUT.leds.map(led => [led.id, [200, 0, 0] as [number, number, number]])) },
    blue: { name: 'Blue', description: '', category: 'Classic' as const, parameters: [], fn: () => new Map(F75_LAYOUT.leds.map(led => [led.id, [0, 0, 200] as [number, number, number]])) },
  };
  const layer = (effect: string, patch: Partial<LightingLayer> = {}): LightingLayer => ({ id: effect, name: effect, effect, enabled: true, parameters: {}, opacity: 1, blend: 'normal', zone: 'all', ...patch });
  it('composes in visible stack order and implements opacity, additive light, and masks', () => {
    expect(composeLayers(F75_LAYOUT, animations, 0, [layer('red'), layer('blue')]).get(id)).toEqual([200, 0, 0]);
    expect(composeLayers(F75_LAYOUT, animations, 0, [layer('blue'), layer('red')]).get(id)).toEqual([0, 0, 200]);
    expect(composeLayers(F75_LAYOUT, animations, 0, [layer('red', { opacity: 0.5 }), layer('blue')]).get(id)).toEqual([100, 0, 100]);
    expect(composeLayers(F75_LAYOUT, animations, 0, [layer('red', { blend: 'add' }), layer('blue')]).get(id)).toEqual([200, 0, 200]);
    const masked = composeLayers(F75_LAYOUT, animations, 0, [layer('red', { zone: 'wasd' }), layer('blue')]);
    expect(masked.get(id)).toEqual([0, 0, 200]); expect(masked.get(zoneKeys(F75_LAYOUT, 'wasd')[0])).toEqual([200, 0, 0]);
    expect(composeLayers(F75_LAYOUT, animations, 0, [layer('red', { enabled: false })]).size).toBe(0);
  });
  it('handles screen/multiply blending, respects effect parameters, and preserves the layer definitions', () => {
    expect(composeLayers(F75_LAYOUT, animations, 0, [layer('red', { blend: 'multiply' }), layer('blue')]).get(id)).toEqual([0, 0, 0]);
    const first = defaultModes().layers.items, copy = structuredClone(first);
    valid(composeLayers(F75_LAYOUT, library.animations, 2.7, first)); expect(first).toEqual(copy);
    expect(serialize(composeLayers(F75_LAYOUT, library.animations, 2.7, [{ ...first[2], parameters: { width: 0.5 } }]))).not.toBe(serialize(composeLayers(F75_LAYOUT, library.animations, 2.7, [{ ...first[2], parameters: { width: 4 } }])));
  });
  it('keeps each layer at the same phase when its motion rate changes', () => {
    const mixer = new LayerMixer(F75_LAYOUT, library.animations), base = defaultModes().layers.items[2];
    const before = serialize(mixer.render(3.7, [base]));
    const faster = { ...base, parameters: { ...base.parameters, rate: 2 } };
    expect(serialize(mixer.render(3.7, [faster]))).toBe(before);
    expect(serialize(mixer.render(4.7, [faster]))).toBe(serialize(composeLayers(F75_LAYOUT, library.animations, 5.7, [base])));
    expect(serialize(mixer.render(0, [base]))).toBe(serialize(composeLayers(F75_LAYOUT, library.animations, 0, [base])));
  });
});

describe('system activity and persisted mode settings', () => {
  const sample: SystemSample = { cpu: 20, memory: 80, totalBytes: 100, usedBytes: 80, uptime: 60, timestamp: 1 };
  const controls: ActivityControls = { metric: 'cpu', view: 'bar', warning: 80, low: '#88dfb4', high: '#f37666' };
  it('maps the chosen metric and warning point, and stays dark without readings', () => {
    const cpu = renderActivity(F75_LAYOUT, sample, controls), memory = renderActivity(F75_LAYOUT, sample, { ...controls, metric: 'memory' });
    expect(cpu.size).toBeLessThan(memory.size); valid(memory);
    expect(serialize(cpu)).not.toBe(serialize(renderActivity(F75_LAYOUT, sample, { ...controls, warning: 20 })));
    expect(renderActivity(F75_LAYOUT, null, controls).size).toBe(0);
    expect(renderActivity(F75_LAYOUT, { ...sample, cpu: 0 }, controls).size).toBe(0);
  });
  it('restores every mode and ignores corrupt, unsupported, and out-of-range settings', () => {
    const defaults = defaultModes();
    expect(parseModes(JSON.stringify(defaults))).toEqual(defaults);
    expect(parseModes('{broken')).toEqual(defaults);
    const result = parseModes(JSON.stringify({ typing: { effect: 'sndspectrum', family: 'ripples', parameters: { speed: 900 } }, audio: { style: 'bad', gain: 999 }, layers: { items: [{ id: 'a', effect: '__proto__' }] }, perKey: { colors: { 99999: '#ffffff' } }, activity: { source: 'fake', warning: -1 } }));
    expect(result.typing.effect).toBe('ripple'); expect(result.typing.parameters.speed).toBe(28);
    expect(result.audio.gain).toBe(4); expect(result.layers.items).toEqual([]); expect(result.perKey.colors).toEqual({});
    expect(result.activity.source).toBe('computer'); expect(result.activity.warning).toBe(10);
    expect(normalizeControls(AUDIO_PARAMETERS.spectrum, { bad: 2 })).not.toHaveProperty('bad');
    expect(resolveReactiveParameters('__proto__')).toEqual({});
  });
});
