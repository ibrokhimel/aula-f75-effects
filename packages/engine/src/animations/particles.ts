import { resolveAnimationParameters } from './parameters';
import type { AnimationCore } from './core';
import type { AnimationFn, RGB } from './core';

export function createParticles(core: AnimationCore) {
  const { ALL_LEDS, BOARD_H, BOARD_W, CX, CY, LED_GEO, SNAKE_PATH, PALETTES, add, clamp01, frac, hash1, hsv, maxBlend, sampleP } = core;

  /** Rocket rises, bursts, and the shell sags under gravity as it fades. */
  const fireworks: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('fireworks', values);
    const f = new Map<number, RGB>();
    const PERIOD = 0.85, RISE = 0.5, BURST = 1.0;
    const newest = Math.floor(t / PERIOD);
    for (let k = newest; k > newest - 3; k--) {
      const age = t - k * PERIOD;
      if (age < 0) continue;
      const x = 1.5 + hash1(k) * (BOARD_W - 3);
      const apex = 0.5 + hash1(k + 99) * 1.6;
      const hue = hash1(k + 7);
      if (age < RISE) {
        const y = (BOARD_H - 1) - ((BOARD_H - 1) - apex) * (age / RISE);
        for (const [led, p] of LED_GEO) {
          const v = Math.exp(-((p.ux - x) ** 2) / 0.6 - ((p.uy - y) ** 2) / 0.4);
          if (v > 0.05) add(f, led, hsv(0.11, 0.45, Math.min(1, v)));
        }
      } else {
        const ba = age - RISE;
        if (ba > BURST) continue;
        const env = Math.exp(-2.6 * (ba / BURST));
        const r = ba * 9;
        const sag = ba * ba * controls.gravity;
        for (const [led, p] of LED_GEO) {
          const d = Math.hypot(p.ux - x, (p.uy - apex - sag) * 2.1);
          const v = Math.exp(-((d - r) ** 2) / 1.5) * env;
          if (v < 0.04) continue;
          add(f, led, hsv(hue + d * 0.012, 0.85, Math.min(1, v)));
        }
      }
    }
    return f;
  };

  /** Streaks on a fixed diagonal, staggered so the sky is never empty. */
  const meteorShower: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('meteorshower', values);
    const f = new Map<number, RGB>();
    const N = controls.count, SPEED = 16, SLOPE = controls.slope;
    for (let k = 0; k < N; k++) {
      const span = BOARD_W + 14;
      const hx = frac((t * SPEED + hash1(k) * span) / span) * span - 7;
      const hy = -1 + hash1(k + 31) * (BOARD_H + 1) - (hx - CX) * SLOPE;
      const hue = 0.55 + hash1(k + 11) * 0.18;
      for (const [led, p] of LED_GEO) {
        const along = (p.ux - hx) * -1; // positive = behind the head
        if (along < -0.8) continue;
        const across = (p.uy - hy) - along * SLOPE;
        const v = Math.exp(-Math.max(0, along) * 0.42 - (across * across) / 0.55)
                * (along < 0 ? Math.exp(along * 4) : 1);
        if (v < 0.04) continue;
        add(f, led, hsv(hue, clamp01(0.2 + along * 0.28), Math.min(1, v)));
      }
    }
    return f;
  };

  /** Balls on independent periods; abs(sin) gives a convincing bounce cusp. */
  const bouncingBalls: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('bouncingballs', values);
    const f = new Map<number, RGB>();
    const N = controls.count;
    for (let k = 0; k < N; k++) {
      const x = (k + 0.5) * (BOARD_W / N);
      const period = 0.75 + hash1(k) * 0.5;
      const y = (BOARD_H - 1) * (1 - Math.abs(Math.sin((t / period) * Math.PI)));
      const hue = k / N;
      for (const [led, p] of LED_GEO) {
        const v = Math.exp(-((p.ux - x) ** 2) / 1.1 - ((p.uy - y) ** 2) / 0.35);
        if (v < 0.05) continue;
        maxBlend(f, led, hsv(hue, 0.9, Math.min(1, v)));
      }
    }
    return f;
  };

  /** Kernels sit dark, pop bright, then arc up and fall back. */
  const popcorn: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('popcorn', values);
    const f = new Map<number, RGB>();
    const PERIOD = 0.22, LIFE = 1.05;
    const newest = Math.floor(t / PERIOD);
    for (let k = newest; k > newest - 6; k--) {
      const age = t - k * PERIOD;
      if (age < 0 || age > LIFE) continue;
      const x = hash1(k) * BOARD_W;
      const power = 0.6 + hash1(k + 5) * 0.4;
      // Parabola in row space: launches from the bottom row, falls back.
      const y = (BOARD_H - 1) - (controls.power * power * age - 7.0 * age * age);
      if (y > BOARD_H) continue;
      const hue = hash1(k + 17);
      for (const [led, p] of LED_GEO) {
        const v = Math.exp(-((p.ux - x) ** 2) / 0.7 - ((p.uy - y) ** 2) / 0.4);
        if (v < 0.05) continue;
        add(f, led, hsv(hue, 0.75, Math.min(1, v)));
      }
    }
    return f;
  };

  /** Keys light at random and fade — cheap, and reliably festive. */
  const confetti: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('confetti', values);
    const f = new Map<number, RGB>();
    const SLOT = 0.09, TAIL = 9;
    const now = Math.floor(t / SLOT);
    for (const led of ALL_LEDS) {
      let best = 0, hue = 0;
      for (let b = 0; b < TAIL; b++) {
        const slot = now - b;
        if (hash1(led * 131.7 + slot * 7.3) > 1 - controls.density / 100) {
          const v = Math.exp(-(t - slot * SLOT) * 3.2);
          if (v > best) { best = v; hue = hash1(slot * 19.1 + led); }
        }
      }
      if (best > 0.04) f.set(led, hsv(hue, 0.85, Math.min(1, best)));
    }
    return f;
  };

  /** Sparks lifting off a hot floor, drifting sideways as they cool. */
  const emberRise: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('emberrise', values);
    const f = new Map<number, RGB>();
    const N = controls.count, LIFE = 2.6;
    for (let k = 0; k < N; k++) {
      const phase = frac(t / LIFE + hash1(k));
      const y = (BOARD_H - 0.5) - phase * (BOARD_H + 0.5);
      const x = hash1(k + 41) * BOARD_W + Math.sin(t * 0.9 + k) * 1.2 * phase;
      const v0 = (1 - phase) ** 1.4 * (0.55 + 0.45 * hash1(k + 3));
      for (const [led, p] of LED_GEO) {
        const v = v0 * Math.exp(-((p.ux - x) ** 2) / 0.5 - ((p.uy - y) ** 2) / 0.3);
        if (v < 0.04) continue;
        add(f, led, sampleP(PALETTES.ember, 0.45 + phase * 0.3).map((c) => Math.round(c * Math.min(1, v))) as RGB);
      }
    }
    return f;
  };

  /** Stars streaming outward from the centre; they brighten as they near the edge. */
  const starfield: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('starfield', values);
    const f = new Map<number, RGB>();
    const N = controls.count, SPEED = 0.35;
    for (let k = 0; k < N; k++) {
      const ang = hash1(k) * Math.PI * 2;
      const z = frac(t * SPEED + hash1(k + 61));
      const r = z * z * 14;
      const x = CX + Math.cos(ang) * r;
      const y = CY + Math.sin(ang) * r * 0.42;
      const v0 = z * z;
      for (const [led, p] of LED_GEO) {
        const v = v0 * Math.exp(-((p.ux - x) ** 2) / 0.45 - ((p.uy - y) ** 2) / 0.28);
        if (v < 0.05) continue;
        add(f, led, [Math.round(200 * v), Math.round(215 * v), Math.round(255 * v)]);
      }
    }
    return f;
  };

  /** Two comets on opposite headings; where they cross the overlap flares. */
  const dualComet: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('dualcomet', values);
    const f = new Map<number, RGB>();
    const span = BOARD_W + 12;
    for (let s = 0; s < 2; s++) {
      const dir = s === 0 ? 1 : -1;
      const hx = s === 0 ? ((t * 11) % span) - 6 : BOARD_W + 6 - ((t * 13) % span);
      const hy = CY + (s === 0 ? 1.6 : -1.6) * Math.sin(t * (0.7 + s * 0.4) + s);
      const hue = s === 0 ? 0.55 : 0.03;
      for (const [led, p] of LED_GEO) {
        const behind = (hx - p.ux) * dir;
        if (behind < -1.2) continue;
        const along = behind < 0 ? -behind * 2.5 : behind * controls.tail;
        const across = p.uy - hy;
        const v = Math.exp(-along) * Math.exp(-(across * across) / 1.0);
        if (v < 0.04) continue;
        add(f, led, hsv(hue, Math.min(1, 0.2 + Math.max(0, behind) * 0.35), Math.min(1, v)));
      }
    }
    return f;
  };

  /** Points on nested elliptical orbits — a tiny orrery. */
  const orbit: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('orbit', values);
    const f = new Map<number, RGB>();
    const N = controls.count;
    for (let k = 0; k < N; k++) {
      const r = 2.2 + k * 1.9;
      const w = 1.5 / (0.6 + k * 0.55); // outer bodies move slower
      const a = t * w + hash1(k) * 6.283;
      const x = CX + Math.cos(a) * r;
      const y = CY + Math.sin(a) * r * 0.36;
      const hue = k / N + t * 0.02;
      for (const [led, p] of LED_GEO) {
        const v = Math.exp(-((p.ux - x) ** 2) / 0.7 - ((p.uy - y) ** 2) / 0.3);
        if (v < 0.05) continue;
        add(f, led, hsv(hue, 0.85, Math.min(1, v)));
      }
    }
    return f;
  };

  /** Jets launched from the bottom centre on a spread of angles. */
  const fountain: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('fountain', values);
    const f = new Map<number, RGB>();
    const N = 26, LIFE = 1.5;
    for (let k = 0; k < N; k++) {
      const age = frac(t / LIFE + hash1(k)) * LIFE;
      const ang = -Math.PI / 2 + (hash1(k + 23) - 0.5) * controls.spread;
      const spd = 6.5 + hash1(k + 71) * 3;
      const x = CX + Math.cos(ang) * spd * age * 1.6;
      const y = (BOARD_H - 0.5) + Math.sin(ang) * spd * age + 5.2 * age * age;
      if (y > BOARD_H + 0.5) continue;
      const v0 = clamp01(1 - age / LIFE);
      for (const [led, p] of LED_GEO) {
        const v = v0 * Math.exp(-((p.ux - x) ** 2) / 0.5 - ((p.uy - y) ** 2) / 0.3);
        if (v < 0.04) continue;
        add(f, led, sampleP(PALETTES.ocean, 0.4 + v0 * 0.4).map((c) => Math.round(c * Math.min(1, v))) as RGB);
      }
    }
    return f;
  };

  /** Sparkle with a long exponential tail instead of a hard on/off. */
  const glitterFade: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('glitterfade', values);
    const f = new Map<number, RGB>();
    const SLOT = 0.13, TAIL = 12;
    const now = Math.floor(t / SLOT);
    for (const led of ALL_LEDS) {
      let v = 0;
      for (let b = 0; b < TAIL; b++) {
        const slot = now - b;
        if (hash1(led * 53.1 + slot * 3.7) > 0.9) {
          v = Math.max(v, Math.exp(-(t - slot * SLOT) * controls.decay));
        }
      }
      if (v > 0.03) f.set(led, [Math.round(255 * v), Math.round(240 * v), Math.round(200 * v)]);
    }
    return f;
  };

  /** Agents chasing a wandering attractor, each with its own lag. */
  const swarm: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('swarm', values);
    const f = new Map<number, RGB>();
    const N = controls.count;
    const tx = CX + (CX - 1.5) * Math.sin(t * 0.53);
    const ty = CY + CY * Math.sin(t * 0.71 + 1.2);
    for (let k = 0; k < N; k++) {
      const lag = 0.25 + hash1(k) * 0.9;
      const lx = CX + (CX - 1.5) * Math.sin((t - lag) * 0.53) + Math.sin(t * 2 + k) * 0.9;
      const ly = CY + CY * Math.sin((t - lag) * 0.71 + 1.2) + Math.cos(t * 2.3 + k) * 0.5;
      const x = lx + (tx - lx) * 0.15, y = ly + (ty - ly) * 0.15;
      for (const [led, p] of LED_GEO) {
        const v = Math.exp(-((p.ux - x) ** 2) / 0.6 - ((p.uy - y) ** 2) / 0.28);
        if (v < 0.05) continue;
        add(f, led, hsv(0.28 + k * 0.02 + t * 0.03, 0.9, Math.min(1, v)));
      }
    }
    return f;
  };

  /** Pulses running the serpentine key path — follows the physical rows. */
  const pulseChase: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('pulsechase', values);
    const f = new Map<number, RGB>();
    const n = SNAKE_PATH.length;
    const PULSES = controls.pulses, TAIL = controls.tail;
    for (let s = 0; s < PULSES; s++) {
      const head = Math.floor((t * 34 + (s * n) / PULSES) % n);
      const hue = s / PULSES + t * 0.05;
      for (let o = 0; o < TAIL; o++) {
        const led = SNAKE_PATH[((head - o) % n + n) % n];
        add(f, led, hsv(hue, 0.9, ((TAIL - o) / TAIL) ** 2));
      }
    }
    return f;
  };

  /** Drops fall, land on the bottom row, and throw a short splash ring. */
  const raindropImpact: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('raindropimpact', values);
    const f = new Map<number, RGB>();
    const PERIOD = 0.28, FALL = 0.55, SPLASH = controls.splash;
    const newest = Math.floor(t / PERIOD);
    for (let k = newest; k > newest - 5; k--) {
      const age = t - k * PERIOD;
      if (age < 0) continue;
      const x = hash1(k) * BOARD_W;
      if (age < FALL) {
        const y = (age / FALL) * (BOARD_H - 1);
        for (const [led, p] of LED_GEO) {
          const v = Math.exp(-((p.ux - x) ** 2) / 0.3 - ((p.uy - y) ** 2) / 0.55);
          if (v > 0.05) add(f, led, hsv(0.56, 0.75, Math.min(1, v * 0.8)));
        }
      } else {
        const sa = age - FALL;
        if (sa > SPLASH) continue;
        const r = sa * 11, env = 1 - sa / SPLASH;
        for (const [led, p] of LED_GEO) {
          const d = Math.hypot(p.ux - x, (p.uy - (BOARD_H - 1)) * 2.2);
          const v = Math.exp(-((d - r) ** 2) / 1.1) * env;
          if (v > 0.04) add(f, led, hsv(0.52, 0.5, Math.min(1, v)));
        }
      }
    }
    return f;
  };

  /** Slow drifting motes that twinkle as they cross — deliberately sparse. */
  const magicDust: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('magicdust', values);
    const f = new Map<number, RGB>();
    const N = controls.count;
    for (let k = 0; k < N; k++) {
      const x = frac(hash1(k) + t * (0.02 + hash1(k + 9) * 0.03)) * BOARD_W;
      const y = CY + Math.sin(t * (0.3 + hash1(k + 5) * 0.4) + k * 1.7) * (CY * 0.95);
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (3 + hash1(k) * 4) + k));
      for (const [led, p] of LED_GEO) {
        const v = tw * Math.exp(-((p.ux - x) ** 2) / 0.4 - ((p.uy - y) ** 2) / 0.22);
        if (v < 0.04) continue;
        add(f, led, hsv(0.72 + hash1(k + 13) * 0.2, 0.6, Math.min(1, v)));
      }
    }
    return f;
  };

  /** Falling tokens that get knocked sideways one step per row. */
  const plinko: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('plinko', values);
    const f = new Map<number, RGB>();
    const N = 10, FALL = 2.0;
    for (let k = 0; k < N; k++) {
      const phase = frac(t / FALL + hash1(k));
      const y = phase * (BOARD_H + 0.5) - 0.5;
      let x = 1 + hash1(k + 3) * (BOARD_W - 2);
      // Each completed row deflects the token left or right by a hashed step.
      for (let r = 0; r < Math.floor(y) + 1; r++) x += (hash1(k * 17 + r) > 0.5 ? 1 : -1) * controls.deflection;
      x = Math.min(BOARD_W - 0.5, Math.max(0.5, x));
      for (const [led, p] of LED_GEO) {
        const v = Math.exp(-((p.ux - x) ** 2) / 0.45 - ((p.uy - y) ** 2) / 0.35);
        if (v < 0.05) continue;
        add(f, led, hsv(hash1(k + 29), 0.85, Math.min(1, v)));
      }
    }
    return f;
  };

  /** Rare, fast, long-tailed — mostly dark, which is the point. */
  const shootingStars: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('shootingstars', values);
    const f = new Map<number, RGB>();
    const PERIOD = controls.interval, LIFE = 0.7;
    const newest = Math.floor(t / PERIOD);
    for (let k = newest; k > newest - 2; k--) {
      const age = t - k * PERIOD;
      if (age < 0 || age > LIFE) continue;
      const slope = (hash1(k + 3) - 0.5) * 0.9;
      const y0 = hash1(k) * (BOARD_H - 1);
      const hx = -6 + (age / LIFE) * (BOARD_W + 12);
      const hy = y0 + (hx - CX) * slope;
      const env = Math.sin((age / LIFE) * Math.PI) ** 0.6;
      for (const [led, p] of LED_GEO) {
        const along = hx - p.ux;
        if (along < -0.6) continue;
        const across = (p.uy - hy) - along * slope;
        const v = env * Math.exp(-Math.max(0, along) * 0.3 - (across * across) / 0.4);
        if (v < 0.04) continue;
        add(f, led, [Math.round(220 * v), Math.round(235 * v), Math.round(255 * v)]);
      }
    }
    return f;
  };
  return { fireworks, meteorShower, bouncingBalls, popcorn, confetti, emberRise, starfield, dualComet, orbit, fountain, glitterFade, swarm, pulseChase, raindropImpact, magicDust, plinko, shootingStars };
}
