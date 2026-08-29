/**
 * Simon. Four fixed keys spread wide enough to be told apart at a glance; the
 * board plays a sequence, you repeat it, it gets one longer.
 */

import {
  LED_BY_NAME, type Frame, type Game, type GameDef, type RGB,
  blend, makeRng,
} from './core';

interface Pad { code: string; led: number; label: string; on: RGB; off: RGB }

// Corners of the alpha block, so the four are unmistakable on the board.
const SPEC: Array<[string, string, RGB]> = [
  ['Q', 'KeyQ', [255, 45, 45]],
  ['P', 'KeyP', [255, 200, 0]],
  ['Z', 'KeyZ', [40, 120, 255]],
  ['M', 'KeyM', [40, 230, 80]],
];

const PADS: Pad[] = SPEC.flatMap(([label, code, on]) => {
  const led = LED_BY_NAME.get(label);
  if (led === undefined) return [];
  const off: RGB = [Math.round(on[0] * 0.16), Math.round(on[1] * 0.16), Math.round(on[2] * 0.16)];
  return [{ code, led, label, on, off }];
});

const LIT = 0.42;   // seconds a pad stays lit during playback
const GAP = 0.16;

export const simon: GameDef = {
  name: 'Simon',
  controls: 'Q  P  Z  M',
  blurb: 'Watch the sequence, then repeat it.',
  create(seed) {
    const rng = makeRng(seed);
    let seq: number[] = [];
    let phase: 'watch' | 'input' | 'over' = 'watch';
    let clock = 0, cursor = 0, score = 0;
    let flashPad = -1, flashFor = 0;

    const extend = () => seq.push(Math.floor(rng() * PADS.length));

    const g: Game = {
      reset() {
        seq = []; extend();
        phase = 'watch'; clock = 0; cursor = 0; score = 0;
        flashPad = -1; flashFor = 0;
      },

      step(dt, input) {
        if (flashFor > 0) flashFor = Math.max(0, flashFor - dt);
        if (phase === 'over') return;

        if (phase === 'watch') {
          clock += dt;
          const slot = LIT + GAP;
          const i = Math.floor(clock / slot);
          if (i >= seq.length) { phase = 'input'; cursor = 0; flashPad = -1; return; }
          flashPad = clock - i * slot < LIT ? seq[i] : -1;
          return;
        }

        // phase === 'input'
        for (let i = 0; i < PADS.length; i++) {
          if (!input.pressed.has(PADS[i].code)) continue;
          flashPad = i; flashFor = 0.18;
          if (i === seq[cursor]) {
            cursor++;
            if (cursor >= seq.length) {
              score = seq.length;
              extend();
              phase = 'watch'; clock = 0;
            }
          } else {
            phase = 'over';
          }
          break;
        }
      },

      render() {
        const f: Frame = new Map();
        if (phase === 'over') {
          for (const p of PADS) blend(f, p.led, [110, 14, 14]);
          return f;
        }
        for (let i = 0; i < PADS.length; i++) {
          const p = PADS[i];
          const lit = (phase === 'watch' && flashPad === i) || (flashFor > 0 && flashPad === i);
          blend(f, p.led, lit ? p.on : p.off);
        }
        return f;
      },

      view: () => ({
        score,
        status: phase === 'over'
          ? `Wrong — reached ${score}`
          : phase === 'watch' ? `Watch… (${seq.length})` : `Repeat ${cursor}/${seq.length}`,
        state: phase === 'over' ? 'over' : 'playing',
      }),
    };
    g.reset();
    return g;
  },
};
