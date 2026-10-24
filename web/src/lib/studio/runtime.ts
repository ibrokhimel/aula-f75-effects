import { ReactiveEngine } from '../../../../packages/engine/src/reactive/engine';
import { createEffectLibrary, LayerMixer, renderAudio, renderScreen, renderKeyColors, renderActivity, sampleAudio, sampleScreen, smoothAudio, SILENCE, type Frame, type AudioInput, type PixelSource, type SystemSample } from '../../../../packages/engine/src';
import { F75_LAYOUT } from '../bridges/f75/layout';
import { defaultsFor, generatorFor, LIGHTING_MODES, type StudioSettings, type LightingMode, type Playback } from './catalog';
import { parseSettings } from './storage';
import { defaultModes, parseModes, requirementsFor, type ModeSettings } from './modes';
import { adjustFrame } from './frame';

/** enabled streams to the keyboard; outputChosen records that the person set it, rather than a default. */
export interface StudioConfiguration { mode: LightingMode; automatic: StudioSettings; modes: ModeSettings; playback: Playback; epoch: number; fps: number; enabled: boolean; outputChosen: boolean }
export function defaultStudioConfiguration(): StudioConfiguration { return { mode: 'automatic', automatic: defaultsFor(), modes: defaultModes(), playback: 'playing', epoch: 0, fps: 30, enabled: false, outputChosen: false }; }
/** The Windows app streams by default. Only an explicit choice keeps output off, so v0.3.0's saved default no longer does. */
export function withDefaultOutput(config: StudioConfiguration): StudioConfiguration {
  return config.outputChosen ? config : { ...config, enabled: true };
}
export function parseStudioConfiguration(value: unknown): StudioConfiguration {
  const v = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { mode: LIGHTING_MODES.some(m => m.id === v.mode) ? v.mode as LightingMode : 'automatic', automatic: parseSettings(v.automatic), modes: parseModes(JSON.stringify(v.modes ?? {})), playback: ['playing', 'paused', 'stopped'].includes(String(v.playback)) ? v.playback as Playback : 'playing', epoch: typeof v.epoch === 'number' && Number.isFinite(v.epoch) ? v.epoch : 0, fps: typeof v.fps === 'number' && Number.isFinite(v.fps) ? Math.max(5, Math.min(30, v.fps)) : 30, enabled: v.enabled === true, outputChosen: v.outputChosen === true };
}

/** The selected effect listens to sound: an Audio mode style, or a typing scene with an audio layer. */
export function studioNeedsAudio(config: StudioConfiguration): boolean {
  return config.mode === 'audio' || config.mode === 'typing' && requirementsFor(config.modes.typing.effect)?.audio === true;
}

