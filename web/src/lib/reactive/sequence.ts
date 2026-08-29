/**
 * Sequence effects — the *order* of your presses is the input.
 *
 * The distinguishing property of this family: shuffle the same set of keys
 * into a different order and the board looks different. Where Chain draws
 * the path between presses, Sequence reads the run as a word — repeats,
 * mirrors, alternation, phrases that come back around.
 */

import {
  BOARD_W, LED_GEO, type Frame, type Press, type ReactiveFn,
  ROW_SCALE, addTo, age, clamp01, hsv, inOrder, maxTo, newestFirst, segment,
} from './core';

/** Which half of the board a press landed on — the hands, roughly. */
const side = (p: Press) => (p.ux < BOARD_W / 2 ? 0 : 1);

/** A playhead walks the run in the order you typed it, over and over. */
export const march: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  if (!seq.length) return f;
  const STEP = 0.13;
  const head = (t / STEP) % seq.length;
  seq.forEach((p, i) => {
    // Wrap the distance: the head has just passed the end of the phrase and
    // come round again, so index 0 trails index n-1 rather than jumping.
    let d = head - i;
    if (d < 0) d += seq.length;
    const v = clamp01(1 - d / 4) ** 1.5 * clamp01(1 - age(p, t) / 5);
    if (v < 0.04) return;
    maxTo(f, p.led, hsv(0.55 + i * 0.02, 0.85, Math.min(1, v)));
  });
  return f;
};

/** Hitting the same key twice stacks; a different key resets the stack. */
export const runLength: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  let run = 0;
  for (let i = 0; i < seq.length; i++) {
    run = i > 0 && seq[i].led === seq[i - 1].led ? run + 1 : 0;
    const p = seq[i];
    const v = clamp01(1 - age(p, t) / 2.5);
    if (v < 0.04) continue;
    const k = clamp01(run / 5);
    maxTo(f, p.led, hsv(0.5 - k * 0.5, 0.9 - k * 0.4, Math.min(1, v)));
    // A stack spills onto its neighbours, so a repeated letter visibly grows
    // rather than just changing colour in place.
    if (run === 0) continue;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW_SCALE);
      const s = v * k * Math.exp(-(d * d) / (0.6 + k * 3));
      if (s < 0.05) continue;
      addTo(f, led, hsv(0.5 - k * 0.5, 0.8, Math.min(1, s)));
    }
  }
  return f;
};

/** Ordered pairs. A bigram you type often burns brighter than a one-off. */
export const bigram: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  // Direction matters: "th" and "ht" are different pairs, so the key packs
  // the two LEDs in order rather than as an unordered set.
  const seen = new Map<number, number>();
  for (let i = 1; i < seq.length; i++) {
    const k = seq[i - 1].led * 128 + seq[i].led;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  for (let i = Math.max(1, seq.length - 10); i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    const n = seen.get(a.led * 128 + b.led) ?? 1;
    const v = clamp01(1 - age(b, t) / 2.5) * clamp01(0.3 + n * 0.3);
    if (v < 0.04) continue;
    segment(f, a.ux, a.uy, b.ux, b.uy, 0.08 + Math.min(n, 4) * 0.08, v);
  }
  // The first press of a run has no pair yet, so give it a mark of its own.
  const last = seq[seq.length - 1];
  if (last) {
    const v = clamp01(1 - age(last, t) / 2.5);
    if (v > 0.04) maxTo(f, last.led, hsv(0.08, 0.75, Math.min(1, v)));
  }
  return f;
};

/** Longest k where the last k presses repeat the k immediately before them. */
function repeatLen(seq: readonly Press[], max = 6) {
  for (let k = Math.min(max, seq.length >> 1); k >= 2; k--) {
    let ok = true;
    for (let i = 0; i < k && ok; i++) {
      ok = seq[seq.length - 1 - i].led === seq[seq.length - 1 - k - i].led;
    }
    if (ok) return k;
  }
  return 0;
}

/** Type the same short phrase twice and it lights up as a phrase. */
export const phrase: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  const k = repeatLen(seq);
  const from = seq.length - k;
  seq.forEach((p, i) => {
    const v = clamp01(1 - age(p, t) / 3);
    if (v < 0.04) return;
    // Members of the detected repeat go bright and warm; everything else
    // stays a dim blue, so the phrase reads out of the surrounding noise.
    const inPhrase = k > 0 && (i >= from || (i >= from - k && i < from));
    maxTo(f, p.led, inPhrase
      ? hsv(0.13, 0.9, Math.min(1, v))
      : hsv(0.6, 0.7, Math.min(1, v * 0.35)));
  });
  if (k > 0) {
    // A pulse across the repeated span marks the moment it locked on.
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    for (let i = from; i < seq.length; i++) {
      const p = seq[i];
      const v = clamp01(1 - age(p, t) / 3) * pulse;
      if (v > 0.05) addTo(f, p.led, hsv(0.13, 0.5, Math.min(1, v * 0.6)));
    }
  }
  return f;
};

