import { describe, expect, it } from 'vitest';
import { ANIMATIONS } from '../animations';
import { EFFECT_FAMILIES, STUDIO_RENDERER_IDS, defaultsFor, filterFamilies, selectVariation } from './catalog';
import { parseLibrary, parseSettings } from './storage';
import { adjustFrame } from './frame';
import { F75_LAYOUT } from '../bridges/f75/layout';

describe('the curated studio collection', () => {
  it('does not expose two renderers with identical sampled animation frames', () => {
    const seen = new Map<string, string>();
    for (const id of STUDIO_RENDERER_IDS) {
      const signature = JSON.stringify([.13, .79, 2.37, 4.8, 8.2, 17.9].map(time => {
        const frame = ANIMATIONS[id].fn(time);
        return F75_LAYOUT.leds.map(led => frame.get(led.id) ?? [0, 0, 0]);
      }));
      expect(seen.get(signature), `${id} duplicates ${seen.get(signature)}`).toBeUndefined();
      seen.set(signature, id);
    }
  });
  it('maps every variation to one real generator without duplicate registrations', () => {
    const seen = new Set<string>();
    for (const family of EFFECT_FAMILIES) {
      expect(family.variations.length).toBeGreaterThan(0);
      for (const variation of family.variations) {
        expect(ANIMATIONS[variation.id]?.fn, variation.id).toBeTypeOf('function');
        expect(seen.has(variation.id), `${variation.id} appears as two different families`).toBe(false);
        seen.add(variation.id);
      }
    }
    expect([...seen].sort()).toEqual([...STUDIO_RENDERER_IDS].sort());
  });

  it('finds a family by a variation name without making that variation another result', () => {
    expect(filterFamilies('matrix', 'All families', false, []).map((f) => f.id)).toEqual(['rain']);
    expect(filterFamilies('nordic', 'All families', false, []).map((f) => f.id)).toEqual(['nordic']);
    expect(filterFamilies('', 'Nature', true, ['fire']).map((f) => f.id)).toEqual(['fire']);
  });
});

describe('saved browser state is untrusted input', () => {
  it('recovers from corrupt, null, and unexpected storage', () => {
    for (const raw of [null, 'broken json', 'null', 'false', '{}', '{"presets":[null,3,{}]}']) {
      expect(parseLibrary(raw)).toEqual({ favorites: [], presets: [] });
    }
  });

  it('deduplicates favorites and ignores removed family ids', () => {
    expect(parseLibrary('{"favorites":["fire","fire",null,"not-an-effect"]}').favorites).toEqual(['fire']);
  });

  it('does not restore another family’s variation or invalid channels and numeric values', () => {
    expect(parseSettings({ familyId: 'rain', variationId: 'campfire', brightness: -20, speed: Infinity, direction: 'invalid', palette: ['red'] }))
      .toEqual({ ...defaultsFor('rain'), brightness: 0 });
  });

  it('restores a complete custom preset and rejects duplicate preset ids', () => {
    const settings = { ...selectVariation(defaultsFor('rain'), 'matrixrain'), brightness: 22, palette: ['#000000', '#123456', '#abcdef', '#ffffff'] };
    const result = parseLibrary(JSON.stringify({ presets: [{ id: 'one', name: '  My rain  ', settings }, { id: 'one', name: 'Duplicate', settings }] }));
    expect(result.presets).toEqual([{ id: 'one', name: 'My rain', settings }]);
  });
});

describe('preview frame adjustments', () => {
  const led = F75_LAYOUT.leds.find((key) => key.label === 'G')!.id;

  it('zero brightness is dark, including highlights in a custom palette', () => {
    const settings = { ...defaultsFor(), brightness: 0, palette: ['#ff0000', '#00ff00', '#0000ff', '#ffffff'] };
    expect(adjustFrame(new Map([[led, [255, 255, 255]]]), settings).get(led)).toEqual([0, 0, 0]);
  });

  it('does not mutate source frames and preserves absent keys as dark', () => {
    const source = new Map([[led, [200, 100, 50] as [number, number, number]]]);
    const adjusted = adjustFrame(source, { ...defaultsFor(), brightness: 50 });
    expect(adjusted.get(led)).toEqual([100, 50, 25]);
    expect(adjusted.size).toBe(1);
    expect(source.get(led)).toEqual([200, 100, 50]);
  });

  it('preserves physical LED placement when applying global adjustments', () => {
    const ids = new Set(F75_LAYOUT.leds.map((key) => key.id));
    const source = ANIMATIONS.aurora.fn(2.7);
    const output = adjustFrame(source, { ...defaultsFor(), brightness: 100 });
    for (const [id, color] of output) {
      expect(ids.has(id)).toBe(true);
      for (const channel of color) { expect(channel).toBeGreaterThanOrEqual(0); expect(channel).toBeLessThanOrEqual(255); }
    }
    expect([...output].sort()).toEqual([...source].sort());
  });
});

describe('preset upgrades and renderer switching', () => {
  it('migrates moved variants and old speed while dropping the old mirror flag', () => {
    const settings = parseSettings({ familyId: 'aurora', variationId: 'nordic', speed: 70, direction: 'right' });
    expect(settings.familyId).toBe('nordic');
    expect(settings.parameters.rate).toBe(2);
    expect(settings).not.toHaveProperty('direction');
  });
  it('switches parameter schemas without carrying unrelated controls over', () => {
    const settings = selectVariation(defaultsFor('rain'), 'matrixrain');
    expect(settings.parameters).toHaveProperty('decay');
    expect(settings.parameters).not.toHaveProperty('drops');
    expect(parseSettings({ ...settings, parameters: { decay: -100, width: 999, rate: NaN } }).parameters).toEqual({decay: 0.15, rate: 1});
  });
});
