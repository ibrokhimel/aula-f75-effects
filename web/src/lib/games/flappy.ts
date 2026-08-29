/**
 * Flappy. Six rows is a tight shaft, so the gap is generous and gravity is
 * gentler than the original — otherwise the whole game fits in the reaction
 * time between two frames.
 */

import {
  BOARD_H, BOARD_W, type Frame, type Game, type GameDef,
  anyPressed, makeRng, splat,
} from './core';

const BIRD_X = 3.2;
const GRAVITY = 20;
const FLAP = -6.2;
const SCROLL = 5.5;
const SPACING = 7.5;
const GAP_HALF = 1.15;
const FLOOR = BOARD_H - 1;
const FLAP_KEYS = ['Space', 'ArrowUp', 'KeyW'];

interface Pipe { x: number; gap: number; passed: boolean }

export const flappy: GameDef = {
  name: 'Flappy',
  controls: 'Space / ↑ to flap',
  blurb: 'A six-row shaft. Do not touch anything.',
  create(seed) {
    const rng = makeRng(seed);
    let y = 0, vy = 0;
    let pipes: Pipe[] = [];
    let score = 0, dead = false, started = false;

    const newGap = () => 1.25 + rng() * (FLOOR - 2.5);

    const g: Game = {
      reset() {
        y = FLOOR / 2; vy = 0;
        pipes = [
          { x: BOARD_W + 2, gap: newGap(), passed: false },
          { x: BOARD_W + 2 + SPACING, gap: newGap(), passed: false },
        ];
        score = 0; dead = false; started = false;
      },

      step(dt, input) {
        if (dead) return;
        const flapped = anyPressed(input, FLAP_KEYS);
        // The bird hovers until the first flap, so the game does not start
        // running before you are looking at it.
        if (!started) {
          if (!flapped) return;
          started = true;
        }
        if (flapped) vy = FLAP;

        vy += GRAVITY * dt;
        y += vy * dt;

        for (const p of pipes) p.x -= SCROLL * dt;
        if (pipes[0].x < -1.5) {
          pipes.shift();
          pipes.push({ x: pipes[pipes.length - 1].x + SPACING, gap: newGap(), passed: false });
        }

        for (const p of pipes) {
          if (!p.passed && p.x < BIRD_X - 0.6) { p.passed = true; score++; }
          if (Math.abs(p.x - BIRD_X) > 0.85) continue;
          if (Math.abs(y - p.gap) > GAP_HALF) dead = true;
        }
        if (y < -0.2 || y > FLOOR + 0.2) dead = true;
        y = Math.max(-0.2, Math.min(FLOOR + 0.2, y));
      },

      render() {
        const f: Frame = new Map();
        for (const p of pipes) {
          if (p.x < -1 || p.x > BOARD_W + 1) continue;
          for (let r = 0; r <= FLOOR; r++) {
            if (Math.abs(r - p.gap) <= GAP_HALF) continue;
            splat(f, p.x, r, [20, 170, 40], 0.55, 0.3);
          }
        }
        splat(f, BIRD_X, y,
          dead ? [200, 30, 30] : started ? [255, 210, 0] : [140, 120, 40], 0.5, 0.28);
        return f;
      },

      view: () => ({
        score,
        status: dead ? `Crashed — ${score}` : started ? `${score}` : 'Flap to start',
        state: dead ? 'over' : 'playing',
      }),
    };
    g.reset();
    return g;
  },
};
