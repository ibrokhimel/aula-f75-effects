/**
 * Arcade, CRT and terminal effects. These are the column-oriented ones — most
 * quantise `ux` to an integer column so the result looks like a character
 * grid rather than a smooth field.
 */

import {
  ALL_LEDS, BOARD_H, BOARD_W, CX, CY, LED_GEO,
  PALETTES, type AnimationFn, type RGB,
  add, clamp01, frac, hash1, hsv, maxBlend, noise3, sampleP,
} from './core';

const TAU = Math.PI * 2;
const N_COLS = Math.ceil(BOARD_W);

/** Cascading columns, bright head, green decaying tail. */
export const matrixRain: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const col = Math.round(p.ux);
    const speed = 2.2 + hash1(col) * 3.4;
    const head = frac(hash1(col + 41) + (t * speed) / (BOARD_H + 6)) * (BOARD_H + 6) - 3;
    const behind = head - p.uy;
    if (behind < -0.5 || behind > 6) continue;
    // Per-cell flicker stands in for glyphs changing as they fall.
    const glyph = hash1(col * 31 + Math.floor(p.uy) * 7 + Math.floor(t * 9)) > 0.25 ? 1 : 0.35;
    if (behind < 0.5) {
      f.set(led, [Math.round(190 * glyph), 255, Math.round(200 * glyph)]);
    } else {
      const v = Math.exp(-behind * 0.55) * glyph;
      if (v < 0.04) continue;
      f.set(led, [Math.round(20 * v), Math.round(255 * v), Math.round(60 * v)]);
    }
  }
  return f;
};

/** A bright raster line rolling down a dim phosphor field. */
export const crtScanline: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const line = frac(t * 0.55) * (BOARD_H + 1) - 0.5;
  for (const [led, p] of LED_GEO) {
    const scan = Math.exp(-((p.uy - line) ** 2) / 0.28);
    const raster = 0.12 + 0.06 * Math.sin(p.uy * TAU); // faint interlace
    const noise = 0.06 * noise3(p.ux * 3, p.uy * 3, t * 12);
    const v = clamp01(raster + scan * 0.9 + noise);
    f.set(led, [Math.round(90 * v), Math.round(220 * v), Math.round(150 * v)]);
  }
  return f;
};

/** Rows tear sideways and flash chromatic — a broken signal. */
export const glitchBars: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const slot = Math.floor(t * 7);
  for (const [led, p] of LED_GEO) {
    const row = Math.floor(p.uy);
    const torn = hash1(row * 13 + slot) > 0.72;
    const shift = torn ? (hash1(row * 7 + slot) - 0.5) * 9 : 0;
    const u = p.ux + shift;
    const band = 0.5 + 0.5 * Math.sin(u * 0.9 + t * 1.4);
    if (torn) {
      // Split the channels to fake chromatic aberration on the torn rows.
      const r = 0.5 + 0.5 * Math.sin((u + 1.5) * 0.9 + t * 1.4);
      const b = 0.5 + 0.5 * Math.sin((u - 1.5) * 0.9 + t * 1.4);
      f.set(led, [Math.round(255 * r), Math.round(120 * band), Math.round(255 * b)]);
    } else {
      f.set(led, [Math.round(40 * band), Math.round(180 * band), Math.round(200 * band)]);
    }
  }
  return f;
};

/** Column meters that leap and fall back with a held peak marker. */
export const vuMeter: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const col = Math.round(p.ux);
    const drive = 0.5 + 0.5 * Math.sin(t * (2.1 + hash1(col) * 3) + col * 0.7);
    const level = clamp01(drive * (0.55 + 0.45 * noise3(col * 0.4, 0, t * 2)));
    const h = level * BOARD_H;
    const fromBottom = BOARD_H - p.uy;
    if (fromBottom > h + 0.6) continue;
    const peak = Math.abs(fromBottom - h) < 0.6;
    // Green at the bottom, red at the top — the meter convention.
    const hue = clamp01(0.33 - (fromBottom / BOARD_H) * 0.33);
    f.set(led, peak ? [255, 255, 255] : hsv(hue, 0.95, 0.9));
  }
  return f;
};

