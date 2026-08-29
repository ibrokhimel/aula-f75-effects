/**
 * Reaction trainer. Board waits, one key lights, you hit it. Five rounds, then
 * an average.
 *
 * The delay is randomised per round specifically so the wait cannot be timed —
 * and pressing before the light is a false start, or you could just mash.
 */

import {
  LETTER_KEYS, type Frame, type Game, type GameDef, type PlayKey,
  blend, makeRng,
} from './core';

const ROUNDS = 5;
const MIN_WAIT = 1.1;
const MAX_WAIT = 3.4;
const TIMEOUT = 2.0;

export const reaction: GameDef = {
  name: 'Reaction',
  controls: 'Hit the key the instant it lights',
  blurb: 'Five rounds. Measures your reaction in milliseconds.',
  create(seed) {
    const rng = makeRng(seed);
    let phase: 'wait' | 'go' | 'done' = 'wait';
    let target: PlayKey = LETTER_KEYS[0];
    let clock = 0, waitFor = 0;
    let times: number[] = [];
    let falseStarts = 0, flash = 0, round = 0;

    function arm() {
      target = LETTER_KEYS[Math.floor(rng() * LETTER_KEYS.length)];
      waitFor = MIN_WAIT + rng() * (MAX_WAIT - MIN_WAIT);
      clock = 0;
      phase = 'wait';
    }

    const g: Game = {
      reset() {
        times = []; falseStarts = 0; flash = 0; round = 0;
        arm();
      },

      step(dt, input) {
        if (phase === 'done') return;
        if (flash > 0) flash = Math.max(0, flash - dt);
        clock += dt;

        if (phase === 'wait') {
          if (input.pressed.size > 0) { falseStarts++; flash = 0.35; arm(); return; }
          if (clock >= waitFor) { phase = 'go'; clock = 0; }
          return;
        }

        // phase === 'go'
        if (input.pressed.has(target.code)) {
          times.push(clock * 1000);
          round++;
          if (round >= ROUNDS) { phase = 'done'; return; }
          arm();
          return;
        }
        // A wrong key is not a false start — it is just slow. But letting the
        // round run forever would hide a miss, so it times out.
        if (clock > TIMEOUT) {
          times.push(TIMEOUT * 1000);
          round++;
          if (round >= ROUNDS) { phase = 'done'; return; }
          arm();
        }
      },

      render() {
        const f: Frame = new Map();
        if (flash > 0) {
          const v = Math.round(170 * (flash / 0.35));
          for (const k of LETTER_KEYS) blend(f, k.led, [v, 0, 0]);
          return f;
        }
        if (phase === 'done') {
          for (const k of LETTER_KEYS) blend(f, k.led, [0, 90, 40]);
          return f;
        }
        if (phase === 'wait') {
          for (const k of LETTER_KEYS) blend(f, k.led, [4, 6, 16]);
          return f;
        }
        blend(f, target.led, [255, 255, 255]);
        return f;
      },

      view: () => {
        const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
        const best = times.length ? Math.min(...times) : 0;
        if (phase === 'done') {
          return {
            score: Math.round(avg),
            status: `avg ${Math.round(avg)} ms · best ${Math.round(best)} ms`
              + (falseStarts ? ` · ${falseStarts} false start${falseStarts === 1 ? '' : 's'}` : ''),
            state: 'over',
          };
        }
        return {
          score: Math.round(avg),
          status: phase === 'wait'
            ? `Round ${round + 1}/${ROUNDS} — wait for it…`
            : `Round ${round + 1}/${ROUNDS} — GO (${target.label})`,
          state: 'playing',
        };
      },
    };
    g.reset();
    return g;
  },
};
