/**
 * Space Invaders. The formation marches across, steps down at each edge, and
 * speeds up as it thins out — the original's difficulty curve was an accident
 * of having fewer sprites to draw, but it is the right feel, so it is explicit
 * here.
 */

import {
  BOARD_H, BOARD_W, type Frame, type Game, type GameDef,
  LEFT, RIGHT, anyHeld, anyPressed, makeRng, splat,
} from './core';

const SHIP_ROW = BOARD_H - 1;
const SHIP_SPEED = 11;
const BULLET_SPEED = 9;
const BOMB_SPEED = 4.2;
const COLS = 6;
const ROWS = 3;
const COL_STEP = 2.2;
const BASE_MARCH = 1.5;
const LIVES = 3;
const FIRE = ['Space', 'KeyW', 'ArrowUp'];

interface Inv { c: number; r: number; alive: boolean }

export const invaders: GameDef = {
  name: 'Space Invaders',
  controls: '← / →   Space to fire',
  blurb: 'They speed up as you thin them out.',
  create(seed) {
    const rng = makeRng(seed);
    let inv: Inv[] = [];
    let mx = 0, my = 0, dir = 1;
    let ship = BOARD_W / 2;
    let bullet: { x: number; y: number } | null = null;
    let bombs: Array<{ x: number; y: number }> = [];
    let lives = LIVES, score = 0, hurt = 0, cleared = false;

    const alive = () => inv.filter((i) => i.alive);
    const px = (i: Inv) => mx + i.c * COL_STEP;
    const py = (i: Inv) => my + i.r;

    const g: Game = {
      reset() {
        inv = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) inv.push({ c, r, alive: true });
        mx = 1.2; my = 0; dir = 1;
        ship = BOARD_W / 2;
        bullet = null; bombs = [];
        lives = LIVES; score = 0; hurt = 0; cleared = false;
      },

      step(dt, input) {
        if (lives <= 0 || cleared) return;
        if (hurt > 0) hurt = Math.max(0, hurt - dt);

        if (anyHeld(input, LEFT)) ship -= SHIP_SPEED * dt;
        if (anyHeld(input, RIGHT)) ship += SHIP_SPEED * dt;
        ship = Math.max(0.5, Math.min(BOARD_W - 0.5, ship));
        if (anyPressed(input, FIRE) && !bullet) bullet = { x: ship, y: SHIP_ROW - 0.6 };

        // Formation. Fewer survivors means a faster march.
        const live = alive();
        const speed = BASE_MARCH * (1 + (inv.length - live.length) / inv.length * 2.5);
        mx += dir * speed * dt;
        const lo = Math.min(...live.map(px));
        const hi = Math.max(...live.map(px));
        if (hi > BOARD_W - 0.6 && dir > 0) { dir = -1; my += 0.5; }
        else if (lo < 0.6 && dir < 0) { dir = 1; my += 0.5; }

        if (bullet) {
          bullet.y -= BULLET_SPEED * dt;
          if (bullet.y < -0.5) bullet = null;
        }
        if (bullet) {
          for (const i of live) {
            if (Math.abs(px(i) - bullet.x) > 0.9 || Math.abs(py(i) - bullet.y) > 0.55) continue;
            i.alive = false; score++; bullet = null; break;
          }
        }

        // Bombs come only from the lowest invader in each column, so you can
        // read where fire will come from.
        if (rng() < dt * (0.7 + score * 0.06)) {
          const c = Math.floor(rng() * COLS);
          const column = live.filter((i) => i.c === c);
          if (column.length) {
            const low = column.reduce((a, b) => (b.r > a.r ? b : a));
            bombs.push({ x: px(low), y: py(low) + 0.4 });
          }
        }
        for (const b of bombs) b.y += BOMB_SPEED * dt;
        bombs = bombs.filter((b) => b.y < BOARD_H + 0.5);
        if (hurt === 0) {
          for (const b of bombs) {
            if (Math.abs(b.x - ship) < 0.8 && Math.abs(b.y - SHIP_ROW) < 0.6) {
              lives--; hurt = 0.7; bombs = []; break;
            }
          }
        }

        if (live.length === 0) cleared = true;
        else if (Math.max(...live.map(py)) >= SHIP_ROW - 0.4) lives = 0;
      },

      render() {
        const f: Frame = new Map();
        for (const i of alive()) {
          splat(f, px(i), py(i), i.r === 0 ? [180, 80, 255] : [60, 235, 90], 0.85, 0.3);
        }
        for (const b of bombs) splat(f, b.x, b.y, [255, 40, 0], 0.4, 0.28);
        if (bullet) splat(f, bullet.x, bullet.y, [255, 255, 180], 0.35, 0.25);
        const sc: [number, number, number] = lives <= 0
          ? [120, 25, 25]
          : hurt > 0 ? [255, Math.round(120 * (1 - hurt)), 0] : [80, 200, 255];
        splat(f, ship, SHIP_ROW, sc, 0.6, 0.3);
        return f;
      },

      view: () => ({
        score,
        status: cleared
          ? `Cleared! ${score}`
          : lives <= 0
            ? `Invaded — ${score} shot down`
            : `${score}   lives ${'●'.repeat(Math.max(0, lives))}${'○'.repeat(LIVES - Math.max(0, lives))}`,
        state: cleared || lives <= 0 ? 'over' : 'playing',
      }),
    };
    g.reset();
    return g;
  },
};
