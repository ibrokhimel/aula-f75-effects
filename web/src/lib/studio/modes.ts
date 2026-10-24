import { ANIMATIONS, resolveAnimationParameters, type AnimationValues } from '../animations';
import {
  AUDIO_PARAMETERS, normalizeControls, resolveReactiveParameters, sanitizeKeyColors, zoneKeys,
  type ActivityControls, type AudioStyle, type KeyColors, type LightingLayer, type ScreenControls,
} from '../../../../packages/engine/src';
import { F75_LAYOUT } from '../bridges/f75/layout';
import { STUDIO_RENDERER_IDS } from './catalog';

export const TYPING_FAMILIES = [
  { id: 'glow', name: 'Key glow', description: 'Light under your fingers. Choose a release fade, a cooling flash, or a soft pulse.', variants: ['fade', 'whitehot', 'pulse'] },
  { id: 'ripples', name: 'Ripples', description: 'A wave starts exactly where you press. Geometry and timing belong to each version.', variants: ['ripple', 'rippletriple', 'ripplesquare'] },
  { id: 'rows', name: 'Rows & columns', description: 'Send light along the pressed row, column, or both.', variants: ['rowflash', 'colflash', 'crossflash'] },
  { id: 'charge', name: 'Hold & release', description: 'Hold a key to build light. Release it to send that energy outward.', variants: ['chargeburst', 'growring'] },
  { id: 'sparks', name: 'Sparks', description: 'A short burst of little lights around every press.', variants: ['sparkleburst'] },
  { id: 'heat', name: 'Heat map', description: 'Busy keys warm up. Quiet keys cool back down.', variants: ['heatmap'] },
  { id: 'links', name: 'Linked keys', description: 'Draw a path between the keys you press in order.', variants: ['link'] },
  { id: 'trail', name: 'Typing trail', description: 'Your last few keystrokes become a fading ribbon of color.', variants: ['trail'] },
] as const;
export const AUDIO_STYLES: { id: AudioStyle; name: string; description: string }[] = [
  { id: 'spectrum', name: 'Spectrum', description: 'Frequency bands rise from the bottom row.' },
  { id: 'pulse', name: 'Bass pulse', description: 'Low frequencies push a warm glow out from the center.' },
  { id: 'waveform', name: 'Waveform', description: 'A fine line traces the incoming audio waveform.' },
  { id: 'zones', name: 'Band zones', description: 'Bass, mids, and treble each get their own space.' },
];
export interface ModeSettings {
  typing: { family: string; effect: string; parameters: AnimationValues; color: string | null; brightness: number };
  audio: { style: AudioStyle; parameters: AnimationValues; gain: number; floor: number; smoothing: number; source: 'sample' | 'system' | 'microphone'; brightness: number };
  screen: ScreenControls & { scene: 'coast' | 'ember' | 'neon'; brightness: number };
  perKey: { colors: KeyColors; brightness: number };
  layers: { items: LightingLayer[]; brightness: number };
  activity: ActivityControls & { source: 'computer' | 'sample'; sampleCPU: number; sampleMemory: number; brightness: number };
}
export const MODE_STORAGE_KEY = 'aula-f75.studio.modes.v1';
const initialColors = Object.fromEntries(F75_LAYOUT.leds.map(led => [led.id, zoneKeys(F75_LAYOUT, 'wasd').includes(led.id) || zoneKeys(F75_LAYOUT, 'arrows').includes(led.id) ? '#c8ee92' : '#1c3e50']));
export function defaultModes(): ModeSettings {
  return {
    typing: { family: 'ripples', effect: 'ripple', parameters: resolveReactiveParameters('ripple'), color: null, brightness: 85 },
    audio: { style: 'spectrum', parameters: normalizeControls(AUDIO_PARAMETERS.spectrum), gain: 1.5, floor: 0.02, smoothing: 0.55, source: 'sample', brightness: 85 },
    screen: { mapping: 'spatial', crop: 'full', scene: 'coast', saturation: 1, exposure: 1, brightness: 85 },
    perKey: { colors: { ...initialColors }, brightness: 85 },
    layers: { brightness: 80, items: [
      { id: 'comet-top', name: 'Comet trail', enabled: true, effect: 'comet', parameters: resolveAnimationParameters('comet'), opacity: 0.8, blend: 'add', zone: 'all' },
      { id: 'warm-keys', name: 'Warm accents', enabled: true, effect: 'fire', parameters: resolveAnimationParameters('fire'), opacity: 0.65, blend: 'screen', zone: 'wasd' },
      { id: 'aurora-base', name: 'Aurora base', enabled: true, effect: 'aurora', parameters: resolveAnimationParameters('aurora'), opacity: 1, blend: 'normal', zone: 'all' },
    ] },
    activity: { metric: 'cpu', view: 'zones', warning: 80, low: '#88dfb4', high: '#f37666', source: 'computer', sampleCPU: 42, sampleMemory: 61, brightness: 85 },
  };
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function number(value: unknown, fallback: number, min: number, max: number) { return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback; }
function choice<T extends string>(value: unknown, options: readonly T[], fallback: T): T { return options.includes(value as T) ? value as T : fallback; }
const hex = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
export function parseModes(text: string | null): ModeSettings {
  const defaults = defaultModes();
  if (!text) return defaults;
  try {
    const root = record(JSON.parse(text));
    const t = record(root.typing), a = record(root.audio), s = record(root.screen), k = record(root.perKey), l = record(root.layers), y = record(root.activity);
    const family = TYPING_FAMILIES.find(f => f.id === t.family) ?? TYPING_FAMILIES[1];
    const effect = (family.variants as readonly string[]).includes(t.effect as string) ? t.effect as string : family.variants[0];
    const style = choice(a.style, AUDIO_STYLES.map(item => item.id), 'spectrum');
    const items: LightingLayer[] = [], seen = new Set<string>();
    if (Array.isArray(l.items)) for (const raw of l.items.slice(0, 12)) {
      const layer = record(raw);
      if (typeof layer.id !== 'string' || !layer.id || seen.has(layer.id) || typeof layer.effect !== 'string' || !STUDIO_RENDERER_IDS.includes(layer.effect)) continue;
      seen.add(layer.id);
      items.push({ id: layer.id.slice(0, 80), name: typeof layer.name === 'string' ? layer.name.slice(0, 40) : ANIMATIONS[layer.effect].name, effect: layer.effect, parameters: resolveAnimationParameters(layer.effect, record(layer.parameters) as AnimationValues), enabled: layer.enabled !== false, opacity: number(layer.opacity, 1, 0, 1), blend: choice(layer.blend, ['normal', 'add', 'screen', 'multiply'], 'normal'), zone: choice(layer.zone, ['all', 'wasd', 'arrows', 'letters', 'function'], 'all') });
    }
    return {
      typing: { family: family.id, effect, parameters: resolveReactiveParameters(effect, record(t.parameters) as AnimationValues), color: t.color === null ? null : typeof t.color === 'string' && /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : null, brightness: number(t.brightness, 85, 0, 100) },
      audio: { style, parameters: normalizeControls(AUDIO_PARAMETERS[style], record(a.parameters) as AnimationValues), gain: number(a.gain, 1.5, 0.2, 4), floor: number(a.floor, 0.02, 0, 0.3), smoothing: number(a.smoothing, 0.55, 0, 0.95), source: choice(a.source, ['sample', 'system', 'microphone'], 'sample'), brightness: number(a.brightness, 85, 0, 100) },
      screen: { mapping: choice(s.mapping, ['spatial', 'average', 'edges'], 'spatial'), crop: choice(s.crop, ['full', 'center', 'top', 'bottom'], 'full'), scene: choice(s.scene, ['coast', 'ember', 'neon'], 'coast'), saturation: number(s.saturation, 1, 0, 2), exposure: number(s.exposure, 1, 0.2, 2), brightness: number(s.brightness, 85, 0, 100) },
      perKey: { colors: Object.hasOwn(k, 'colors') ? sanitizeKeyColors(F75_LAYOUT, k.colors) : defaults.perKey.colors, brightness: number(k.brightness, 85, 0, 100) },
      layers: { items: Array.isArray(l.items) ? items : defaults.layers.items, brightness: number(l.brightness, 80, 0, 100) },
      activity: { metric: choice(y.metric, ['cpu', 'memory'], 'cpu'), view: choice(y.view, ['bar', 'heat', 'zones'], 'zones'), warning: number(y.warning, 80, 10, 100), low: hex(y.low, '#88dfb4'), high: hex(y.high, '#f37666'), source: choice(y.source, ['computer', 'sample'], 'computer'), sampleCPU: number(y.sampleCPU, 42, 0, 100), sampleMemory: number(y.sampleMemory, 61, 0, 100), brightness: number(y.brightness, 85, 0, 100) },
    };
  } catch { return defaults; }
}