/** Wider bars, palette-shaded rather than red-lined. */
export const equalizer: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const band = Math.floor(p.ux / 2.5);
    const level = clamp01(
      0.35 + 0.4 * Math.sin(t * (1.6 + band * 0.4) + band) + 0.35 * noise3(band, 0, t * 3),
    );
    const h = level * BOARD_H;
    const fromBottom = BOARD_H - p.uy;
    if (fromBottom > h) continue;
    f.set(led, sampleP(PALETTES.cyber, fromBottom / BOARD_H * 0.5 + 0.15));
  }
  return f;
};

/** Indeterminate progress bar: fills, pauses, resets. */
export const loadingBar: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const CYCLE = 2.8;
  const phase = frac(t / CYCLE);
  const filled = clamp01(phase * 1.35) * BOARD_W;
  for (const [led, p] of LED_GEO) {
    const inBar = Math.abs(p.uy - CY) < 1.6;
    if (!inBar) { f.set(led, [4, 6, 12]); continue; }
    if (p.ux < filled) {
      // A specular highlight sliding along the filled portion.
      const sheen = Math.exp(-((p.ux - frac(t * 0.8) * BOARD_W) ** 2) / 3.5);
      f.set(led, hsv(0.55, 0.85 - sheen * 0.6, 0.65 + sheen * 0.35));
    } else {
      f.set(led, [10, 16, 34]);
    }
  }
  return f;
};

/** A mouth eating a line of pellets, with a ghost in pursuit. */
export const pacmanChase: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const LAP = BOARD_W + 6;
  const px = frac(t * 0.22) * LAP - 3;
  const gx = px - 3.5;
  const lane = Math.round(CY);
  for (const [led, p] of LED_GEO) {
    if (Math.abs(p.uy - lane) > 0.6) continue;
    // Pellets ahead of the mouth only; behind it they are eaten.
    if (p.ux > px + 0.8 && Math.abs(frac(p.ux / 2) - 0.5) < 0.18) {
      f.set(led, [90, 90, 60]);
    }
    const pac = Math.exp(-((p.ux - px) ** 2) / 0.6);
    if (pac > 0.15) maxBlend(f, led, [Math.round(255 * pac), Math.round(230 * pac), 0]);
    const ghost = Math.exp(-((p.ux - gx) ** 2) / 0.6);
    if (ghost > 0.15) maxBlend(f, led, [Math.round(255 * ghost), Math.round(60 * ghost), Math.round(160 * ghost)]);
  }
  return f;
};

/** Ball rebounding between two paddles that track it imperfectly. */
export const pongBounce: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  // Triangle waves give perfect elastic bounces off all four walls.
  const tri = (x: number) => Math.abs(frac(x) * 2 - 1);
  const bx = tri(t * 0.28) * (BOARD_W - 2) + 1;
  const by = tri(t * 0.51 + 0.3) * (BOARD_H - 1);
  const paddleY = tri(t * 0.28 + 0.06) * (BOARD_H - 1); // lags the ball slightly
  for (const [led, p] of LED_GEO) {
    const ball = Math.exp(-((p.ux - bx) ** 2) / 0.4 - ((p.uy - by) ** 2) / 0.25);
    if (ball > 0.05) add(f, led, [Math.round(255 * ball), Math.round(255 * ball), Math.round(255 * ball)]);
    const edge = p.ux < 1.2 || p.ux > BOARD_W - 1.2;
    if (edge) {
      const pad = clamp01(1 - Math.abs(p.uy - paddleY) / 1.6);
      if (pad > 0.05) add(f, led, [0, Math.round(200 * pad), Math.round(255 * pad)]);
    }
  }
  return f;
};

/** A formation marching side to side, dropping a row each time it turns. */
export const spaceInvaders: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const STEP = 0.42;
  const step = Math.floor(t / STEP);
  const leg = step % 8;
  const marchX = (leg < 4 ? leg : 7 - leg) * 1.6;
  // Starts at 1, not 0: at drop 0 the formation is entirely above the board,
  // which left a 3.4s dead gap every cycle. Now it wraps from a sliver at the
  // bottom straight to a sliver at the top.
  const drop = 1 + (Math.floor(step / 8) % (BOARD_H + 1));
  for (const [led, p] of LED_GEO) {
    const gx = p.ux - 3 - marchX, gy = p.uy - drop + 3;
    if (gx < 0 || gy < 0 || gy > 2.5) continue;
    const cell = Math.floor(gx / 2.2);
    if (cell > 4 || frac(gx / 2.2) > 0.62) continue;
    if (Math.abs(gy - Math.round(gy)) > 0.4) continue;
    // Two-frame animation: the sprite alternates as the formation steps.
    const anim = step % 2 === 0 ? 1 : 0.55;
    f.set(led, hsv(0.28 + cell * 0.06, 0.9, anim));
  }
  return f;
};

