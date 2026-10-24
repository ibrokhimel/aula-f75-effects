import { ANIMATIONS, resolveAnimationParameters, type AnimationValues } from '../animations';

export interface EffectFamily {
  id: string;
  name: string;
  category: string;
  description: string;
  palette: string[];
  variations: { id: string; name: string }[];
}

// Related renderers share one tile. Different visual mechanisms stay separate.
const FEATURED_FAMILIES: EffectFamily[] = [
  {
    id: 'aurora', name: 'Aurora', category: 'Ambient',
    description: 'Soft curtains of light, drifting across the board.',
    palette: ['#51ef9a', '#22d3bd', '#31b9ed', '#5376ef'],
    variations: [{ id: 'aurora', name: 'Northern lights' }],
  },
  {
    id: 'ripple', name: 'Ripple', category: 'Waves',
    description: 'Rings of light spreading out across the keys.',
    palette: ['#70d9ee', '#41b7ee', '#4a80ed', '#8068de'],
    variations: [{ id: 'ripple', name: 'Drifting rings' }, { id: 'ripplesnap', name: 'Snap' }, { id: 'ripplepool', name: 'Ripple pool' }, { id: 'shockwave', name: 'Shockwave' }, { id: 'expandingrings', name: 'Expanding rings' }],
  },
  {
    id: 'fire', name: 'Fire', category: 'Nature',
    description: 'A warm glow with a life of its own. Settle in, or turn up the heat.',
    palette: ['#8e241b', '#e35c28', '#f8a442', '#ffe3a7'],
    variations: [{ id: 'campfire', name: 'Campfire' }, { id: 'firestorm', name: 'Fire storm' }, { id: 'volcano', name: 'Volcano' }, { id: 'fire', name: 'Classic fire' }],
  },
  {
    id: 'scanner', name: 'Scanner', category: 'Motion',
    description: 'A focused beam, moving with a steady rhythm.',
    palette: ['#e44e5d', '#f97782', '#ffb1b8', '#ffe5df'],
    variations: [{ id: 'scanner', name: 'Classic sweep' }, { id: 'gridscan', name: 'Cross scan' }, { id: 'crtscanline', name: 'Phosphor' }],
  },
  {
    id: 'rain', name: 'Rain', category: 'Particles',
    description: 'Little trails of light, falling quietly across your keyboard.',
    palette: ['#235f9a', '#2c9dc4', '#54ccdb', '#a5ecf0'],
    variations: [{ id: 'rain', name: 'Gentle rain' }, { id: 'matrixrain', name: 'Matrix' }, { id: 'raindropimpact', name: 'Raindrop impact' }, { id: 'datastream', name: 'Data stream' }],
  },
  {
    id: 'duotone', name: 'Duotone', category: 'Color',
    description: 'Two colors, slowly trading places. Simple enough to leave on all day.',
    palette: ['#fa799f', '#bd7fda', '#777fe2', '#4badeb'],
    variations: [{ id: 'duotone', name: 'Soft drift' }],
  },
];


