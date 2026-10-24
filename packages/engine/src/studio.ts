import { clamp01, hsv, rgbToHsv, type Frame, type RGB } from './colors';
import { createGeometry, type KeyboardLayout } from './layout';
import { normalizeControls, type AnimationParameter, type AnimationValues } from './animations/parameters';
import type { AnimationEntry } from './animations';
import type { AudioSample } from './audio';

const geometries = new WeakMap<KeyboardLayout, ReturnType<typeof createGeometry>>();
function geometry(layout: KeyboardLayout) {
  let value = geometries.get(layout);
  if (!value) { value = createGeometry(layout); geometries.set(layout, value); }
  return value;
}
export function hexColor(value: string): RGB {
  return /^#[0-9a-f]{6}$/i.test(value) ? [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)) as RGB : [0, 0, 0];
}
const range = (id: string, label: string, value: number, min: number, max: number, step: number, unit = ''): AnimationParameter =>
  ({ kind: 'range', id, label, default: value, min, max, step, unit });
export type AudioStyle = 'spectrum' | 'pulse' | 'waveform' | 'zones';
export type AudioInput = AudioSample & { waveform?: readonly number[] };
export const AUDIO_PARAMETERS: Record<AudioStyle, readonly AnimationParameter[]> = {
  spectrum: [range('bands', 'Frequency bands', 16, 6, 20, 2), range('gap', 'Bar separation', 0.12, 0, 0.5, 0.02)],
  pulse: [range('radius', 'Pulse reach', 9, 3, 16, 1), range('focus', 'Bass emphasis', 0.8, 0, 1, 0.05)],
  waveform: [range('height', 'Wave height', 2, 0.5, 3, 0.1), range('width', 'Trace width', 0.6, 0.2, 1.5, 0.1)],
  zones: [range('balance', 'Treble balance', 1, 0.2, 2, 0.1)],
};
export const SILENCE: AudioInput = { level: 0, bass: 0, mid: 0, treble: 0, centroid: 0.5, spectrum: Array(20).fill(0), waveform: Array(128).fill(0) };

/** This is an explicitly selected test source, never a substitute for capture. */
export function sampleAudio(t: number): AudioInput {
  const kick = Math.exp(-((t * 1.8) % 1) * 5);
  const spectrum = Array.from({ length: 20 }, (_, i) => clamp01(0.18 + 0.45 * (0.5 + 0.5 * Math.sin(t * (2 + i * 0.13) + i * 0.8)) + kick * (1 - i / 20) * 0.3));
  return { level: 0.2 + kick * 0.5, bass: kick * 0.8, mid: spectrum[8], treble: spectrum[17], spectrum, centroid: 0.45, waveform: Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.16 + t * 4) * (0.25 + kick * 0.6) + Math.sin(i * 0.4 - t * 3) * 0.12) };
}
export function smoothAudio(previous: AudioInput, next: AudioInput, smoothing: number): AudioInput {
  const k = Math.min(0.95, Math.max(0, smoothing));
  const blend = (a: number, b: number) => a * k + b * (1 - k);
  return {
    level: blend(previous.level, next.level), bass: blend(previous.bass, next.bass), mid: blend(previous.mid, next.mid), treble: blend(previous.treble, next.treble),
    centroid: blend(previous.centroid, next.centroid), spectrum: next.spectrum.map((v, i) => blend(previous.spectrum[i] ?? 0, v)), waveform: next.waveform,
  };
}
export function renderAudio(layout: KeyboardLayout, input: AudioInput, style: AudioStyle, values: AnimationValues, gain = 1, noiseFloor = 0.02): Frame {
  const { LED_GEO, CX, CY } = geometry(layout);
  const p = normalizeControls(AUDIO_PARAMETERS[style], values);
  const frame: Frame = new Map();
  const signal = (v: number) => clamp01((Number.isFinite(v) ? v - noiseFloor : 0) * gain);
  for (const [led, g] of LED_GEO) {
    let value = 0, hue = 0.55;
    if (style === 'spectrum') {
      const position = g.x * (p.bands - 1);
      const bin = Math.round(Math.floor(position) / (p.bands - 1) * (input.spectrum.length - 1));
      const level = signal(input.spectrum[bin] ?? 0);
      value = level > 0 && 1 - g.y <= level && position % 1 < 1 - p.gap ? 0.8 : 0;
      hue = 0.46 - (1 - g.y) * 0.4;
    } else if (style === 'pulse') {
      const level = signal(input.level * (1 - p.focus) + input.bass * p.focus);
      value = Math.exp(-(Math.hypot(g.ux - CX, (g.uy - CY) * 2) ** 2) / Math.max(0.1, p.radius * p.radius * level)) * level;
      hue = 0.05 + input.centroid * 0.12;
    } else if (style === 'waveform') {
      const wave = input.waveform ?? [];
      const sample = wave[Math.min(wave.length - 1, Math.round(g.x * (wave.length - 1)))] ?? 0;
      const y = CY + Math.max(-1, Math.min(1, sample * gain)) * p.height;
      value = Math.exp(-((g.uy - y) ** 2) / (p.width * p.width)) * signal(input.level) * 1.5;
    } else {
      const band = g.x < 1 / 3 ? input.bass : g.x < 2 / 3 ? input.mid : input.treble * p.balance;
      value = signal(band); hue = g.x < 1 / 3 ? 0.05 : g.x < 2 / 3 ? 0.45 : 0.67;
    }
    if (value > 0.005) frame.set(led, hsv(hue, 0.85, clamp01(value)));
  }
  return frame;
}