/**
 * Pieces drop and stack until the well fills, then it collapses row by row.
 *
 * The clear phase exists so the round boundary is not a teleport: the stack
 * used to vanish between one frame and the next when `placed` wrapped.
 */
export const tetrisDrop: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const DROP = 0.4;
  const FILL = 26;             // pieces dropped per round
  const CLEAR = BOARD_H;       // one step per row on the way out
  const ROUND = FILL + CLEAR;

  const step = Math.floor(t / DROP) % ROUND;
  const clearing = step >= FILL;
  const placed = clearing ? FILL : step;

  const heights = new Array<number>(N_COLS).fill(0);
  const hues = new Array<number>(N_COLS).fill(0);
  for (let k = 0; k < placed; k++) {
    const c = Math.floor(hash1(k * 3.7) * N_COLS);
    if (heights[c] < BOARD_H) { heights[c]++; hues[c] = hash1(k); }
  }

  // How far the collapse has eaten into the stack, in rows, advanced smoothly
  // within each step so the rows dissolve rather than blink out.
  const eaten = clearing ? (step - FILL) + frac(t / DROP) : 0;

  // The piece currently in flight, falling into its column.
  const fallCol = Math.floor(hash1(placed * 3.7) * N_COLS);
  const fallY = frac(t / DROP) * (BOARD_H - heights[fallCol]);

  for (const [led, p] of LED_GEO) {
    const col = Math.round(p.ux);
    if (col >= N_COLS) continue;
    const fromBottom = BOARD_H - p.uy;
    if (fromBottom <= heights[col]) {
      if (fromBottom <= eaten) continue;               // already collapsed
      if (clearing && fromBottom <= eaten + 1) {
        f.set(led, [255, 255, 255]);                   // the row going out
      } else {
        f.set(led, hsv(hues[col], 0.85, 0.85));
      }
    } else if (!clearing && col === fallCol && Math.abs(p.uy - fallY) < 0.6) {
      f.set(led, hsv(hash1(placed * 3.7), 0.9, 1.0));
    }
  }
  return f;
};

/** Attract mode: full-board colour slams on a fixed beat. */
export const arcadeAttract: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const BEAT = 0.5;
  const b = Math.floor(t / BEAT);
  const age = t - b * BEAT;
  const env = Math.exp(-age * 5);
  const mode = b % 4;
  for (const [led, p] of LED_GEO) {
    let v: number;
    if (mode === 0) v = env;
    else if (mode === 1) v = env * clamp01(1 - Math.abs(p.ux - CX) / CX);
    else if (mode === 2) v = env * (Math.floor(p.ux / 2) % 2 === 0 ? 1 : 0.2);
    else v = env * clamp01(1 - Math.abs(p.uy - CY) / (CY + 1));
    if (v < 0.04) continue;
    f.set(led, hsv(hash1(b), 0.9, Math.min(1, v)));
  }
  return f;
};

/** A cursor typing across each row, then the screen clears and it starts over. */
export const terminalCursor: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const CPS = 9; // characters per second
  const perRow = BOARD_W;
  const total = perRow * BOARD_H;
  const typed = (t * CPS) % (total + 14); // trailing pause before the clear
  const row = Math.min(BOARD_H - 1, Math.floor(typed / perRow));
  const colPos = typed - row * perRow;
  for (const [led, p] of LED_GEO) {
    const r = Math.round(p.uy);
    if (r > row) continue;
    if (r < row || p.ux < colPos - 0.5) {
      // Already-typed text, dimmer, with a few "characters" left blank.
      if (hash1(r * 17 + Math.floor(p.ux)) > 0.22) f.set(led, [10, 150, 40]);
    } else if (Math.abs(p.ux - colPos) < 0.7) {
      const blink = frac(t * 2.2) < 0.6 ? 1 : 0.2;
      f.set(led, [Math.round(140 * blink), 255, Math.round(160 * blink)]);
    }
  }
  return f;
};

