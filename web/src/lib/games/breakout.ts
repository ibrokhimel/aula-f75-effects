/**
 * Breakout. Continuous ball physics over the full board width; bricks occupy
 * the top two rows and the paddle runs along the bottom one.
 */

import {
  BOARD_H, BOARD_W, type Frame, type Game, type GameDef,
  LEFT, RIGHT, anyHeld, makeRng, splat,
} from './core';

const PADDLE_ROW = BOARD_H - 1;
const HALF_W = 1.1;            // paddle half-width, key units
const PADDLE_SPEED = 12;
const BRICK_ROWS = [0, 1];
const BRICK_STEP = 2.1;
const BRICK_HALF = 0.95;
const START_SPEED = 8;
const MAX_SPEED = 16;
const LIVES = 3;

interface Brick { x: number; row: number; alive: boolean }

export const breakout: GameDef = {
  name: 'Breakout',
  controls: '← / →  or  A / D',
  blurb: 'Clear both rows of bricks without dropping the ball.',
  create(seed) {
    const rng = makeRng(seed);
    let bricks: Brick[] = [];
    let px = BOARD_W / 2;
    let bx = 0, by = 0, vx = 0, vy = 0;
    let lives = LIVES, score = 0, stuck = true;

    function layBricks() {
      bricks = [];
      for (const row of BRICK_ROWS) {
        for (let x = 1.2; x < BOARD_W - 0.8; x += BRICK_STEP) {
          bricks.push({ x, row, alive: true });
        }
      }
    }

    function launch() {
      bx = px;
      by = PADDLE_ROW - 0.7;
      const a = (rng() - 0.5) * 0.7;
      vx = Math.sin(a) * START_SPEED;
      vy = -Math.cos(a) * START_SPEED;
      stuck = true;
    }

    const g: Game = {
      reset() {
        layBricks();
        px = BOARD_W / 2;
        lives = LIVES; score = 0;
        launch();
      },

      step(dt, input) {
        if (lives <= 0 || bricks.every((b) => !b.alive)) return;

        if (anyHeld(input, LEFT)) px -= PADDLE_SPEED * dt;
        if (anyHeld(input, RIGHT)) px += PADDLE_SPEED * dt;
        px = Math.max(HALF_W, Math.min(BOARD_W - HALF_W, px));

        // The ball rides the paddle until you move — no timed serve to miss.
        if (stuck) {
          bx = px;
          if (anyHeld(input, LEFT) || anyHeld(input, RIGHT)) stuck = false;
          else return;
        }

        bx += vx * dt;
        by += vy * dt;

        if (bx < 0.3) { bx = 0.6 - bx; vx = -vx; }
        if (bx > BOARD_W - 0.3) { bx = 2 * (BOARD_W - 0.3) - bx; vx = -vx; }
        if (by < 0) { by = -by; vy = -vy; }

        // Paddle: the contact point sets the outgoing angle.
        if (vy > 0 && by >= PADDLE_ROW - 0.6 && by <= PADDLE_ROW + 0.4) {
          if (Math.abs(bx - px) <= HALF_W + 0.4) {
            const off = (bx - px) / (HALF_W + 0.4);
            const speed = Math.min(MAX_SPEED, Math.hypot(vx, vy) * 1.04);
            const ang = off * 1.0;
            vx = Math.sin(ang) * speed;
            vy = -Math.cos(ang) * speed;
            by = PADDLE_ROW - 0.6;
          }
        }

        for (const b of bricks) {
          if (!b.alive) continue;
          if (Math.abs(bx - b.x) > BRICK_HALF || Math.abs(by - b.row) > 0.55) continue;
          b.alive = false;
          score++;
          // Bounce off whichever face was closer, so glancing hits look right.
          if (Math.abs(bx - b.x) / BRICK_HALF > Math.abs(by - b.row) / 0.55) vx = -vx;
          else vy = -vy;
          break;
        }

        if (by > BOARD_H) { lives--; if (lives > 0) launch(); }
      },

      render() {
        const f: Frame = new Map();
        for (const b of bricks) {
          if (!b.alive) continue;
          const hue: [number, number, number] = b.row === 0 ? [255, 60, 120] : [255, 160, 0];
          splat(f, b.x, b.row, hue, 1.1, 0.3);
        }
        const pc: [number, number, number] = lives > 0 ? [60, 200, 255] : [120, 30, 30];
        for (let dx = -HALF_W; dx <= HALF_W + 0.01; dx += 0.55) {
          splat(f, px + dx, PADDLE_ROW, pc, 0.5, 0.3);
        }
        if (lives > 0) splat(f, bx, by, stuck ? [150, 150, 150] : [255, 255, 255], 0.5, 0.28);
        return f;
      },

      view: () => {
        const left = bricks.filter((b) => b.alive).length;
        const won = left === 0;
        return {
          score,
          status: won
            ? `Cleared! ${score} bricks`
            : lives <= 0
              ? `Game over — ${score} bricks`
              : `${left} left   lives ${'●'.repeat(Math.max(0, lives))}${'○'.repeat(LIVES - Math.max(0, lives))}`,
          state: won || lives <= 0 ? 'over' : 'playing',
        };
      },
    };
    g.reset();
    return g;
  },
};
