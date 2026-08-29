import { describe, expect, it } from 'vitest';
import {
  REACTIVE, LED_BY_NAME, LED_FOR_CODE, LED_GEO, WINDOW, MEMORY_WINDOW,
  MOD_ALT, MOD_CTRL, MOD_SHIFT, ZONES, ZONE_NAMES, ZONE_OF,
  classOfCode, makePress, windowFor, type Press,
} from './index';
import { ALL_LEDS } from '../animations';

const VALID = new Set(ALL_LEDS);
const entries = Object.entries(REACTIVE);

/** Total light emitted across a set of sample times — the energy of a run. */
function energy(fn: (t: number, p: Press[]) => Map<number, [number, number, number]>,
                presses: Press[], times: number[]) {
  let sum = 0;
  for (const t of times) {
    for (const rgb of fn(t, presses).values()) sum += rgb[0] + rgb[1] + rgb[2];
  }
  return sum;
}

// ── The new families ────────────────────────────────────────────────────
// Each of these categories claims something specific about what it reacts
// to. A category that does not behave that way is worse than no category
// at all, so every one gets a test for its defining property.

const VALID_LEDS = [...VALID];
const byName = (n: string) => LED_BY_NAME.get(n)!;
const of = (cat: string) => entries.filter(([, e]) => e.category === cat);
type Def = (typeof entries)[number][1];

/**
 * A single number standing for how an effect renders a run. Position is
 * folded in alongside colour, so two frames of equal total brightness but
 * different shape do not collide.
 */
function fingerprint(def: Def, presses: Press[], times: number[]) {
  let h = 0;
  for (const t of times) {
    for (const [led, rgb] of def.fn(t, presses)) {
      h += (led + 1) * (rgb[0] + rgb[1] * 2 + rgb[2] * 3);
    }
  }
  return h;
}

/** A run of taps on the given LEDs, one every `gap` seconds. */
function run(leds: number[], gap: number, hold = 0.05, code?: string): Press[] {
  return leds.map((led, i) => {
    const p = makePress(led, i * gap, i, code);
    p.release = i * gap + hold;
    return p;
  });
}

describe('zone tables', () => {
  it('partitions the whole board — every LED belongs to exactly one zone', () => {
    for (const led of ALL_LEDS) {
      expect(ZONE_OF.get(led), `LED ${led} is in no zone`).toBeDefined();
    }
    // Precedence must actually resolve the overlaps rather than leaving a
    // key claimed twice: WASD cuts across both the top and the home rows.
    for (const led of ZONES.wasd) expect(ZONE_OF.get(led)).toBe('wasd');
    expect(ZONE_OF.get(byName('E'))).toBe('top');
    expect(ZONE_OF.get(byName('F'))).toBe('home');
  });

  it('every zone owns at least one key', () => {
    for (const z of ZONE_NAMES) {
      const owned = ALL_LEDS.filter((l) => ZONE_OF.get(l) === z);
      expect(owned.length, `zone ${z} owns nothing`).toBeGreaterThan(0);
    }
  });
});

describe('key classes', () => {
  it('sorts the keys that Semantic effects branch on', () => {
    expect(classOfCode('KeyA')).toBe('letter');
    expect(classOfCode('Digit7')).toBe('digit');
    expect(classOfCode('Comma')).toBe('punct');
    expect(classOfCode('ArrowUp')).toBe('nav');
    expect(classOfCode('Enter')).toBe('enter');
    expect(classOfCode('Backspace')).toBe('back');
    expect(classOfCode('Space')).toBe('space');
    expect(classOfCode('ShiftLeft')).toBe('mod');
    expect(classOfCode('F5')).toBe('fn');
  });

  it('gives a press its class even when built without a code', () => {
    // Synthetic presses carry no KeyboardEvent.code, and Semantic effects
    // must still be able to tell what they are looking at.
    const p = makePress(LED_FOR_CODE.get('KeyA')!, 0, 0);
    expect(classOfCode(p.code)).toBe('letter');
  });
});

describe('sequence effects', () => {
  const SEQ = of('Sequence');
  const TIMES = [0.35, 0.6, 1.1];
  const leds = [VALID_LEDS[5], VALID_LEDS[22], VALID_LEDS[47]];

  it('there are sequence effects registered at all', () => {
    expect(SEQ.length).toBeGreaterThanOrEqual(8);
  });

  it.each(SEQ)('%s renders the same keys differently in a different order', (id, def) => {
    // Identical keys, identical timings — only the order changes.
    const forward = run(leds, 0.15);
    const shuffled = run([leds[2], leds[0], leds[1]], 0.15);
    expect(fingerprint(def, forward, TIMES), `${id} ignores order`)
      .not.toBe(fingerprint(def, shuffled, TIMES));
  });
});