/** Rewards a run that mirrors itself — abcba lights, abcde does not. */
export const palindrome: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses).slice(-9);
  let pairs = 0, match = 0;
  for (let i = 0, j = seq.length - 1; i < j; i++, j--) {
    pairs++;
    if (seq[i].led === seq[j].led) match++;
  }
  const sym = pairs ? match / pairs : 0;
  for (let i = 0, j = seq.length - 1; i < j; i++, j--) {
    const a = seq[i], b = seq[j];
    const v = clamp01(1 - age(b, t) / 3) * (a.led === b.led ? 1 : 0.22);
    if (v < 0.04) continue;
    segment(f, a.ux, a.uy, b.ux, b.uy, a.led === b.led ? 0.42 : 0.95, v * 0.8);
  }
  for (const p of seq) {
    const v = clamp01(1 - age(p, t) / 3);
    if (v > 0.04) maxTo(f, p.led, hsv(0.42 * sym + 0.95 * (1 - sym), 0.85, Math.min(1, v)));
  }
  return f;
};

/** Alternating hands runs green; hammering one hand runs red. */
export const alternate: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses).slice(-10);
  let n = 0, alt = 0;
  for (let i = 1; i < seq.length; i++) {
    n++;
    if (side(seq[i]) !== side(seq[i - 1])) alt++;
  }
  // A run of one is neither alternating nor not, so it starts neutral.
  const ratio = n ? alt / n : 0.5;
  const hue = 0.0 + ratio * 0.33;
  for (const [led, g] of LED_GEO) {
    // The two halves wash toward their own edge, so the alternation reads
    // as a left-right conversation rather than one flat colour.
    const bias = g.ux < BOARD_W / 2 ? ratio : 1 - ratio;
    f.set(led, hsv(hue, 0.9, 0.03 + bias * 0.08));
  }
  seq.forEach((p, i) => {
    const v = clamp01(1 - age(p, t) / 2.2) * (0.45 + 0.55 * (i / Math.max(1, seq.length - 1)));
    if (v > 0.04) maxTo(f, p.led, hsv(hue, 0.85, Math.min(1, v)));
  });
  return f;
};

/** Stop typing and the run replays itself backwards. */
export const rewind: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  if (!seq.length) return f;
  const last = seq[seq.length - 1];
  const idle = Math.max(0, t - (last.release ?? last.t));
  const PAUSE = 0.35;
  if (idle < PAUSE) {
    for (const p of seq) {
      const v = clamp01(1 - age(p, t) / 1.6);
      if (v > 0.04) maxTo(f, p.led, hsv(0.55, 0.7, Math.min(1, v)));
    }
    return f;
  }
  const head = (idle - PAUSE) / 0.09;
  seq.forEach((p, i) => {
    // Position counted from the end: the last key you hit rewinds first.
    const d = head - (seq.length - 1 - i);
    const v = clamp01(1 - Math.abs(d) / 2.5) * clamp01(1 - age(p, t) / 5.5);
    if (v < 0.04) return;
    maxTo(f, p.led, hsv(0.02 + i * 0.02, 0.85, Math.min(1, v)));
  });
  return f;
};

/** Each press becomes a rung one row above the press before it. */
export const ladder: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  newestFirst(presses).slice(0, 6).forEach((p, i) => {
    const v = clamp01(1 - age(p, t) / 3) * clamp01(1 - i / 6);
    if (v < 0.04) return;
    const uy = p.uy - i * 0.9;
    for (const [led, g] of LED_GEO) {
      const dx = Math.abs(g.ux - p.ux), dy = Math.abs(g.uy - uy);
      if (dy > 0.5 || dx > 1.6) continue;
      const s = v * (1 - dx / 1.9);
      if (s < 0.05) continue;
      addTo(f, led, hsv(0.3 + i * 0.05, 0.85, Math.min(1, s)));
    }
  });
  return f;
};

/** A lock that advances while each press lands right of the last. */
export const comboLock: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  let stage = 0;
  for (let i = 1; i < seq.length; i++) {
    stage = seq[i].ux > seq[i - 1].ux ? stage + 1 : 0;
  }
  const level = clamp01(stage / 7);
  for (const [led, g] of LED_GEO) {
    f.set(led, g.ux / BOARD_W <= level
      ? hsv(0.12 + level * 0.22, 0.9, 0.2 + level * 0.6)
      : [3, 3, 6]);
  }
  const last = seq[seq.length - 1];
  if (last) {
    const v = Math.exp(-age(last, t) * 5);
    if (v > 0.04) maxTo(f, last.led, hsv(0.12, 0.2, Math.min(1, v)));
  }
  return f;
};