export interface PixelSource { data: ArrayLike<number>; width: number; height: number }
export interface ScreenControls { mapping: 'spatial' | 'average' | 'edges'; crop: 'full' | 'center' | 'top' | 'bottom'; saturation: number; exposure: number }
export function sampleScreen(t: number, scene: 'coast' | 'ember' | 'neon'): PixelSource {
  const width = 96, height = 54, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const wave = 0.5 + 0.5 * Math.sin(x / 18 + y / 15 - t * 0.35);
    const hue = scene === 'ember' ? 0.01 + wave * 0.1 : scene === 'coast' ? 0.43 + wave * 0.18 : 0.65 + wave * 0.3;
    const color = hsv(hue, 0.7, 0.32 + wave * 0.55);
    const i = (y * width + x) * 4; data.set([...color, 255], i);
  }
  return { data, width, height };
}
export function renderScreen(layout: KeyboardLayout, source: PixelSource | null, controls: ScreenControls): Frame {
  const frame: Frame = new Map();
  if (!source || source.width < 1 || source.height < 1 || source.data.length < source.width * source.height * 4) return frame;
  const crop = controls.crop === 'center' ? [0.25, 0.25, 0.5, 0.5] : controls.crop === 'top' ? [0, 0, 1, 0.5] : controls.crop === 'bottom' ? [0, 0.5, 1, 0.5] : [0, 0, 1, 1];
  const read = (x: number, y: number): RGB => {
    const px = Math.min(source.width - 1, Math.max(0, Math.round((crop[0] + x * crop[2]) * (source.width - 1))));
    const py = Math.min(source.height - 1, Math.max(0, Math.round((crop[1] + y * crop[3]) * (source.height - 1))));
    const sum = [0, 0, 0]; let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const i = (Math.min(source.height - 1, Math.max(0, py + dy)) * source.width + Math.min(source.width - 1, Math.max(0, px + dx))) * 4;
      for (let c = 0; c < 3; c++) sum[c] += source.data[i + c];
      n++;
    }
    return sum.map(v => Math.round(v / n)) as RGB;
  };
  let average: RGB = [0, 0, 0];
  if (controls.mapping === 'average') {
    const sum = [0, 0, 0];
    for (let y = 0; y < 12; y++) for (let x = 0; x < 20; x++) { const color = read(x / 19, y / 11); for (let c = 0; c < 3; c++) sum[c] += color[c]; }
    average = sum.map(v => Math.round(v / 240)) as RGB;
  }
  for (const [led, g] of geometry(layout).LED_GEO) {
    let x = g.x, y = g.y;
    if (controls.mapping === 'edges') {
      const distances = [x, 1 - x, y, 1 - y]; const nearest = distances.indexOf(Math.min(...distances));
      if (nearest === 0) x = 0; else if (nearest === 1) x = 1; else if (nearest === 2) y = 0; else y = 1;
    }
    const [h, s, v] = rgbToHsv(controls.mapping === 'average' ? average : read(x, y));
    frame.set(led, hsv(h, clamp01(s * controls.saturation), clamp01(v * controls.exposure)));
  }
  return frame;
}