/** Dense vertical streams of ones and zeroes, cyan rather than green. */
export const dataStream: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const col = Math.round(p.ux);
    const speed = 3 + hash1(col * 5) * 5;
    const y = frac(hash1(col) + (t * speed) / 12) * 12;
    // Distance measured upward from the head, wrapped — the trail sits above it.
    const d = (y - p.uy + 12) % 12;
    const bit = hash1(col * 23 + Math.floor(p.uy) * 3 + Math.floor(t * 12)) > 0.5;
    const v = Math.exp(-d * 0.5) * (bit ? 1 : 0.4);
    if (v < 0.05) continue;
    f.set(led, [Math.round(30 * v), Math.round(210 * v), Math.round(255 * v)]);
  }
  return f;
};

/** A live trace: two harmonics summed, drawn as a thin bright line. */
export const oscilloscope: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const wave = CY
      + 1.9 * Math.sin(p.ux * 0.55 - t * 4)
      + 0.7 * Math.sin(p.ux * 1.4 - t * 6.3 + 1.1);
    const d = Math.abs(p.uy - wave);
    const v = Math.exp(-(d * d) / 0.22);
    const grid = (Math.abs(p.ux - CX) % 4 < 0.5 || Math.abs(p.uy - CY) < 0.2) ? 0.07 : 0.025;
    const tot = clamp01(v + grid);
    if (tot < 0.03) continue;
    f.set(led, [Math.round(40 * tot), Math.round(255 * tot), Math.round(90 * tot)]);
  }
  return f;
};

/** Rotating sweep with a phosphor afterglow and a couple of contacts. */
export const radarSweep: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const beam = frac(t * 0.33) * TAU;
  for (const [led, p] of LED_GEO) {
    const dx = p.ux - CX, dy = (p.uy - CY) * 2.6;
    const a = Math.atan2(dy, dx);
    // Angle behind the beam, wrapped to 0..TAU — that is the afterglow age.
    const behind = (beam - a + TAU * 2) % TAU;
    const glow = Math.exp(-behind * 1.5);
    const d = Math.hypot(dx, dy);
    const rings = Math.abs(frac(d / 4) - 0.5) < 0.06 ? 0.12 : 0;
    // Two fixed contacts light up as the beam passes over them.
    let blip = 0;
    for (let k = 0; k < 2; k++) {
      const ba = hash1(k + 3) * TAU, br = 3 + hash1(k) * 7;
      const bx = CX + Math.cos(ba) * br, by = CY + (Math.sin(ba) * br) / 2.6;
      blip += Math.exp(-((p.ux - bx) ** 2) / 0.5 - ((p.uy - by) ** 2) / 0.2)
            * Math.exp(-((beam - ba + TAU * 2) % TAU) * 0.9);
    }
    const v = clamp01(glow * 0.55 + rings + blip);
    if (v < 0.03) continue;
    f.set(led, [Math.round(20 * v), Math.round(255 * v), Math.round(70 * v)]);
  }
  return f;
};

/** POST sequence: rows come up one by one, then the board flashes ready. */
export const bootSequence: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const CYCLE = 4.5;
  const phase = frac(t / CYCLE) * CYCLE;
  const rowsUp = phase / 0.45; // one row every 0.45s
  for (const [led, p] of LED_GEO) {
    const r = Math.round(p.uy);
    if (phase > BOARD_H * 0.45 + 0.3) {
      // Everything is up: a single confirming flash, then hold dim.
      const flash = Math.exp(-(phase - BOARD_H * 0.45 - 0.3) * 4);
      f.set(led, [Math.round(60 + 195 * flash), Math.round(255), Math.round(120 + 135 * flash)]);
      continue;
    }
    if (r > rowsUp) continue;
    const settle = clamp01(rowsUp - r);
    const jitter = hash1(Math.floor(p.ux) * 7 + r * 13 + Math.floor(t * 20)) > 0.3 ? 1 : 0.45;
    const v = settle < 1 ? jitter : 0.75;
    f.set(led, [Math.round(30 * v), Math.round(220 * v), Math.round(80 * v)]);
  }
  return f;
};

/** Every key an independent slow-flickering pixel — a TV tuned to static. */
export const tvStatic: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const frame = Math.floor(t * 14);
  for (const led of ALL_LEDS) {
    const v = hash1(led * 3.1 + frame * 17.3);
    const g = Math.round(40 + v * 215);
    f.set(led, [g, g, g]);
  }
  return f;
};