/** The same stateful renderer runs in a tab or in the Windows main process. */
export class StudioRuntime {
  config = defaultStudioConfiguration();
  private phase = 0;
  private animationPhase = 0;
  private previous = 0;
  private clock = 0;
  /** A host may share its library so its audio capture and app events reach expansion effects. */
  private readonly library: ReturnType<typeof createEffectLibrary>;
  private readonly reactive: ReactiveEngine;
  private mixer: LayerMixer;
  constructor(library = createEffectLibrary(F75_LAYOUT)) {
    this.library = library;
    this.reactive = new ReactiveEngine(library.reactiveCore, library.reactive, () => this.clock * 1000);
    this.mixer = new LayerMixer(F75_LAYOUT, library.animations);
  }
  private audio: AudioInput = SILENCE;
  private pixels: PixelSource | null = null;
  private screenSeen = false;
  private audioSeenAt = 0;
  private game: Frame | null = null;
  private gameSeenAt = 0;
  private lastFrame: Frame = new Map();
  get hits(): number { return this.config.mode === 'typing' ? this.reactive.hits : 0; }
  configure(value: unknown) {
    const next = parseStudioConfiguration(value), before = this.config;
    const restart = next.mode !== before.mode || next.epoch !== before.epoch;
    if (restart) { this.phase = 0; this.animationPhase = 0; this.previous = 0; this.audio = SILENCE; this.game = null; this.pixels = null; this.screenSeen = false; this.mixer = new LayerMixer(F75_LAYOUT, this.library.animations); }
    this.config = next;
    if (restart || next.modes.audio.effect !== before.modes.audio.effect || next.modes.typing.effect !== before.modes.typing.effect) this.library.expansion.reset();
    if (next.mode === 'typing') {
      if (restart || next.modes.typing.effect !== before.modes.typing.effect) this.reactive.start(next.modes.typing.effect, next.modes.typing.parameters);
      else this.reactive.setParameters(next.modes.typing.parameters);
    } else this.reactive.stop();
    if (next.playback !== 'playing') this.reactive.releaseAll();
  }
  keyDown(code: string, mods = 0) { if (this.config.enabled && this.config.playback === 'playing' && this.config.mode === 'typing') this.reactive.keyDown(code, mods); }
  keyUp(code: string) { this.reactive.keyUp(code); }
  releaseAll() { this.reactive.releaseAll(); }
  /** Classic styles read the smoothed copy; expansion effects read the library's own features. */
  pushAudio(sample: AudioInput, feedLibrary = true) {
    this.audio = smoothAudio(this.audio, sample, this.config.modes.audio.smoothing); this.audioSeenAt = performance.now();
    if (feedLibrary) this.library.audio.pushAudioSample(sample);
  }
  pushScreen(pixels: PixelSource | null) { this.pixels = pixels; this.screenSeen = pixels !== null; }
  pushGame(frame: Frame | null) { this.game = frame; this.gameSeenAt = performance.now(); }
  render(now: number, system: SystemSample | null = null): Frame {
    const c = this.config, dt = c.playback === 'playing' && this.previous ? Math.max(0, Math.min(.1, (now - this.previous) / 1000)) : 0;
    this.previous = now;
    if (c.playback === 'stopped') return new Map();
    this.phase += dt; this.clock += dt;
    if (this.game && now - this.gameSeenAt < 500) return this.game;
    let frame: Frame, brightness: number;
    // The sample signal is an explicitly chosen test source, so it may stand in for capture.
    if (c.playback === 'playing' && c.modes.audio.source === 'sample' && studioNeedsAudio(c) && (c.mode === 'typing' || c.modes.audio.effect)) this.library.audio.pushAudioSample(sampleAudio(this.phase));
    switch (c.mode) {
      case 'automatic': this.animationPhase += dt * (c.automatic.parameters.rate ?? 1); return this.lastFrame = adjustFrame(generatorFor({ ...c.automatic, parameters: { ...c.automatic.parameters, rate: 1 } })(this.animationPhase), c.automatic);
      case 'typing': frame = this.reactive.render(); brightness = c.modes.typing.brightness; if (c.modes.typing.color) { const hex = c.modes.typing.color, rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); frame = new Map([...frame].map(([id, color]) => [id, rgb.map(channel => Math.round(channel * Math.max(...color) / 255)) as [number, number, number]])); } break;
      case 'audio': { const a = c.modes.audio; if (a.effect && this.library.reactive[a.effect]) { frame = this.library.reactive[a.effect].fn(this.clock, [], a.parameters); brightness = a.brightness; break; } const sample = a.source === 'sample' ? sampleAudio(this.phase) : now - this.audioSeenAt < 500 ? this.audio : SILENCE; frame = renderAudio(F75_LAYOUT, sample, a.style, a.parameters, a.gain, a.floor); brightness = a.brightness; break; }
      case 'screen': frame = renderScreen(F75_LAYOUT, this.screenSeen ? this.pixels : sampleScreen(this.phase, c.modes.screen.scene), c.modes.screen); brightness = c.modes.screen.brightness; break;
      case 'per-key': frame = renderKeyColors(F75_LAYOUT, c.modes.perKey.colors); brightness = c.modes.perKey.brightness; break;
      case 'layers': frame = this.mixer.render(this.phase, c.modes.layers.items); brightness = c.modes.layers.brightness; break;
      case 'system-activity': { const a = c.modes.activity; frame = renderActivity(F75_LAYOUT, a.source === 'sample' ? { cpu: a.sampleCPU, memory: a.sampleMemory, usedBytes: 0, totalBytes: 0, uptime: 0, timestamp: Date.now() } : system, a); brightness = a.brightness; break; }
    }
    return this.lastFrame = adjustFrame(frame, { ...defaultsFor(), brightness });
  }
}
