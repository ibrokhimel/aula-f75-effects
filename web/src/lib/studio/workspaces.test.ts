import { describe, expect, it } from 'vitest';
import { defaultSetup, parseSetup, parseWorkspaces, parseMacros, defaultMappings } from './workspaces';
import { getSlot, setSlot, validateBlob } from '../keybind';
import { defaultStudioConfiguration, parseStudioConfiguration, StudioRuntime, studioNeedsAudio, withDefaultOutput } from './runtime';
import { EXPANSION_AUDIO_EFFECTS, requirementsFor } from './modes';
import { createEffectLibrary } from '../../../../packages/engine/src';
import { F75_LAYOUT } from '../bridges/f75/layout';

describe('complete studio setups', () => {
  it('round trips mappings, all lighting modes, macros, and preferences', () => {
    const setup = defaultSetup();
    const blob = new Uint8Array(setup.mappings[1]); setSlot(blob, 20, { page: 2, usage: 205 }); setup.mappings[1] = [...blob];
    setup.mode = 'per-key'; setup.modes.perKey.colors[0] = '#123456'; setup.preferences.compact = true;
    setup.macros = [{ id: 'm', name: 'Shortcut', steps: [{ id: 's', action: 'down', code: 'KeyA', ms: 0 }] }];
    expect(parseSetup(JSON.parse(JSON.stringify(setup)))).toEqual(setup);
    expect(getSlot(new Uint8Array(parseSetup(setup).mappings[1]), 20)).toEqual({ page: 2, usage: 205 });
  });
  it('rejects corrupt packets and mismatched layers', () => {
    const mappings = defaultMappings(); mappings[0][0] = 0;
    expect(parseSetup({ mappings }).mappings[0]).toEqual(defaultMappings()[0]);
    const swapped = defaultMappings().reverse();
    expect(parseSetup({ mappings: swapped }).mappings).toEqual(defaultMappings());
    parseSetup({ mappings: [] }).mappings.forEach(b => expect(() => validateBlob(new Uint8Array(b))).not.toThrow());
  });
  it('bounds imported macros and ignores unsupported event types', () => {
    const macros = parseMacros([{ id: 'x', name: 'Test', steps: [{ action: 'execute', code: 'cmd' }, { action: 'down', code: 'DROP TABLE' }, { action: 'delay', ms: 1e9 }, { action: 'up', code: 'KeyA' }] }]);
    expect(macros[0].steps).toHaveLength(2); expect(macros[0].steps[0].ms).toBe(10000);
    expect(parseMacros([{ id: 'x', name: '1', steps: [] }, { id: 'x', name: '2', steps: [] }])).toHaveLength(1);
  });
  it('handles malformed storage and untrusted preferences', () => {
    expect(parseWorkspaces('{bad').profiles).toEqual([]);
    expect(parseSetup({ preferences: { fps: Infinity }, modes: { typing: { effect: '__proto__' } } }).preferences.fps).toBe(30);
    expect(parseStudioConfiguration({ fps: Infinity, mode: 'broken', enabled: 'yes' })).toMatchObject({ fps: 30, mode: 'automatic', enabled: false });
  });
  it('streams to the keyboard by default unless the person switched output off', () => {
    // v0.3.0 saved enabled: false without anyone choosing it.
    expect(withDefaultOutput(parseStudioConfiguration({ enabled: false })).enabled).toBe(true);
    expect(withDefaultOutput(parseStudioConfiguration({})).enabled).toBe(true);
    expect(withDefaultOutput(parseStudioConfiguration({ enabled: false, outputChosen: true })).enabled).toBe(false);
    expect(withDefaultOutput(parseStudioConfiguration({ enabled: true, outputChosen: true })).enabled).toBe(true);
    expect(parseStudioConfiguration(JSON.parse(JSON.stringify({ ...defaultStudioConfiguration(), outputChosen: true }))).outputChosen).toBe(true);
    expect(parseStudioConfiguration({ outputChosen: 'yes' }).outputChosen).toBe(false);
  });
});

