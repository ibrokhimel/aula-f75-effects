import { describe, expect, it } from 'vitest';
import { GAMES, LETTER_KEYS, PLAY_H, PLAY_W, playLed, type Input } from './index';
import { ALL_LEDS } from '../animations';

const VALID = new Set(ALL_LEDS);
const DT = 1 / 60;
const none = (): Input => ({ held: new Set(), pressed: new Set() });
const holding = (...codes: string[]): Input => ({
  held: new Set(codes), pressed: new Set(codes),
});

/** Run n frames, asserting every rendered frame is well-formed. */
function drive(id: string, n: number, input: () => Input, seed = 12345) {
  const g = GAMES[id].create(seed);
  for (let i = 0; i < n; i++) {
    g.step(DT, input());
    const f = g.render();
    for (const [led, rgb] of f) {
      expect(VALID.has(led), `${id} lit unknown LED ${led}`).toBe(true);
      for (const c of rgb) {
        expect(Number.isInteger(c) && c >= 0 && c <= 255, `${id} bad channel ${c}`).toBe(true);
      }
    }
  }
  return g;
}

describe('playfield', () => {
  it('is a gap-free 5x10 rectangle', () => {
    expect(PLAY_W).toBe(10);
    expect(PLAY_H).toBe(5);
    for (let y = 0; y < PLAY_H; y++) {
      for (let x = 0; x < PLAY_W; x++) {
        expect(playLed(x, y), `cell ${x},${y} has no LED`).not.toBeNull();
      }
    }
  });

  it('rejects out-of-bounds cells rather than wrapping', () => {
    expect(playLed(-1, 0)).toBeNull();
    expect(playLed(0, PLAY_H)).toBeNull();
    expect(playLed(PLAY_W, 0)).toBeNull();
  });

  it('exposes the full alphabet as pressable keys', () => {
    expect(LETTER_KEYS).toHaveLength(26);
    expect(LETTER_KEYS.every((k) => VALID.has(k.led))).toBe(true);
  });
});

describe.each(Object.keys(GAMES))('%s', (id) => {
  it('survives a long idle run and renders valid frames throughout', () => {
    drive(id, 1500, none);
  });

  it('survives having every direction mashed at once', () => {
    drive(id, 800, () => holding('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS'));
  });

  it('is deterministic for a given seed and input', () => {
    const a = GAMES[id].create(99);
    const b = GAMES[id].create(99);
    for (let i = 0; i < 400; i++) { a.step(DT, none()); b.step(DT, none()); }
    expect([...a.render().entries()]).toEqual([...b.render().entries()]);
    expect(a.view()).toEqual(b.view());
  });

  it('reports a coherent view', () => {
    const g = drive(id, 200, none);
    const v = g.view();
    expect(Number.isFinite(v.score)).toBe(true);
    expect(v.status.length).toBeGreaterThan(0);
    expect(['playing', 'over']).toContain(v.state);
  });
});

describe('snake', () => {
  it('dies when driven into a wall', () => {
    const g = GAMES.snake.create(7);
    for (let i = 0; i < 600; i++) g.step(DT, holding('ArrowRight'));
    expect(g.view().state).toBe('over');
  });

  it('refuses to reverse into its own neck', () => {
    const g = GAMES.snake.create(7);
    // Starts moving right; an immediate left must be ignored, not fatal.
    for (let i = 0; i < 30; i++) g.step(DT, holding('ArrowLeft'));
    expect(g.view().state).toBe('playing');
  });
});

describe('pong', () => {
  it('scores when a paddle is parked away from the ball', () => {
    const g = GAMES.pong.create(3);
    let scored = false;
    for (let i = 0; i < 4000 && !scored; i++) {
      g.step(DT, holding('ArrowUp')); // pin the right paddle to the top
      if (g.view().status !== '0 – 0' && !g.view().status.includes('serving')) scored = true;
    }
    expect(scored).toBe(true);
  });
});

describe('whack-a-mole', () => {
  it('runs out of lives if you never hit anything', () => {
    const g = GAMES.whackamole.create(5);
    for (let i = 0; i < 2000; i++) g.step(DT, none());
    expect(g.view().state).toBe('over');
  });

  it('scores when the lit key is pressed', () => {
    const g = GAMES.whackamole.create(5);
    let hits = 0;
    for (let i = 0; i < 600; i++) {
      // Find the mole by looking for the brightest amber key it renders.
      const f = g.render();
      let target: number | null = null, bestV = 0;
      for (const [led, [r, gr, b]] of f) {
        if (b === 0 && r > 90 && gr > 0 && r > bestV) { bestV = r; target = led; }
      }
      const key = LETTER_KEYS.find((k) => k.led === target);
      g.step(DT, key ? holding(key.code) : none());
      if (g.view().score > hits) hits = g.view().score;
    }
    expect(hits).toBeGreaterThan(3);
  });
});

describe('breakout', () => {
  it('breaks bricks once the ball is launched', () => {
    const g = GAMES.breakout.create(4);
    for (let i = 0; i < 2500 && g.view().score === 0; i++) {
      g.step(DT, holding(i % 120 < 60 ? 'ArrowLeft' : 'ArrowRight'));
    }
    expect(g.view().score).toBeGreaterThan(0);
  });

  it('loses lives when the paddle never moves to meet the ball', () => {
    const g = GAMES.breakout.create(4);
    // One nudge to launch, then park in a corner and let it drain.
    g.step(DT, holding('ArrowLeft'));
    for (let i = 0; i < 4000; i++) g.step(DT, holding('ArrowLeft'));
    expect(g.view().status).not.toContain('lives ●●●');
  });
});

describe('frogger', () => {
  it('registers a crossing when driven upward', () => {
    const g = GAMES.frogger.create(11);
    for (let i = 0; i < 3000 && g.view().score === 0; i++) g.step(DT, holding('ArrowUp'));
    expect(g.view().score).toBeGreaterThanOrEqual(1);
  });
});

describe('typing trainer', () => {
  it('advances through a word when the right keys are pressed', () => {
    const g = GAMES.typing.create(21);
    for (let i = 0; i < 200; i++) {
      // The target key is the one rendered pure white.
      const f = g.render();
      let target: number | null = null;
      for (const [led, [r, gr, b]] of f) if (r === 255 && gr === 255 && b === 255) target = led;
      const key = LETTER_KEYS.find((k) => k.led === target);
      g.step(DT, key ? holding(key.code) : none());
    }
    expect(g.view().score).toBeGreaterThan(0); // wpm
    expect(g.view().status).toContain('acc');
  });
});
