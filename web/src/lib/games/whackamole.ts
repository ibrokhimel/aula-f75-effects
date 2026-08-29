/**
 * Whack-a-mole. The purest use of this hardware: the thing you look at and the
 * thing you press are the same object, so there is no mapping to learn.
 */

import {
  LETTER_KEYS, type Frame, type Game, type GameDef, type PlayKey,
  blend, makeRng,
} from './core';

const START_WINDOW = 1.5;  // seconds to hit a mole
const MIN_WINDOW = 0.45;
const LIVES = 3;

export const whackAMole: GameDef = {
  name: 'Whack-a-Mole',
  controls: 'Hit the lit key',
  blurb: 'It gets faster. Three misses and you are out.',
  create(seed) {
    const rng = makeRng(seed);
    let mole: PlayKey = LETTER_KEYS[0];
    let decoy: PlayKey | null = null;
    let age = 0, window = START_WINDOW;
    let score = 0, lives = LIVES, best = 0;
    let hitFlash = 0, missFlash = 0;

    function spawn() {
      mole = LETTER_KEYS[Math.floor(rng() * LETTER_KEYS.length)];
      // Decoys start appearing once you are warmed up — they are never the
      // answer, so hitting one costs a life.
      decoy = score >= 6 && rng() < 0.5
        ? LETTER_KEYS.filter((k) => k.code !== mole.code)[
            Math.floor(rng() * (LETTER_KEYS.length - 1))]
        : null;
      age = 0;
    }

    const g: Game = {
      reset() {
        score = 0; lives = LIVES; window = START_WINDOW;
        hitFlash = missFlash = 0;
        spawn();
      },

      step(dt, input) {
        if (lives <= 0) return;
        if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - dt);
        if (missFlash > 0) missFlash = Math.max(0, missFlash - dt);

        if (input.pressed.size > 0) {
          if (input.pressed.has(mole.code)) {
            score++;
            best = Math.max(best, score);
            window = Math.max(MIN_WINDOW, START_WINDOW - score * 0.05);
            hitFlash = 0.16;
            spawn();
          } else if (decoy && input.pressed.has(decoy.code)) {
            lives--; missFlash = 0.3; spawn();
          }
          // Any other key is simply ignored: punishing stray presses on a
          // keyboard you are also resting your hands on is not fun.
        }

        age += dt;
        if (age > window) { lives--; missFlash = 0.3; spawn(); }
      },

      render() {
        const f: Frame = new Map();
        if (lives <= 0) {
          for (const k of LETTER_KEYS) blend(f, k.led, [90, 12, 12]);
          return f;
        }
        if (hitFlash > 0) {
          const v = Math.round(120 * (hitFlash / 0.16));
          for (const k of LETTER_KEYS) blend(f, k.led, [0, v, Math.round(v * 0.4)]);
        }
        if (missFlash > 0) {
          const v = Math.round(140 * (missFlash / 0.3));
          for (const k of LETTER_KEYS) blend(f, k.led, [v, 0, 0]);
        }
        if (decoy) blend(f, decoy.led, [120, 0, 160]);
        // The mole dims as its window runs out, so urgency is visible.
        const life = 1 - age / window;
        const v = Math.round(90 + 165 * Math.max(0, life));
        blend(f, mole.led, [v, Math.round(v * 0.75), 0]);
        return f;
      },

      view: () => ({
        score,
        status: lives <= 0
          ? `Game over — ${score} hit${score === 1 ? '' : 's'} (best ${best})`
          : `${score}   lives ${'●'.repeat(Math.max(0, lives))}${'○'.repeat(LIVES - Math.max(0, lives))}`,
        state: lives <= 0 ? 'over' : 'playing',
      }),
    };
    g.reset();
    return g;
  },
};
