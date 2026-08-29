/**
 * Tron light cycles. Two players on the 5x10 solid grid, both leaving walls
 * behind them. Last one riding wins.
 */

import {
  PLAY_H, PLAY_W, type Frame, type Game, type GameDef, type RGB,
  anyPressed, blend, playLed,
} from './core';

interface Rider {
  x: number; y: number; dx: number; dy: number;
  queued: [number, number] | null;
  alive: boolean;
  trail: Array<[number, number]>;
  colour: RGB; head: RGB;
}

const START_TICK = 0.24;
const MIN_TICK = 0.12;
const P1_KEYS: Array<[string, number, number]> = [
  ['KeyW', 0, -1], ['KeyS', 0, 1], ['KeyA', -1, 0], ['KeyD', 1, 0],
];
const P2_KEYS: Array<[string, number, number]> = [
  ['ArrowUp', 0, -1], ['ArrowDown', 0, 1], ['ArrowLeft', -1, 0], ['ArrowRight', 1, 0],
];

export const tron: GameDef = {
  name: 'Tron',
  controls: 'WASD  vs  Arrows',
  blurb: 'Two light cycles, one grid. Do not touch a wall.',
  create() {
    let p1!: Rider, p2!: Rider;
    let acc = 0, tick = START_TICK, ticks = 0, over = false, result = '';

    const occupied = (x: number, y: number) =>
      p1.trail.some(([tx, ty]) => tx === x && ty === y) ||
      p2.trail.some(([tx, ty]) => tx === x && ty === y);

    function turn(r: Rider, keys: Array<[string, number, number]>, input: Parameters<Game['step']>[1]) {
      for (const [code, dx, dy] of keys) {
        if (!anyPressed(input, [code])) continue;
        // No reversing into your own wall — it would be an instant, unreadable death.
        if (dx === -r.dx && dy === -r.dy) continue;
        r.queued = [dx, dy];
        break;
      }
    }

    const g: Game = {
      reset() {
        p1 = {
          x: 1, y: 2, dx: 1, dy: 0, queued: null, alive: true,
          trail: [[1, 2]], colour: [0, 90, 140], head: [80, 220, 255],
        };
        p2 = {
          x: PLAY_W - 2, y: 2, dx: -1, dy: 0, queued: null, alive: true,
          trail: [[PLAY_W - 2, 2]], colour: [150, 60, 0], head: [255, 170, 60],
        };
        acc = 0; tick = START_TICK; ticks = 0; over = false; result = '';
      },

      step(dt, input) {
        if (over) return;
        turn(p1, P1_KEYS, input);
        turn(p2, P2_KEYS, input);

        acc += dt;
        while (acc >= tick && !over) {
          acc -= tick;
          ticks++;
          tick = Math.max(MIN_TICK, START_TICK - ticks * 0.0015);

          for (const r of [p1, p2]) {
            if (r.queued) { [r.dx, r.dy] = r.queued; r.queued = null; }
          }
          // Both move before either is judged, so a head-on is a draw rather
          // than a win for whoever happens to be checked first.
          const n1 = { x: p1.x + p1.dx, y: p1.y + p1.dy };
          const n2 = { x: p2.x + p2.dx, y: p2.y + p2.dy };
          const off = (n: { x: number; y: number }) =>
            n.x < 0 || n.y < 0 || n.x >= PLAY_W || n.y >= PLAY_H;

          const d1 = off(n1) || occupied(n1.x, n1.y) || (n1.x === n2.x && n1.y === n2.y);
          const d2 = off(n2) || occupied(n2.x, n2.y) || (n1.x === n2.x && n1.y === n2.y);

          if (!d1) { p1.x = n1.x; p1.y = n1.y; p1.trail.push([n1.x, n1.y]); }
          if (!d2) { p2.x = n2.x; p2.y = n2.y; p2.trail.push([n2.x, n2.y]); }
          p1.alive = !d1; p2.alive = !d2;

          if (d1 || d2) {
            over = true;
            result = d1 && d2 ? 'Draw' : d1 ? 'Orange wins' : 'Blue wins';
          }
        }
      },

      render() {
        const f: Frame = new Map();
        for (const r of [p1, p2]) {
          for (const [x, y] of r.trail) blend(f, playLed(x, y), r.colour);
          blend(f, playLed(r.x, r.y), r.alive || !over ? r.head : [140, 20, 20]);
        }
        return f;
      },

      view: () => ({
        score: Math.max(p1.trail.length, p2.trail.length),
        status: over ? result : `Blue ${p1.trail.length}  ·  Orange ${p2.trail.length}`,
        state: over ? 'over' : 'playing',
      }),
    };
    g.reset();
    return g;
  },
};
