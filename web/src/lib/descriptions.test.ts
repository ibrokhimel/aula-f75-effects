import { describe, expect, it } from 'vitest';
import { ANIMATIONS } from './animations';
import { REACTIVE } from './reactive';
import { GAMES } from './games';

/**
 * The registries are what the pickers render, and with 300+ effects the name
 * alone does not tell you what you are about to turn on. `description` is
 * required by the types, so these tests police quality rather than presence:
 * length, style, and that it says something the name does not.
 */

const REGISTRIES: Array<[string, Record<string, { name: string; description: string }>]> = [
  ['animations', ANIMATIONS],
  ['reactive', REACTIVE],
];

describe.each(REGISTRIES)('%s descriptions', (label, registry) => {
  const entries = Object.entries(registry);

  it('has one for every effect', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, e] of entries) {
      expect(e.description, `${label}.${key} has no description`).toBeTruthy();
      expect(e.description.trim(), `${label}.${key}`).toBe(e.description);
    }
  });

  it('keeps them to a readable single line', () => {
    for (const [key, e] of entries) {
      expect(e.description.length, `${label}.${key} is too short: "${e.description}"`)
        .toBeGreaterThanOrEqual(12);
      expect(e.description.length, `${label}.${key} is too long: "${e.description}"`)
        .toBeLessThanOrEqual(110);
      expect(e.description, `${label}.${key} spans lines`).not.toContain('\n');
    }
  });

  it('does not end with a full stop, so the picker reads consistently', () => {
    for (const [key, e] of entries) {
      expect(e.description.endsWith('.'), `${label}.${key} ends with a period`).toBe(false);
    }
  });

  it('says something the name does not already say', () => {
    for (const [key, e] of entries) {
      const d = e.description.toLowerCase();
      const n = e.name.toLowerCase();
      expect(d, `${label}.${key} just restates its name`).not.toBe(n);
      expect(d.startsWith(`${n} is`), `${label}.${key} restates its name`).toBe(false);
    }
  });

  it('reads as behaviour, not implementation', () => {
    // Terms that mean nothing to someone choosing an effect. Caught a batch of
    // descriptions lifted verbatim from source comments.
    const JARGON = /\bworley\b|\bfbm\b|hypot|chebyshev|iso-surface|scalar field|xorshift|\bBFS\b|breadth-first|domain-warp|log-stripes|separable|clamp01|\bseq\b|windowFor|isHeld/i;
    for (const [key, e] of entries) {
      expect(JARGON.test(e.description), `${label}.${key} is implementation-speak: "${e.description}"`)
        .toBe(false);
    }
  });

  it('does not reuse the same description for two effects', () => {
    const seen = new Map<string, string>();
    for (const [key, e] of entries) {
      const prev = seen.get(e.description);
      expect(prev, `${label}.${key} shares its description with ${prev}`).toBeUndefined();
      seen.set(e.description, key);
    }
  });
});

describe('games', () => {
  it('every game has a blurb and controls', () => {
    for (const [key, g] of Object.entries(GAMES)) {
      expect(g.blurb, `${key} has no blurb`).toBeTruthy();
      expect(g.controls, `${key} has no controls`).toBeTruthy();
      expect(g.blurb.length).toBeLessThanOrEqual(110);
    }
  });
});
