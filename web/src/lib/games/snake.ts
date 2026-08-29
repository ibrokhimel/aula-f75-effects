/**
 * Snake on the 5x10 solid grid — the only region of this board with no gaps,
 * which is what discrete movement needs.
 */

import {
  PLAY_H, PLAY_W, type Frame, type Game, type GameDef,
  DOWN, LEFT, RIGHT, UP, anyPressed, blend, makeRng, playLed,
} from './core';

type Cell = { x: number; y: number };

const START_TICK = 0.28;   // seconds per step
const MIN_TICK = 0.10;
const GROW = 2;

export const snake: GameDef = {
  name: 'Snake',
  controls: 'Arrows or WASD',
  blurb: '50 cells. Do not eat yourself.',
  create(seed) {
    const rng = makeRng(seed);
    let body: Cell[] = [];
    let dx = 1, dy = 0;
    let queued: [number, number] | null = null;
    let food: Cell = { x: 0, y: 0 };
    let grow = 0, score = 0, dead = false;
    let acc = 0, tick = START_TICK;

    const occupied = (x: number, y: number) => body.some((c) => c.x === x && c.y === y);

    function placeFood() {
      // Rejection sampling is fine: the grid is 50 cells and the snake is short.
      for (let i = 0; i < 400; i++) {
        const x = Math.floor(rng() * PLAY_W);
        const y = Math.floor(rng() * PLAY_H);
        if (!occupied(x, y)) { food = { x, y }; return; }
      }
    }

    const g: Game = {
      reset() {
        body = [{ x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }];
        dx = 1; dy = 0; queued = null;
        grow = 0; score = 0; dead = false;
        acc = 0; tick = START_TICK;
        placeFood();
      },

      step(dt, input) {
        if (dead) return;

        // Buffer one turn and reject reversals, so a fast double-tap cannot
        // fold the snake back into its own neck.
        let nx = dx, ny = dy;
        if (anyPressed(input, UP)) { nx = 0; ny = -1; }
        else if (anyPressed(input, DOWN)) { nx = 0; ny = 1; }
        else if (anyPressed(input, LEFT)) { nx = -1; ny = 0; }
        else if (anyPressed(input, RIGHT)) { nx = 1; ny = 0; }
        if ((nx !== dx || ny !== dy) && !(nx === -dx && ny === -dy)) queued = [nx, ny];

        acc += dt;
        while (acc >= tick && !dead) {
          acc -= tick;
          if (queued) { [dx, dy] = queued; queued = null; }

          const head = { x: body[0].x + dx, y: body[0].y + dy };
          if (head.x < 0 || head.y < 0 || head.x >= PLAY_W || head.y >= PLAY_H) { dead = true; break; }
          // The tail cell vacates this step unless we are growing, so it is
          // not a collision.
          const hitSelf = body.some((c, i) =>
            c.x === head.x && c.y === head.y && !(i === body.length - 1 && grow === 0));
          if (hitSelf) { dead = true; break; }

          body.unshift(head);
          if (head.x === food.x && head.y === food.y) {
            score++;
            grow += GROW;
            tick = Math.max(MIN_TICK, START_TICK - score * 0.012);
            placeFood();
          }
          if (grow > 0) grow--; else body.pop();
        }
      },

      render() {
        const f: Frame = new Map();
        blend(f, playLed(food.x, food.y), [255, 40, 40]);
        body.forEach((c, i) => {
          const k = i === 0 ? 1 : 0.34 + 0.4 * (1 - i / body.length);
          const col: [number, number, number] = dead
            ? [Math.round(150 * k), Math.round(30 * k), Math.round(30 * k)]
            : [Math.round(40 * k), Math.round(255 * k), Math.round(90 * k)];
          blend(f, playLed(c.x, c.y), col);
        });
        return f;
      },

      view: () => ({
        score,
        status: dead ? `Dead — length ${body.length}` : `Length ${body.length}`,
        state: dead ? 'over' : 'playing',
      }),
    };
    g.reset();
    return g;
  },
};
