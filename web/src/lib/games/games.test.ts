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

describe('rhythm', () => {
  const LANE_CODES = ['KeyF', 'KeyG', 'KeyH', 'KeyJ'];

  it('drops combo and accuracy when every note is ignored', () => {
    const g = GAMES.rhythm.create(17);
    for (let i = 0; i < 1200; i++) g.step(DT, none());
    expect(g.view().score).toBe(0);
    expect(g.view().status).toContain('combo 0');
    expect(g.view().status).not.toContain('100%');
  });

  it('scores and builds combo when notes are hit on the beat', () => {
    const g = GAMES.rhythm.create(17);
    // 100 BPM is a 0.6s beat, which at dt=1/60 is exactly 36 frames — and the
    // chart only places notes on beats. Hitting all four lanes on each beat
    // boundary therefore lands every note, whichever lane it is in.
    const BEAT_FRAMES = 36;
    for (let i = 0; i < 3000; i++) {
      g.step(DT, i % BEAT_FRAMES === 0 ? holding(...LANE_CODES) : none());
    }
    expect(g.view().score).toBeGreaterThan(0);
    expect(g.view().status).toContain('100%');
  });
});

describe('reaction', () => {
  it('re-arms the round on a press before the light', () => {
    const g = GAMES.reaction.create(13);
    g.step(DT, holding('KeyA'));
    // Under MIN_WAIT (1.1s), so still waiting — a false start re-arms the
    // round rather than advancing it. Idling longer would time the round out,
    // which is a different mechanism.
    for (let i = 0; i < 40; i++) g.step(DT, none());
    expect(g.view().status).toContain('Round 1/5');
    expect(g.view().status).toContain('wait');
  });

  it('reports false starts in the final summary', () => {
    const g = GAMES.reaction.create(13);
    g.step(DT, holding('KeyA'));
    for (let i = 0; i < 8000 && g.view().state === 'playing'; i++) {
      const m = /GO \((\w)\)/.exec(g.view().status);
      g.step(DT, m ? holding(`Key${m[1]}`) : none());
    }
    expect(g.view().status).toContain('false start');
  });

  it('records a time when the lit key is hit, and finishes five rounds', () => {
    const g = GAMES.reaction.create(13);
    for (let i = 0; i < 6000 && g.view().state === 'playing'; i++) {
      const st = g.view().status;
      const m = /GO \((\w)\)/.exec(st);
      g.step(DT, m ? holding(`Key${m[1]}`) : none());
    }
    expect(g.view().state).toBe('over');
    expect(g.view().status).toContain('avg');
    // Hitting on the very next frame is ~1 frame of latency, not 2s of timeout.
    expect(g.view().score).toBeLessThan(200);
  });
});

describe('memory', () => {
  const CARDS = ['KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyA','KeyS','KeyD','KeyF','KeyG','KeyH'];

  it('can be solved by an oracle that remembers what it has seen', () => {
    const g = GAMES.memory.create(31);
    // Turn each card over once, which must not by itself solve anything.
    for (const code of CARDS) {
      g.step(DT, holding(code));
      for (let i = 0; i < 80; i++) g.step(DT, none()); // let the pair hide
    }
    expect(g.view().state).toBe('playing');
    // Brute force: try every pairing, which is legal play and must terminate.
    for (let a = 0; a < CARDS.length && g.view().state === 'playing'; a++) {
      for (let b = a + 1; b < CARDS.length && g.view().state === 'playing'; b++) {
        g.step(DT, holding(CARDS[a]));
        g.step(DT, holding(CARDS[b]));
        for (let i = 0; i < 80; i++) g.step(DT, none());
      }
    }
    expect(g.view().state).toBe('over');
    expect(g.view().status).toContain('Solved');
  });

  it('ignores presses while a mismatched pair is on show', () => {
    const g = GAMES.memory.create(31);
    g.step(DT, holding(CARDS[0]));
    g.step(DT, holding(CARDS[1]));
    const before = g.view().status;
    g.step(DT, holding(CARDS[2]));
    expect(g.view().status).toBe(before);
  });
});