const GROUPS = [
  ['comet', 'Comets', ['comet', 'dualcomet', 'meteorshower', 'shootingstars']],
  ['sparkle', 'Twinkle', ['sparkle', 'glitterfade', 'starlight', 'confetti']],
  ['spiral', 'Spiral', ['spiral', 'doublespiral']],
  ['snowfall', 'Snow', ['snowfall', 'blizzard']],
  ['breathing', 'Breathing', ['breathing', 'zenbreath']],
  ['rainbow', 'Spectrum', ['rainbow', 'slowgradient']],
  ['sine', 'Wave fields', ['sine', 'wave', 'monowave', 'standingwave', 'sinegrid']],
  ['metaballs', 'Liquid blobs', ['metaballs', 'lavalamp']],
  ['oilslick', 'Iridescence', ['oilslick', 'soapfilm']],
  ['flowfield', 'Currents', ['flowfield', 'curlsmoke']],
  ['hexcells', 'Cell fields', ['hexcells', 'voronoi', 'coralreef', 'icecrystals']],
  ['caustics', 'Underwater', ['caustics', 'oceandepth']],
  ['heathaze', 'Heat shimmer', ['heathaze', 'desertmirage']],
  ['snake', 'Key chase', ['snake', 'pulsechase']],
  ['orbit', 'Orbital trails', ['orbit', 'lissajous']],
  ['moire', 'Gratings', ['moire', 'rotatingbars', 'diagonalwipe']],
  ['kaleidoscope', 'Symmetry', ['kaleidoscope', 'mandala']],
  ['candle', 'Warm glow', ['candle', 'nightlight']],
  ['nordic', 'Arctic', ['nordic', 'moonlight']],
  ['forestcanopy', 'Forest', ['forestcanopy', 'meadowwind']],
  ['bioluminescence', 'Soft blooms', ['bioluminescence', 'deepspace']],
  ['vumeter', 'Scripted meters', ['vumeter', 'equalizer']],
] as const;
const CATEGORY_PALETTES: Record<string, string[]> = {
  Classic: ['#ee758f','#f8c767','#7cddcc','#8b91ed'],
  Waves: ['#4baec9','#67dfc9','#a1c9ec','#8775db'],
  Particles: ['#9c83e8','#729eee','#e68fbd','#f6e1a2'],
  Nature: ['#4b8c72','#a4c482','#d9c09b','#6c9ac3'],
  Geometric: ['#9f8dde','#c5a9e9','#76c7d3','#f3bed3'],
  Retro: ['#49c291','#66d9cf','#9283e4','#df82b2'],
  Ambient: ['#7da6bd','#a0bda9','#d1b9a0','#b89cbf'],
};
function fromGenerators(id: string, name: string, ids: readonly string[]): EffectFamily {
  const first = ANIMATIONS[ids[0]];
  const categories: Record<string, string> = { breathing: 'Ambient', rainbow: 'Color', sine: 'Waves', snake: 'Motion', sparkle: 'Particles', plasma: 'Waves', comet: 'Particles', oilslick: 'Color' };
  const category = categories[id] ?? (first.category === 'Geometric' ? 'Geometry' : first.category === 'Classic' ? 'Motion' : first.category);
  return { id, name, category, description: id === 'vumeter' ? 'Scripted levels with no audio input. Music response belongs in Audio.' : first.description, palette: CATEGORY_PALETTES[first.category], variations: ids.map(key => ({id: key, name: ANIMATIONS[key].name})) };
}
const grouped = [...FEATURED_FAMILIES, ...GROUPS.map(([id,name,ids]) => fromGenerators(id,name,ids))];
const assigned = new Set(grouped.flatMap(family => family.variations.map(variation => variation.id)));
// The separately developed expansion is still undergoing engine validation.
// Keep the approved studio collection stable until those renderers pass review.
export const STUDIO_RENDERER_IDS = Object.keys(ANIMATIONS).filter(id => !id.startsWith('expansion.'));
export const EFFECT_FAMILIES: EffectFamily[] = [
  ...grouped,
  ...STUDIO_RENDERER_IDS.filter(id => !assigned.has(id)).map(id => fromGenerators(id, ANIMATIONS[id].name, [id])),
];
export const RENDERER_COUNT = STUDIO_RENDERER_IDS.length;

export const LIGHTING_MODES = [
  { id: 'automatic', label: 'Automatic', description: 'Self-running patterns for your desk.' },
  { id: 'typing', label: 'Typing', description: 'Light that responds to every press, hold, and release.' },
  { id: 'audio', label: 'Audio', description: 'Let your keyboard follow your music and system audio.' },
  { id: 'screen', label: 'Screen', description: 'Bring the colors on your display onto your keyboard.' },
  { id: 'per-key', label: 'Per-key', description: 'Put color exactly where you want it, one key or zone at a time.' },
  { id: 'layers', label: 'Layers', description: 'Combine effects and give each one its own space and controls.' },
  { id: 'system-activity', label: 'System activity', description: 'Turn supported system telemetry into useful lighting.' },
] as const;

export type LightingMode = typeof LIGHTING_MODES[number]['id'];
export type Playback = 'playing' | 'paused' | 'stopped';

export interface StudioSettings {
  familyId: string;
  variationId: string;
  parameters: AnimationValues;
  brightness: number;
  palette: string[] | null;
}

export function familyFor(id: string): EffectFamily {
  return EFFECT_FAMILIES.find((family) => family.id === id) ?? EFFECT_FAMILIES[0];
}

export function defaultsFor(familyId = 'aurora'): StudioSettings {
  const family = familyFor(familyId);
  return { familyId: family.id, variationId: family.variations[0].id, parameters: resolveAnimationParameters(family.variations[0].id), brightness: 70, palette: null };
}

export function generatorFor(settings: StudioSettings) {
  const family = familyFor(settings.familyId);
  const id = family.variations.some((variation) => variation.id === settings.variationId)
    ? settings.variationId : family.variations[0].id;
  return (t: number) => ANIMATIONS[id].fn(t, settings.parameters);
}

export function filterFamilies(query: string, category: string, favoritesOnly: boolean, favorites: readonly string[]) {
  const q = query.trim().toLowerCase();
  return EFFECT_FAMILIES.filter((family) =>
    (category === 'All families' || family.category === category) &&
    (!favoritesOnly || favorites.includes(family.id)) &&
    (!q || [family.name, family.category, family.description, ...family.variations.map((v) => v.name)]
      .some((value) => value.toLowerCase().includes(q))),
  );
}

export function parametersFor(settings: StudioSettings) { return ANIMATIONS[settings.variationId].parameters; }
export function selectVariation(settings: StudioSettings, id: string): StudioSettings {
  if (!familyFor(settings.familyId).variations.some(variation => variation.id === id)) return settings;
  return { ...settings, variationId: id, parameters: resolveAnimationParameters(id) };
}
