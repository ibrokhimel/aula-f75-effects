/**
 * Memory pairs. Six colours hidden under twelve keys laid out as a 6x2 block
 * on the alpha rows — you press a key to turn it over, which is as direct as
 * this hardware gets.
 */

import {
  LED_BY_NAME, type Frame, type Game, type GameDef, type RGB,
  blend, makeRng,
} from './core';

const LAYOUT = ['Q', 'W', 'E', 'R', 'T', 'Y', 'A', 'S', 'D', 'F', 'G', 'H'];

const COLOURS: RGB[] = [
  [255, 40, 40], [255, 160, 0], [255, 240, 60],
  [40, 230, 90], [50, 140, 255], [200, 60, 255],
];

const FACE_DOWN: RGB = [10, 12, 22];
const HIDE_DELAY = 0.75;

interface Card { code: string; led: number; colour: number; up: boolean; done: boolean }

export const memory: GameDef = {
  name: 'Memory',
  controls: 'Q W E R T Y / A S D F G H',
  blurb: 'Six pairs under twelve keys. Fewest moves wins.',
  create(seed) {
    const rng = makeRng(seed);
    let cards: Card[] = [];
    let first = -1, second = -1;
    let hideIn = 0, moves = 0, found = 0;

    const g: Game = {
      reset() {
        const deck = [...COLOURS.keys(), ...COLOURS.keys()];
        // Fisher-Yates, seeded, so a run is reproducible for tests.
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        cards = LAYOUT.flatMap((label, i) => {
          const led = LED_BY_NAME.get(label);
          return led === undefined
            ? []
            : [{ code: `Key${label}`, led, colour: deck[i], up: false, done: false }];
        });
        first = second = -1;
        hideIn = 0; moves = 0; found = 0;
      },

      step(dt, input) {
        if (found >= COLOURS.length) return;

        // A mismatched pair stays visible briefly, then turns back over.
        if (hideIn > 0) {
          hideIn -= dt;
          if (hideIn <= 0) {
            if (first >= 0) cards[first].up = false;
            if (second >= 0) cards[second].up = false;
            first = second = -1;
          }
          return; // input is ignored while the pair is on show
        }

        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (!input.pressed.has(c.code) || c.done || c.up) continue;
          c.up = true;
          if (first < 0) { first = i; break; }
          second = i;
          moves++;
          if (cards[first].colour === c.colour) {
            cards[first].done = true; c.done = true;
            found++;
            first = second = -1;
          } else {
            hideIn = HIDE_DELAY;
          }
          break;
        }
      },

      render() {
        const f: Frame = new Map();
        for (const c of cards) {
          if (c.done) {
            // Matched pairs stay lit but dimmed, so the board reads as solved.
            const col = COLOURS[c.colour];
            blend(f, c.led, [Math.round(col[0] * 0.5), Math.round(col[1] * 0.5), Math.round(col[2] * 0.5)]);
          } else if (c.up) {
            blend(f, c.led, COLOURS[c.colour]);
          } else {
            blend(f, c.led, FACE_DOWN);
          }
        }
        return f;
      },

      view: () => ({
        score: found,
        status: found >= COLOURS.length
          ? `Solved in ${moves} moves`
          : `${found}/${COLOURS.length} pairs   ${moves} moves`,
        state: found >= COLOURS.length ? 'over' : 'playing',
      }),
    };
    g.reset();
    return g;
  },
};