describe('rhythm effects', () => {
  const RHY = of('Rhythm');
  const TIMES = [0.5, 1.0, 1.9];
  const leds = [VALID_LEDS[3], VALID_LEDS[17], VALID_LEDS[31], VALID_LEDS[52]];

  it('there are rhythm effects registered at all', () => {
    expect(RHY.length).toBeGreaterThanOrEqual(8);
  });

  it.each(RHY)('%s renders the same keys differently at a different cadence', (id, def) => {
    // Same keys in the same order; only the gaps between them change.
    expect(fingerprint(def, run(leds, 0.1), TIMES), `${id} ignores cadence`)
      .not.toBe(fingerprint(def, run(leds, 0.45), TIMES));
  });
});

describe('gesture effects', () => {
  const GES = of('Gesture');
  const TIMES = [0.3, 0.7, 1.2];
  // Four keys ordered left to right, so the run really is a movement.
  const path = [...LED_GEO.entries()]
    .sort((a, b) => a[1].ux - b[1].ux)
    .filter((_, i) => i % 20 === 0)
    .slice(0, 4)
    .map(([led]) => led);

  it('there are gesture effects registered at all', () => {
    expect(GES.length).toBeGreaterThanOrEqual(8);
  });

  it.each(GES)('%s tells a left-to-right sweep from a right-to-left one', (id, def) => {
    expect(fingerprint(def, run(path, 0.12), TIMES), `${id} ignores direction`)
      .not.toBe(fingerprint(def, run([...path].reverse(), 0.12), TIMES));
  });
});

describe('release effects', () => {
  const REL = of('Release');
  const SAMPLES = [0.45, 0.6, 0.9];
  const led = VALID_LEDS[10];

  it('there are release effects registered at all', () => {
    expect(REL.length).toBeGreaterThanOrEqual(8);
  });

  it.each(REL)('%s answers the key-up, not the key-down', (id, def) => {
    // The family's whole point: a key still under the finger is the quiet
    // state, and letting go is the event.
    const stillDown = makePress(led, 0, 0);
    const letGo = makePress(led, 0, 0);
    letGo.release = 0.4;
    const held = energy(def.fn, [stillDown], SAMPLES);
    const up = energy(def.fn, [letGo], SAMPLES);
    expect(up, `${id}: released ${up} vs held ${held}`).toBeGreaterThan(held);
  });

  it.each(REL)('%s scales the answer by how long the key was down', (id, def) => {
    const tap = makePress(led, 0, 0); tap.release = 0.05;
    const long = makePress(led, 0, 0); long.release = 1.2;
    // Sampled from just after each release, so both are measured at the
    // same point in their own release rather than at the same clock time.
    const tapE = energy(def.fn, [tap], [0.1, 0.25, 0.55]);
    const longE = energy(def.fn, [long], [1.25, 1.4, 1.7]);
    expect(longE, `${id}: long hold ${longE} vs tap ${tapE}`).not.toBe(tapE);
  });
});

describe('semantic effects', () => {
  const SEM = of('Semantic');
  const TIMES = [0.1, 0.5, 1.2];
  // One LED, many meanings: the key stays put so that its class is the
  // only thing varying between these renders.
  const led = LED_FOR_CODE.get('KeyA')!;
  const CODES = ['KeyA', 'Digit5', 'Comma', 'ArrowUp', 'Enter', 'Backspace', 'Space'];

  it('there are semantic effects registered at all', () => {
    expect(SEM.length).toBeGreaterThanOrEqual(8);
  });

  it.each(SEM)('%s treats different classes of key differently', (id, def) => {
    const prints = new Set(
      CODES.map((code) => fingerprint(def, [makePress(led, 0, 0, code)], TIMES)),
    );
    expect(prints.size, `${id} renders every key class identically`).toBeGreaterThan(1);
  });
});

