/**
 * Pong. Continuous physics in key units, rendered by proximity, so it uses the
 * whole 16u width rather than the 10-column solid grid.
 *
 * Two players on one board: W/S on the left, arrows on the right.
 */

import {
  BOARD_H, BOARD_W, type Frame, type Game, type GameDef,
  anyHeld, bar, makeRng, splat,
} from './core';

const TOP = 0;
const BOT = BOARD_H - 1;
const PADDLE_X = 0.7;
const HALF = 1.1;          // paddle half-height, key units
const PADDLE_SPEED = 7.5;  // key units per second
const START_SPEED = 7;
const MAX_SPEED = 18;
const WIN = 5;

export const pong: GameDef = {
  name: 'Pong',
  controls: 'W / S  vs  ↑ / ↓',
  blurb: 'Two players, one keyboard. First to 5.',
  create(seed) {
    const rng = makeRng(seed);
    let bx = 0, by = 0, vx = 0, vy = 0;
    let p1 = 0, p2 = 0, s1 = 0, s2 = 0;
    let serveIn = 0;      // seconds of pause before the next serve
    let flash = 0;        // brief full-board tint when a point lands
    let flashSide = 0;

    function serve(toward: number) {
      bx = BOARD_W / 2;
      by = BOT / 2;
      const angle = (rng() - 0.5) * 0.9;
      vx = toward * START_SPEED;
      vy = angle * START_SPEED;
      serveIn = 0.8;
    }

    const g: Game = {
      reset() {
        p1 = p2 = BOT / 2;
        s1 = s2 = 0;
        flash = 0;
        serve(rng() < 0.5 ? -1 : 1);
      },

      step(dt, input) {
        if (flash > 0) flash = Math.max(0, flash - dt);
        if (s1 >= WIN || s2 >= WIN) return;

        // Paddles move even during the serve pause, so you can get set.
        if (anyHeld(input, ['KeyW'])) p1 -= PADDLE_SPEED * dt;
        if (anyHeld(input, ['KeyS'])) p1 += PADDLE_SPEED * dt;
        if (anyHeld(input, ['ArrowUp'])) p2 -= PADDLE_SPEED * dt;
        if (anyHeld(input, ['ArrowDown'])) p2 += PADDLE_SPEED * dt;
        p1 = Math.max(TOP + HALF, Math.min(BOT - HALF, p1));
        p2 = Math.max(TOP + HALF, Math.min(BOT - HALF, p2));

        if (serveIn > 0) { serveIn -= dt; return; }

        bx += vx * dt;
        by += vy * dt;

        // Walls.
        if (by < TOP) { by = TOP + (TOP - by); vy = -vy; }
        if (by > BOT) { by = BOT - (by - BOT); vy = -vy; }

        // Paddles. Reflecting off-centre steepens the angle, which is what
        // makes rallies escalate rather than settle into a loop.
        const speed = Math.min(MAX_SPEED, Math.hypot(vx, vy) * 1.06);
        if (vx < 0 && bx <= PADDLE_X + 0.5 && bx > PADDLE_X - 1.0) {
          if (Math.abs(by - p1) <= HALF + 0.45) {
            const off = (by - p1) / (HALF + 0.45);
            const ang = off * 0.9;
            vx = Math.cos(ang) * speed;
            vy = Math.sin(ang) * speed;
            bx = PADDLE_X + 0.5;
          }
        }
        const rx = BOARD_W - PADDLE_X;
        if (vx > 0 && bx >= rx - 0.5 && bx < rx + 1.0) {
          if (Math.abs(by - p2) <= HALF + 0.45) {
            const off = (by - p2) / (HALF + 0.45);
            const ang = off * 0.9;
            vx = -Math.cos(ang) * speed;
            vy = Math.sin(ang) * speed;
            bx = rx - 0.5;
          }
        }

        // Points.
        if (bx < -0.5) { s2++; flash = 0.45; flashSide = 2; serve(1); }
        else if (bx > BOARD_W + 0.5) { s1++; flash = 0.45; flashSide = 1; serve(-1); }
      },

      render() {
        const f: Frame = new Map();
        if (flash > 0) {
          const k = flash / 0.45;
          const c: [number, number, number] = flashSide === 1
            ? [Math.round(70 * k), Math.round(20 * k), 0]
            : [0, Math.round(30 * k), Math.round(70 * k)];
          for (let row = 0; row <= BOT; row++) splat(f, BOARD_W / 2, row, c, 400, 0.5);
        }
        bar(f, PADDLE_X, p1, HALF, [255, 90, 30]);
        bar(f, BOARD_W - PADDLE_X, p2, HALF, [40, 140, 255]);
        // The ball dims during the serve pause so the pause reads as deliberate.
        const b = serveIn > 0 ? 130 : 255;
        splat(f, bx, by, [b, b, b], 0.55, 0.3);
        return f;
      },

      view() {
        const done = s1 >= WIN || s2 >= WIN;
        return {
          score: Math.max(s1, s2),
          status: done
            ? `${s1 > s2 ? 'Left' : 'Right'} wins ${s1}–${s2}`
            : `${s1} – ${s2}${serveIn > 0 ? '   (serving…)' : ''}`,
          state: done ? 'over' : 'playing',
        };
      },
    };
    g.reset();
    return g;
  },
};
