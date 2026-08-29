/**
 * Dodger. A scattered field rather than walls-with-gaps, so it reads as
 * weaving rather than threading — and movement is a discrete row step, which
 * keeps it distinct from Flappy's momentum.
 */

import {
  BOARD_H, BOARD_W, type Frame, type Game, type GameDef,
  DOWN, UP, anyPressed, makeRng, splat,
} from './core';

const SHIP_X = 1.6;
const BASE_SPEED = 6;
const MAX_SPEED = 15;
const BASE_RATE = 2.2;   // spawns per second
const HIT_X = 0.75;

interface Rock { x: number; row: number; passed: boolean }

export const dodger: GameDef = {
  name: 'Dodger',
  controls: '↑ / ↓  or  W / S',
  blurb: 'Weave the field. It never stops getting faster.',
  create(seed) {
    const rng = makeRng(seed);
    let row = Math.floor(BOARD_H / 2);
    let rocks: Rock[] = [];
    let score = 0, dead = false, elapsed = 0, spawnAcc = 0;

    const speed = () => Math.min(MAX_SPEED, BASE_SPEED + elapsed * 0.22);

    const g: Game = {
      reset() {
        row = Math.floor(BOARD_H / 2);
        rocks = [];
        score = 0; dead = false; elapsed = 0; spawnAcc = 0;
      },

      step(dt, input) {
        if (dead) return;
        elapsed += dt;

        if (anyPressed(input, UP)) row = Math.max(0, row - 1);
        if (anyPressed(input, DOWN)) row = Math.min(BOARD_H - 1, row + 1);

        spawnAcc += dt * (BASE_RATE + elapsed * 0.06);
        while (spawnAcc >= 1) {
          spawnAcc -= 1;
          const r = Math.floor(rng() * BOARD_H);
          // Never spawn a rock that is already unavoidable: leave the row
          // directly ahead clear if the two neighbours are both blocked.
          const near = rocks.filter((k) => k.x > BOARD_W - 4);
          const blocked = (rr: number) => near.some((k) => k.row === rr);
          if (blocked(r - 1) && blocked(r + 1) && r === row) continue;
          rocks.push({ x: BOARD_W + 1, row: r, passed: false });
        }

        const v = speed();
        for (const k of rocks) {
          k.x -= v * dt;
          if (!k.passed && k.x < SHIP_X - HIT_X) { k.passed = true; score++; }
          if (k.row === row && Math.abs(k.x - SHIP_X) < HIT_X) dead = true;
        }
        rocks = rocks.filter((k) => k.x > -1.5);
      },

      render() {
        const f: Frame = new Map();
        for (const k of rocks) {
          if (k.x < -1 || k.x > BOARD_W + 1) continue;
          splat(f, k.x, k.row, [200, 60, 200], 0.6, 0.28);
        }
        splat(f, SHIP_X, row, dead ? [200, 30, 30] : [80, 255, 200], 0.55, 0.3);
        return f;
      },

      view: () => ({
        score,
        status: dead
          ? `Hit — ${score} dodged`
          : `${score}   ${speed().toFixed(1)} u/s`,
        state: dead ? 'over' : 'playing',
      }),
    };
    g.reset();
    return g;
  },
};
