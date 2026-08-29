/**
 * Frogger. The best structural fit on this board: six physical rows are
 * literally six lanes, so nothing has to be squeezed.
 *
 * Row 5 is the kerb, rows 1-4 carry traffic, row 0 is home.
 */

import {
  BOARD_H, BOARD_W, type Frame, type Game, type GameDef,
  DOWN, LEFT, RIGHT, UP, anyPressed, makeRng, splat,
} from './core';

interface Lane { row: number; dir: 1 | -1; speed: number; spacing: number }

const LANES: Lane[] = [
  { row: 1, dir: 1, speed: 4.2, spacing: 5.5 },
  { row: 2, dir: -1, speed: 6.0, spacing: 6.5 },
  { row: 3, dir: 1, speed: 3.4, spacing: 4.5 },
  { row: 4, dir: -1, speed: 5.2, spacing: 6.0 },
];

const HOME = 0;
const KERB = BOARD_H - 1;
const SPAN = BOARD_W + 4;          // cars enter and leave off-board
const STEP_X = 1.3;                // horizontal hop, key units
const HIT = 0.85;                  // collision half-width
const LIVES = 3;

const mod = (a: number, n: number) => ((a % n) + n) % n;

export const frogger: GameDef = {
  name: 'Frogger',
  controls: 'Arrows or WASD',
  blurb: 'Six rows, six lanes. Cross without being flattened.',
  create(seed) {
    const rng = makeRng(seed);
    const phase = LANES.map(() => rng() * SPAN);
    let fx = BOARD_W / 2, row = KERB;
    let lives = LIVES, score = 0, elapsed = 0;
    let hurt = 0, home = 0, rate = 1;

    const carsIn = (i: number) => {
      const l = LANES[i];
      const out: number[] = [];
      const n = Math.ceil(SPAN / l.spacing);
      for (let k = 0; k < n; k++) {
        out.push(mod(phase[i] + l.dir * elapsed * l.speed * rate + k * l.spacing, SPAN) - 2);
      }
      return out;
    };

    const respawn = () => { fx = BOARD_W / 2; row = KERB; };

    const g: Game = {
      reset() {
        fx = BOARD_W / 2; row = KERB;
        lives = LIVES; score = 0; elapsed = 0; hurt = 0; home = 0; rate = 1;
      },

      step(dt, input) {
        if (lives <= 0) return;
        elapsed += dt;
        if (hurt > 0) hurt = Math.max(0, hurt - dt);
        if (home > 0) home = Math.max(0, home - dt);

        if (anyPressed(input, UP)) row = Math.max(HOME, row - 1);
        if (anyPressed(input, DOWN)) row = Math.min(KERB, row + 1);
        if (anyPressed(input, LEFT)) fx = Math.max(0.5, fx - STEP_X);
        if (anyPressed(input, RIGHT)) fx = Math.min(BOARD_W - 0.5, fx + STEP_X);

        if (row === HOME) {
          score++;
          home = 0.5;
          rate = 1 + score * 0.12; // traffic speeds up each crossing
          respawn();
          return;
        }

        const lane = LANES.findIndex((l) => l.row === row);
        if (lane >= 0 && hurt === 0) {
          for (const cx of carsIn(lane)) {
            if (Math.abs(cx - fx) < HIT) { lives--; hurt = 0.6; respawn(); break; }
          }
        }
      },

      render() {
        const f: Frame = new Map();
        // Kerb and home line, dim, so the destination is always legible.
        for (let x = 0; x < BOARD_W; x += 1.1) {
          splat(f, x, KERB, [0, 34, 12], 0.5, 0.3);
          splat(f, x, HOME, home > 0 ? [0, 180, 60] : [0, 60, 24], 0.5, 0.3);
        }
        LANES.forEach((l, i) => {
          for (const cx of carsIn(i)) {
            if (cx < -1.5 || cx > BOARD_W + 1.5) continue;
            splat(f, cx, l.row, l.dir > 0 ? [255, 70, 0] : [255, 0, 90], 1.0, 0.3);
          }
        });
        if (lives > 0) {
          const c: [number, number, number] = hurt > 0
            ? [255, Math.round(60 * (1 - hurt)), 0]
            : [60, 255, 90];
          splat(f, fx, row, c, 0.55, 0.3);
        } else {
          splat(f, fx, row, [140, 20, 20], 0.7, 0.35);
        }
        return f;
      },

      view: () => ({
        score,
        status: lives <= 0
          ? `Flattened — ${score} crossing${score === 1 ? '' : 's'}`
          : `${score} across   lives ${'●'.repeat(Math.max(0, lives))}${'○'.repeat(LIVES - Math.max(0, lives))}`,
        state: lives <= 0 ? 'over' : 'playing',
      }),
    };
    g.reset();
    return g;
  },
};
