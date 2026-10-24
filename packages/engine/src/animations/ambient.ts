import { resolveAnimationParameters } from './parameters';
import type { AnimationCore } from './core';
import type { AnimationFn, RGB } from './core';

export function createAmbient(core: AnimationCore) {
  const { ALL_LEDS, BOARD_H, BOARD_W, CX, CY, LED_BY_NAME, LED_GEO, PALETTES, clamp01, fbm, fill, frac, hash1, hsv, rampP, sampleP, scale } = core;

  /** Warm, uneven, and never quite still. Two noise rates fake a draught. */
  const candle: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('candle', values);
    const f = new Map<number, RGB>();
    const gust = 0.82 + 0.18 * fbm(0, 0, t * 0.9, 2);
    for (const [led, p] of LED_GEO) {
      const local = 0.85 + 0.15 * fbm(p.ux * 0.3, p.uy * 0.5, t * 1.7, 2);
      const v = clamp01(gust * local * (0.62 + 0.38 * (1 - p.uy / BOARD_H)));
      f.set(led, [Math.round(255 * v), Math.round(controls.green * v), Math.round(30 * v)]);
    }
    return f;
  };

  /** The whole board on one hue, drifting slowly enough to be unnoticeable. */
  const slowGradient: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('slowgradient', values);
    const f = new Map<number, RGB>();
    for (const [led, p] of LED_GEO) {
      f.set(led, hsv(t * 0.012 + p.ux * 0.012 + p.uy * 0.01, controls.saturation, 0.8));
    }
    return f;
  };

  /** Muted arctic blues on a slow tide — quiet enough for a dark room. */
  const nordicCalm: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('nordic', values);
    const f = new Map<number, RGB>();
    for (const [led, p] of LED_GEO) {
      const n = fbm(p.ux * 0.14, p.uy * 0.3, t * 0.07, 3);
      f.set(led, scale(rampP(PALETTES.ice, 0.2 + n * controls.contrast), 0.62));
    }
    return f;
  };

  /** Two fixed colours cross-fading across the board and over time. */
  const duotoneDrift: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('duotone', values);
    const f = new Map<number, RGB>();
    const A: RGB = [255, 60, 120], B: RGB = [40, 120, 255];
    for (const [led, p] of LED_GEO) {
      const x = clamp01(0.5 + 0.5 * Math.sin(p.ux * controls.spread + p.uy * 0.3 - t * 0.5));
      f.set(led, [
        Math.round(A[0] + (B[0] - A[0]) * x),
        Math.round(A[1] + (B[1] - A[1]) * x),
        Math.round(A[2] + (B[2] - A[2]) * x),
      ]);
    }
    return f;
  };

  /** Lub-dub: a strong beat, a weaker one 0.28s later, then rest. */
  const heartbeat: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('heartbeat', values);
    const BPM = controls.bpm;
    const period = 60 / BPM;
    const a = frac(t / period) * period;
    const v = clamp01(Math.exp(-a * 13) + 0.6 * Math.exp(-Math.abs(a - 0.28) * 15));
    return fill([Math.round(255 * v), Math.round(28 * v), Math.round(46 * v)]);
  };

  /**
   * A 4-7-8 breathing pacer: inhale bright and cool, hold, exhale dim and warm.
   *
   * `warmth` is the loop-safe part. It ends the exhale at 1 and cools back to 0
   * across the inhale, so it meets itself at the cycle boundary; driving both
   * hue and saturation from it removes the blue-to-amber jump the old
   * three-branch version had at the hold/exhale seam.
   */
  const zenBreath: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('zenbreath', values);
    const CYCLE = controls.inhale + controls.hold + controls.exhale; // 4 in, 7 hold, 8 out
    const a = frac(t / CYCLE) * CYCLE;
    const v = a < controls.inhale ? a / controls.inhale : a < controls.inhale + controls.hold ? 1 : 1 - (a - controls.inhale - controls.hold) / controls.exhale;
    const warmth = a < controls.inhale ? 1 - a / controls.inhale : a < controls.inhale + controls.hold ? 0 : (a - controls.inhale - controls.hold) / controls.exhale;
    return fill(hsv(0.58 - 0.49 * warmth, 0.3 + 0.55 * warmth, 0.12 + 0.88 * v));
  };

  /** 25 minutes of work turning red, then 5 of green break. Reads at a glance. */
  const pomodoroGlow: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('pomodoro', values);
    const WORK = controls.work * 60, BREAK = controls.rest * 60;
    const a = t % (WORK + BREAK);
    if (a < WORK) {
      // Hue walks green to red as the work block runs down.
      const p = a / WORK;
      return fill(hsv(0.33 * (1 - p), 0.9, 0.55 + 0.2 * Math.sin(t * 0.6)));
    }
    const p = (a - WORK) / BREAK;
    return fill(hsv(0.42, 0.7, 0.35 + 0.3 * Math.sin(p * Math.PI * 4)));
  };

  /** Dim, warm, and almost static — usable as an actual desk night light. */
  const nightLight: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('nightlight', values);
    const f = new Map<number, RGB>();
    for (const [led, p] of LED_GEO) {
      const v = 0.16 + 0.05 * fbm(p.ux * 0.1, p.uy * 0.2, t * 0.05, 2);
      f.set(led, [Math.round(255 * v), Math.round(controls.warmth * v), Math.round(38 * v)]);
    }
    return f;
  };

  /** Sparse, slow twinkles on near-black. Most keys are off at any moment. */
  const starlightDim: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('starlight', values);
    const f = new Map<number, RGB>();
    for (const led of ALL_LEDS) {
      const rate = 0.25 + hash1(led) * 0.5;
      const tw = 0.5 + 0.5 * Math.sin(t * rate * 2 + hash1(led + 7) * 6.283);
      const v = 0.04 + 0.5 * tw ** controls.sharpness; // steep power keeps the board mostly dark
      f.set(led, [Math.round(190 * v), Math.round(205 * v), Math.round(255 * v)]);
    }
    return f;
  };

  /** A colour-temperature sweep, tungsten through to overcast daylight. */
  const colorTemp: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('colortemp', values);
    const f = new Map<number, RGB>();
    const k = 0.5 + 0.5 * Math.sin(t * 0.18);
    for (const [led, p] of LED_GEO) {
      const local = clamp01(k + (p.ux / BOARD_W - 0.5) * controls.spread);
      f.set(led, [
        255,
        Math.round(150 + 85 * local),
        Math.round(60 + 175 * local),
      ]);
    }
    return f;
  };

  /** Only the outer ring is lit, breathing — the rest of the board stays dark. */
  const edgeGlow: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('edgeglow', values);
    const f = new Map<number, RGB>();
    const v = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.1));
    for (const [led, p] of LED_GEO) {
      const onEdge = p.uy < 0.5 || p.uy > BOARD_H - 1.5 || p.ux < controls.width || p.ux > BOARD_W - controls.width;
      if (!onEdge) continue;
      f.set(led, sampleP(PALETTES.cyber, p.ux / BOARD_W * 0.4 + t * 0.05).map((c) => Math.round(c * v)) as RGB);
    }
    return f;
  };

  /** WASD and the arrows picked out hot; everything else a dim wash. */
  const wasdFocus: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('wasd', values);
    const f = new Map<number, RGB>();
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.2);
    const cluster = new Set<number>();
    for (const label of ['W', 'A', 'S', 'D', '↑', '←', '↓', '→', 'Space', 'Shift', 'LShift']) {
      const idx = LED_BY_NAME.get(label);
      if (idx !== undefined) cluster.add(idx);
    }
    for (const [led, p] of LED_GEO) {
      if (cluster.has(led)) {
        f.set(led, [Math.round(255 * pulse), Math.round(40 * pulse), 0]);
      } else {
        // A dim blue wash with a slow lateral ripple so it is not dead flat.
        const v = 0.9 + 0.35 * Math.sin(p.ux * 0.3 - t);
        f.set(led, [Math.round(26 * v), Math.round(36 * v), Math.round(controls.background * v)]);
      }
    }
    return f;
  };

  /** A static heat map of where the hands sit — warm centre, cool extremities. */
  const typingHeat: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('typingheat', values);
    const f = new Map<number, RGB>();
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.7);
    // Two pools over the home-row halves, where the fingers actually rest.
    const pools: Array<[number, number]> = [[CX - 4.5, CY + 0.6], [CX + 3.5, CY + 0.6]];
    for (const [led, p] of LED_GEO) {
      let heat = 0;
      for (const [hx, hy] of pools) {
        heat += Math.exp(-((p.ux - hx) ** 2) / controls.spread - ((p.uy - hy) ** 2) / 3.2);
      }
      f.set(led, rampP(PALETTES.fire, clamp01(heat * 0.9 * breathe)));
    }
    return f;
  };

  /** One hue, one wave — no rainbow anywhere. Good with a themed build. */
  const monoWave: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('monowave', values);
    const f = new Map<number, RGB>();
    const HUE = controls.hue;
    for (const [led, p] of LED_GEO) {
      const v = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(p.ux * 0.4 + p.uy * 0.3 - t * 2));
      f.set(led, hsv(HUE, 0.85, v));
    }
    return f;
  };

  /** Almost black, with a distant flare that swells and dies every few seconds. */
  const deepSpace: AnimationFn = (t, values) => {
    const controls = resolveAnimationParameters('deepspace', values);
    const f = new Map<number, RGB>();
    const PERIOD = 5.5, LIFE = 4.0;
    const k = Math.floor(t / PERIOD);
    const age = Math.max(0, t - k * PERIOD);
    // Half-sine envelope: the flare swells from nothing and dies back to nothing.
    // The old exp() decay started at full brightness and was cut off mid-fade,
    // so it both snapped on and snapped off.
    const env = age < LIFE ? Math.sin((age / LIFE) * Math.PI) ** 2 : 0;
    const fx = hash1(k) * BOARD_W, fy = hash1(k + 5) * (BOARD_H - 1);
    const hue = 0.55 + hash1(k + 11) * 0.35;
    for (const [led, p] of LED_GEO) {
      const dust = 0.03 * fbm(p.ux * 0.2, p.uy * 0.4, t * 0.03, 2);
      const d = Math.hypot(p.ux - fx, (p.uy - fy) * 2.4);
      const flare = env * Math.exp(-(d * d) / controls.width);
      const v = clamp01(dust + flare);
      if (v < 0.015) continue;
      f.set(led, hsv(hue, 0.7, v));
    }
    return f;
  };
  return { candle, slowGradient, nordicCalm, duotoneDrift, heartbeat, zenBreath, pomodoroGlow, nightLight, starlightDim, colorTemp, edgeGlow, wasdFocus, typingHeat, monoWave, deepSpace };
}