describe('dodger', () => {
  it('scores as rocks go by and eventually gets hit', () => {
    const g = GAMES.dodger.create(6);
    for (let i = 0; i < 6000 && g.view().state === 'playing'; i++) g.step(DT, none());
    expect(g.view().score).toBeGreaterThan(0);
    expect(g.view().state).toBe('over');
  });

  it('moves the ship between rows on a press', () => {
    const g = GAMES.dodger.create(6);
    const rowOf = (gg: typeof g) => {
      // The ship is the teal splat; find its brightest cell.
      let best = -1, bestV = 0;
      for (const [led, c] of gg.render()) {
        if (c[1] > 150 && c[2] > 120 && c[0] < 150 && c[1] > bestV) { bestV = c[1]; best = led; }
      }
      return best;
    };
    const before = rowOf(g);
    g.step(DT, holding('ArrowUp'));
    expect(rowOf(g)).not.toBe(before);
  });
});

describe('flappy', () => {
  it('waits for the first flap before anything moves', () => {
    const g = GAMES.flappy.create(2);
    for (let i = 0; i < 600; i++) g.step(DT, none());
    expect(g.view().status).toBe('Flap to start');
    expect(g.view().state).toBe('playing');
  });

  it('crashes into the floor when left alone after starting', () => {
    const g = GAMES.flappy.create(2);
    g.step(DT, holding('Space'));
    for (let i = 0; i < 600 && g.view().state === 'playing'; i++) g.step(DT, none());
    expect(g.view().state).toBe('over');
  });

  it('scores by flapping through gaps', () => {
    // A flap every k frames hovers: FLAP=-6.2 against GRAVITY=20 gives a ~1u
    // bob, which fits a 2.3u gap. Gap heights are seeded, so sweep a few of
    // each until one lines up — this checks scoring works, not that a fixed
    // cadence is a winning strategy.
    let best = 0;
    for (const k of [24, 30, 36]) {
      for (let seed = 0; seed < 30 && best === 0; seed++) {
        const h = GAMES.flappy.create(seed);
        for (let i = 0; i < 2000 && h.view().state === 'playing'; i++) {
          h.step(DT, i % k === 0 ? holding('Space') : none());
        }
        best = Math.max(best, h.view().score);
      }
    }
    expect(best).toBeGreaterThan(0);
  });
});

describe('space invaders', () => {
  it('shoots invaders down when firing while sweeping', () => {
    const g = GAMES.invaders.create(8);
    for (let i = 0; i < 4000 && g.view().score < 3; i++) {
      const codes = [i % 200 < 100 ? 'ArrowLeft' : 'ArrowRight'];
      if (i % 20 === 0) codes.push('Space');
      g.step(DT, holding(...codes));
    }
    expect(g.view().score).toBeGreaterThanOrEqual(3);
  });

  it('ends once the formation reaches the ship row', () => {
    const g = GAMES.invaders.create(8);
    for (let i = 0; i < 20000 && g.view().state === 'playing'; i++) g.step(DT, none());
    expect(g.view().state).toBe('over');
  });
});

describe('tron', () => {
  it('resolves a head-on as a draw, not a win for whoever is checked first', () => {
    // The two start facing each other on row 2. Left alone they close until
    // each would ride into the other's freshly-laid wall on the same tick.
    const g = GAMES.tron.create(1);
    for (let i = 0; i < 600 && g.view().state === 'playing'; i++) g.step(DT, none());
    expect(g.view().state).toBe('over');
    expect(g.view().status).toBe('Draw');
  });

  it('declares a winner when only one rider crashes', () => {
    const g = GAMES.tron.create(1);
    // Blue turns away and survives; orange keeps going and hits blue's wall.
    for (let i = 0; i < 600 && g.view().state === 'playing'; i++) {
      g.step(DT, i < 12 ? holding('KeyW') : none());
    }
    expect(g.view().state).toBe('over');
    expect(g.view().status).toContain('wins');
  });

  it('ignores a reversal into its own wall', () => {
    const g = GAMES.tron.create(1);
    for (let i = 0; i < 20; i++) g.step(DT, holding('KeyA'));
    expect(g.view().state).toBe('playing');
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