export type KeyColors = Record<string, string>;
export function sanitizeKeyColors(layout: KeyboardLayout, input: unknown): KeyColors {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const ids = new Set(layout.leds.map(led => String(led.id)));
  return Object.fromEntries(Object.entries(input).filter(([id, color]) => ids.has(id) && typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)));
}
export function renderKeyColors(layout: KeyboardLayout, colors: KeyColors): Frame {
  return new Map(layout.leds.filter(led => colors[led.id]).map(led => [led.id, hexColor(colors[led.id])]));
}
export type KeyZone = 'all' | 'wasd' | 'arrows' | 'letters' | 'function';
export function zoneKeys(layout: KeyboardLayout, zone: KeyZone): number[] {
  return layout.leds.filter(led => zone === 'all' || (zone === 'wasd' && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(led.keyCode ?? '')) || (zone === 'arrows' && led.keyCode?.startsWith('Arrow')) || (zone === 'letters' && /^Key[A-Z]$/.test(led.keyCode ?? '')) || (zone === 'function' && /^F\d+$/.test(led.keyCode ?? ''))).map(led => led.id);
}
export type BlendMode = 'normal' | 'add' | 'screen' | 'multiply';
export interface LightingLayer { id: string; name: string; enabled: boolean; effect: string; parameters: AnimationValues; opacity: number; blend: BlendMode; zone: KeyZone }
export function composeLayers(layout: KeyboardLayout, animations: Record<string, AnimationEntry>, time: number, layers: readonly LightingLayer[], phases?: ReadonlyMap<string, number>): Frame {
  const frame: Frame = new Map();
  for (const layer of [...layers].reverse()) {
    if (!layer.enabled || !Object.hasOwn(animations, layer.effect)) continue;
    const source = phases ? animations[layer.effect].fn(phases.get(layer.id) ?? time, { ...layer.parameters, rate: 1 }) : animations[layer.effect].fn(time, layer.parameters);
    const opacity = clamp01(layer.opacity);
    for (const id of zoneKeys(layout, layer.zone)) {
      const a = frame.get(id) ?? [0, 0, 0], b = source.get(id) ?? [0, 0, 0];
      const color = a.map((v, c) => {
        const mixed = layer.blend === 'add' ? Math.min(255, v + b[c]) : layer.blend === 'screen' ? 255 - (255 - v) * (255 - b[c]) / 255 : layer.blend === 'multiply' ? v * b[c] / 255 : b[c];
        return Math.round(v + (mixed - v) * opacity);
      }) as RGB;
      frame.set(id, color);
    }
  }
  return frame;
}

/** Per-layer clocks keep rate edits continuous, including edits on a paused frame. */
export class LayerMixer {
  private lastTime: number | null = null;
  private clocks = new Map<string, { phase: number; rate: number }>();
  constructor(private readonly layout: KeyboardLayout, private readonly animations: Record<string, AnimationEntry>) {}
  render(time: number, layers: readonly LightingLayer[]): Frame {
    if (this.lastTime !== null && time < this.lastTime) this.clocks.clear();
    const dt = this.lastTime === null ? 0 : Math.max(0, time - this.lastTime);
    const next = new Map<string, { phase: number; rate: number }>();
    for (const layer of layers) {
      const values = normalizeControls(this.animations[layer.effect]?.parameters ?? [], layer.parameters);
      const previous = this.clocks.get(layer.id);
      next.set(layer.id, { phase: previous ? previous.phase + dt * previous.rate : time * (values.rate ?? 1), rate: values.rate ?? 1 });
    }
    this.lastTime = time; this.clocks = next;
    return composeLayers(this.layout, this.animations, time, layers, new Map([...next].map(([id, clock]) => [id, clock.phase])));
  }
}

export interface SystemSample { cpu: number; memory: number; usedBytes: number; totalBytes: number; uptime: number; timestamp: number }
export interface ActivityControls { metric: 'cpu' | 'memory'; view: 'bar' | 'heat' | 'zones'; warning: number; low: string; high: string }
export function renderActivity(layout: KeyboardLayout, sample: SystemSample | null, controls: ActivityControls): Frame {
  if (!sample) return new Map();
  const frame: Frame = new Map(), low = hexColor(controls.low), high = hexColor(controls.high);
  for (const [led, g] of geometry(layout).LED_GEO) {
    const value = clamp01((controls.view === 'zones' ? g.x < 0.5 ? sample.cpu : sample.memory : sample[controls.metric]) / 100);
    const hot = clamp01(value / Math.max(0.1, controls.warning / 100));
    const lit = controls.view === 'bar' ? value > 0 && g.x <= value : controls.view === 'zones' ? value > 0 && 1 - g.y <= value : true;
    if (!lit) continue;
    const strength = controls.view === 'heat' ? 0.08 + value * 0.92 : 1;
    frame.set(led, low.map((c, i) => Math.round((c + (high[i] - c) * hot) * strength)) as RGB);
  }
  return frame;
}
