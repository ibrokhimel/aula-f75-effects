/**
 * Typing trainer — the one with a use beyond the novelty. The board lights the
 * key you should hit next and a dimmer hint for the one after, so you learn
 * positions by looking at your hands instead of at a screen.
 */

import {
  LETTER_KEYS, type Frame, type Game, type GameDef,
  blend, makeRng,
} from './core';

const WORDS = [
  'the', 'and', 'for', 'you', 'that', 'with', 'have', 'this', 'from', 'they',
  'been', 'were', 'when', 'what', 'your', 'said', 'each', 'them', 'then',
  'make', 'like', 'time', 'just', 'know', 'take', 'into', 'year', 'good',
  'some', 'could', 'other', 'about', 'would', 'there', 'their', 'which',
];

const LED_FOR = new Map(LETTER_KEYS.map((k) => [k.label, k.led]));
const CODE_FOR = new Map(LETTER_KEYS.map((k) => [k.label, k.code]));

export const typing: GameDef = {
  name: 'Typing Trainer',
  controls: 'Type the lit key',
  blurb: 'Next key lit bright, the one after dim. Tracks WPM.',
  create(seed) {
    const rng = makeRng(seed);
    let target = '';
    let pos = 0;
    let typed = 0, errors = 0, elapsed = 0, started = false;
    let wrong = 0;

    const nextWord = () => {
      target = WORDS[Math.floor(rng() * WORDS.length)].toUpperCase();
      pos = 0;
    };

    const g: Game = {
      reset() {
        typed = 0; errors = 0; elapsed = 0; started = false; wrong = 0;
        nextWord();
      },

      step(dt, input) {
        if (started) elapsed += dt;
        if (wrong > 0) wrong = Math.max(0, wrong - dt);
        if (input.pressed.size === 0) return;

        const want = CODE_FOR.get(target[pos]);
        if (want === undefined) { nextWord(); return; }

        if (input.pressed.has(want)) {
          if (!started) started = true;
          typed++;
          pos++;
          if (pos >= target.length) nextWord();
          return;
        }
        // Only count a miss if it was a letter — stray modifiers and spaces
        // should not tank the accuracy score.
        for (const code of input.pressed) {
          if (/^Key[A-Z]$/.test(code)) { errors++; wrong = 0.22; break; }
        }
      },

      render() {
        const f: Frame = new Map();
        // Faint wash over the whole alphabet so the board never goes black.
        for (const k of LETTER_KEYS) blend(f, k.led, [3, 5, 10]);

        if (wrong > 0) {
          const v = Math.round(160 * (wrong / 0.22));
          for (const k of LETTER_KEYS) blend(f, k.led, [v, 0, 0]);
        }
        // The rest of the current word, dimmest first, so you can read ahead.
        for (let i = target.length - 1; i > pos; i--) {
          const k = 1 - (i - pos) / (target.length + 1);
          blend(f, LED_FOR.get(target[i]) ?? null,
            [0, Math.round(30 * k), Math.round(55 * k)]);
        }
        if (pos + 1 < target.length) {
          blend(f, LED_FOR.get(target[pos + 1]) ?? null, [0, 60, 110]);
        }
        blend(f, LED_FOR.get(target[pos]) ?? null, [255, 255, 255]);
        return f;
      },

      view: () => {
        const mins = elapsed / 60;
        const wpm = mins > 0.02 ? Math.round((typed / 5) / mins) : 0;
        const acc = typed + errors > 0 ? Math.round((typed / (typed + errors)) * 100) : 100;
        return {
          score: wpm,
          status: started
            ? `${target.slice(pos) || '—'}   ${wpm} wpm   ${acc}% acc`
            : `Type: ${target}`,
          state: 'playing',
        };
      },
    };
    g.reset();
    return g;
  },
};