describe('Windows studio runtime', () => {
  it('renders every lighting mode into finite RGB values', () => {
    const runtime = new StudioRuntime(), c = defaultStudioConfiguration(); c.enabled = true; c.modes.activity.source = 'sample';
    for (const mode of ['automatic', 'typing', 'audio', 'screen', 'per-key', 'layers', 'system-activity'] as const) {
      runtime.configure({ ...c, mode }); runtime.keyDown('KeyA');
      runtime.render(1000); const frame = runtime.render(1050);
      expect(frame.size, mode).toBeGreaterThan(0);
      for (const rgb of frame.values()) for (const channel of rgb) expect(Number.isFinite(channel) && channel >= 0 && channel <= 255, mode).toBe(true);
    }
  });
  it('freezes the current frame when paused and clears on stop', () => {
    const runtime = new StudioRuntime(), config = { ...defaultStudioConfiguration(), enabled: true };
    runtime.configure(config); runtime.render(1000); const frame = runtime.render(1100);
    runtime.configure({ ...config, playback: 'paused' }); expect(runtime.render(9000)).toEqual(frame);
    runtime.configure({ ...config, automatic: { ...config.automatic, brightness: 0 }, playback: 'paused' });
    expect([...runtime.render(9010).values()].every(rgb => rgb.every(channel => channel === 0))).toBe(true);
    runtime.configure({ ...config, playback: 'stopped' }); expect(runtime.render(9100).size).toBe(0);
  });
  it('applies brightness and cleans game overrides', () => {
    const runtime = new StudioRuntime(), config = defaultStudioConfiguration(); config.mode = 'per-key'; config.modes.perKey.brightness = 0;
    runtime.configure(config); expect([...runtime.render(1000).values()].every(rgb => rgb.every(c => c === 0))).toBe(true);
    runtime.pushGame(new Map([[0, [10, 20, 30]]])); expect(runtime.render(performance.now()).get(0)).toEqual([10, 20, 30]);
    runtime.pushGame(null); expect(runtime.render(performance.now()).get(0)).toEqual([0, 0, 0]);
  });
  const lit = (frame: Map<number, number[]>) => [...frame.values()].some(rgb => Math.max(...rgb) > 0);
  // Runtimes on a library whose audio/event clock advances with each 30 Hz frame, like a real host.
  function clocked() { let now = 1000; const library = createEffectLibrary(F75_LAYOUT); library.audio.setSoundClock(() => now); library.events.setClock(() => now); return { library, runtime: new StudioRuntime(library), tick: (ms: number) => { now = ms; } }; }
  function play(host: ReturnType<typeof clocked>, frames = 90) { let frame = new Map(); for (let i = 0; i <= frames; i++) { const now = 1000 + i * 33; host.tick(now); frame = host.runtime.render(now); } return frame; }
  const typing = (c: ReturnType<typeof defaultStudioConfiguration>, effect: string) => ({ ...c, enabled: true, mode: 'typing' as const, modes: { ...c.modes, typing: { ...c.modes.typing, family: effect, effect } } });
  it('knows which selections need audio capture', () => {
    const c = defaultStudioConfiguration();
    expect(studioNeedsAudio({ ...c, mode: 'audio' })).toBe(true);
    expect(studioNeedsAudio({ ...c, mode: 'typing' })).toBe(false);
    expect(studioNeedsAudio(typing(c, 'expansion.glass-ocean'))).toBe(true);
    expect(studioNeedsAudio(typing(c, 'expansion.foam-puncture'))).toBe(false);
  });
  // The looping sample never goes quiet, and never builds then drops.
  const LOOP_SILENT = new Set(['expansion.quiet-bloom', 'expansion.build-and-drop']);
  it('drives expansion music effects from the selected sample signal, and keeps them dark without input', () => {
    for (const { id } of EXPANSION_AUDIO_EFFECTS) {
      const needs = requirementsFor(id)!, c = defaultStudioConfiguration();
      const config = { ...c, enabled: true, mode: 'audio' as const, modes: { ...c.modes, audio: { ...c.modes.audio, effect: id } } };
      const sampled = clocked(); sampled.runtime.configure(config);
      if (!needs.stereo && !needs.pitch && !LOOP_SILENT.has(id)) expect(lit(play(sampled)), id).toBe(true);
      const silent = clocked(); silent.runtime.configure({ ...config, modes: { ...config.modes, audio: { ...config.modes.audio, source: 'system' } } });
      expect(lit(play(silent)), `${id} lit with no capture`).toBe(false);
    }
  });
  it('feeds typing scenes with an audio layer and routes a shared library\'s app events into the studio', () => {
    const c = defaultStudioConfiguration();
    const scene = clocked(); scene.runtime.configure(typing(c, 'expansion.glass-ocean'));
    expect(lit(play(scene))).toBe(true);
    const host = clocked(); host.runtime.configure(typing(c, 'expansion.build-runner'));
    expect(lit(play(host, 3))).toBe(false);
    host.library.events.register({ id: 'ci', types: ['build'] });
    expect(host.library.events.push({ version: 1, id: 'b1', source: 'ci', at: 1099, type: 'build', data: { runId: 'r', progress: 0.5, result: 'running' } })).toBe(true);
    expect(lit(play(host, 3))).toBe(true);
  });
});