describe('zone effects', () => {
  const ZON = of('Zones');
  const TIMES = [0.15, 0.6, 1.4];
  const SPOTS = ['W', 'J', '↑', '7'].map(byName);

  it('there are zone effects registered at all', () => {
    expect(ZON.length).toBeGreaterThanOrEqual(8);
  });

  it.each(ZON)('%s distinguishes the regions of the board', (id, def) => {
    const prints = new Set(
      SPOTS.map((l) => fingerprint(def, [makePress(l, 0, 0)], TIMES)),
    );
    expect(prints.size, `${id} cannot tell the regions apart`).toBe(SPOTS.length);
  });

  it.each(ZON)('%s answers regionally, not just on the keys struck', (id, def) => {
    // A zone effect that only ever lights the pressed keys is a Point
    // effect wearing the wrong label. Two presses, in two zones, because
    // some of these are about the crossing rather than the landing.
    const a = makePress(byName('W'), 0, 0);
    const b = makePress(byName('↑'), 0.2, 1);
    const struck = new Set([a.led, b.led]);
    let elsewhere = 0;
    for (const t of TIMES) {
      for (const [led, rgb] of def.fn(t, [a, b])) {
        if (!struck.has(led) && rgb[0] + rgb[1] + rgb[2] > 24) elsewhere++;
      }
    }
    expect(elsewhere, `${id} never lit anything beyond the pressed keys`)
      .toBeGreaterThan(0);
  });
});

describe('modifier effects', () => {
  const MOD = of('Modifiers');
  const TIMES = [0.1, 0.4, 1.0];
  const led = LED_FOR_CODE.get('KeyA')!;
  // Held rather than tapped: the effects that gate on a modifier being
  // *down* need it still down when the frame is rendered.
  const withMods = (mods: number) => [makePress(led, 0, 0, 'KeyA', mods)];

  it('there are modifier effects registered at all', () => {
    expect(MOD.length).toBeGreaterThanOrEqual(8);
  });

  it.each(MOD)('%s renders the same key differently under a modifier', (id, def) => {
    const plain = fingerprint(def, withMods(0), TIMES);
    const modded = [MOD_SHIFT, MOD_CTRL, MOD_ALT]
      .map((m) => fingerprint(def, withMods(m), TIMES));
    expect(modded.some((p) => p !== plain), `${id} ignores every modifier`).toBe(true);
  });
});

describe('memory effects', () => {
  const MEM = of('Memory');

  it('there are memory effects registered at all', () => {
    expect(MEM.length).toBeGreaterThanOrEqual(8);
  });

  it.each(MEM)('%s asks the panel for the long history', (id, def) => {
    // Without this the panel evicts at WINDOW and the effect never sees
    // the history it is built on.
    expect(windowFor(def), `${id} would only ever see ${WINDOW}s`).toBe(MEMORY_WINDOW);
  });

  it.each(MEM)('%s builds on history a six-second window could not hold', (id, def) => {
    const led = VALID_LEDS[12];
    const lone = [makePress(led, 44, 0)];
    lone[0].release = 44.05;
    // Forty-odd seconds of typing on one key, against a single press at
    // the same instant. Only an effect with a real memory tells them apart.
    const long = run(new Array(40).fill(led), 1.1);
    const TIMES = [45, 46, 48];
    expect(fingerprint(def, long, TIMES), `${id} has no longer-lived state`)
      .not.toBe(fingerprint(def, lone, TIMES));
  });
});

describe('intensity effects', () => {
  const INT = of('Intensity');
  const TIMES = [1.0, 1.4, 2.0];
  const leds = VALID_LEDS.slice(0, 8);

  it('there are intensity effects registered at all', () => {
    expect(INT.length).toBeGreaterThanOrEqual(8);
  });

  it.each(INT)('%s reads a fast run differently from a slow one', (id, def) => {
    expect(fingerprint(def, run(leds, 0.07), TIMES), `${id} ignores typing speed`)
      .not.toBe(fingerprint(def, run(leds, 0.5), TIMES));
  });
});

describe('idle effects', () => {
  const IDLE = of('Idle');
  const led = VALID_LEDS[20];

  it('there are idle effects registered at all', () => {
    expect(IDLE.length).toBeGreaterThanOrEqual(8);
  });

  it.each(IDLE)('%s keeps changing while nothing is pressed', (id, def) => {
    const p = makePress(led, 0, 0);
    p.release = 0.05;
    // Fresh, settling, and long gone: an Idle effect has something to say
    // at each of those, and it is not the same thing each time.
    const prints = new Set([[0.1], [2.5], [8]].map((ts) => fingerprint(def, [p], ts)));
    expect(prints.size, `${id} does not react to the pause`).toBe(3);
  });
});
