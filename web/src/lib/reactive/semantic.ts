/**
 * Semantic effects — what the key *means*, not where it sits.
 *
 * These read `classOf`, so a digit does not behave like a letter and
 * Backspace does not behave like either. The family's defining property:
 * press two keys of different classes and the board answers differently,
 * even when the two keys are neighbours.
 */

import {
  ALL_LEDS, BOARD_H, BOARD_W, LED_BY_NAME, LED_GEO,
  type Frame, type KeyClass, type Press, type ReactiveFn,
  ROW_SCALE, addTo, age, blob, clamp01, classOf, hsv, inOrder, isVowel,
  latest, maxTo,
} from './core';

/** One hue per class, so a class keeps its identity across the family. */
const CLASS_HUE: Record<KeyClass, number> = {
  letter: 0.55, digit: 0.12, punct: 0.85, nav: 0.33,
  enter: 0.42, back: 0.0, space: 0.62, mod: 0.75, fn: 0.18, other: 0.5,
};

/** Straight readout: every class gets its own colour. */
export const classColour: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 1.6);
    if (v < 0.04) continue;
    const c = classOf(p);
    maxTo(f, p.led, hsv(CLASS_HUE[c], 0.9, Math.min(1, v)));
    // Letters stay put; everything else is rarer, so it gets a halo and
    // reads as punctuation in the visual sentence.
    if (c === 'letter') continue;
    blob(f, p.ux, p.uy, 1.6, CLASS_HUE[c], v * 0.5);
  }
  return f;
};

/** Letters build a word; Space or Enter commits it in a flash. */
export const wordFlow: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  // Everything since the last break is the word still being typed.
  let start = 0;
  let commit: Press | null = null;
  seq.forEach((p, i) => {
    const c = classOf(p);
    if (c === 'space' || c === 'enter') { start = i + 1; commit = p; }
  });
  if (commit) {
    const v = Math.exp(-age(commit, t) * 3.5);
    if (v > 0.04) for (const led of ALL_LEDS) addTo(f, led, hsv(0.42, 0.5, Math.min(1, v * 0.8)));
  }
  const word = seq.slice(start).filter((p) => classOf(p) === 'letter');
  word.forEach((p, i) => {
    // Brightness rises along the word, so the shape of what you are typing
    // is legible while you type it.
    const v = clamp01(1 - age(p, t) / 4) * (0.4 + 0.6 * ((i + 1) / word.length));
    if (v > 0.04) maxTo(f, p.led, hsv(0.55 - i * 0.02, 0.85, Math.min(1, v)));
  });
  for (const p of seq.slice(start)) {
    if (classOf(p) === 'letter') continue;
    const v = Math.exp(-age(p, t) * 3);
    if (v > 0.05) maxTo(f, p.led, hsv(CLASS_HUE[classOf(p)], 0.85, Math.min(1, v)));
  }
  return f;
};

/** Backspace really deletes: it eats the last press still on the board. */
export const backspaceEats: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const stack: Press[] = [];
  const eaten: { victim: Press; at: Press }[] = [];
  for (const p of inOrder(presses)) {
    if (classOf(p) === 'back') {
      const victim = stack.pop();
      if (victim) eaten.push({ victim, at: p });
      continue;
    }
    stack.push(p);
  }
  for (const p of stack) {
    const v = clamp01(1 - age(p, t) / 5);
    if (v > 0.04) maxTo(f, p.led, hsv(0.5, 0.8, Math.min(1, v)));
  }
  // The deletion itself is the interesting part: show the light being
  // dragged off the victim key toward the Backspace that took it.
  for (const { victim, at } of eaten) {
    const a = age(at, t);
    if (a > 0.5) continue;
    const u = a / 0.5;
    blob(f, victim.ux + (at.ux - victim.ux) * u, victim.uy + (at.uy - victim.uy) * u,
      0.8, 0.0, 1 - u);
  }
  const last = latest(presses);
  if (last && classOf(last) === 'back') {
    const v = Math.exp(-age(last, t) * 5);
    if (v > 0.05) maxTo(f, last.led, hsv(0.0, 0.9, Math.min(1, v)));
  }
  return f;
};

/** Everything accumulates until Enter wipes the board clean. */
export const enterCommit: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  let lastEnter: Press | null = null;
  for (const p of seq) if (classOf(p) === 'enter') lastEnter = p;
  for (const p of seq) {
    // Anything struck before the last Enter has been committed and cleared.
    if (lastEnter && p.seq < lastEnter.seq) continue;
    const v = clamp01(1 - age(p, t) / 6);
    if (v > 0.04) maxTo(f, p.led, hsv(0.58, 0.8, Math.min(1, v * 0.9)));
  }
  if (lastEnter) {
    const a = age(lastEnter, t);
    if (a < 0.8) {
      // The wipe travels right to left, the way the carriage used to.
      const x = BOARD_W - (a / 0.8) * (BOARD_W + 4);
      for (const [led, g] of LED_GEO) {
        const v = (1 - a / 0.8) * Math.exp(-((g.ux - x) ** 2) / 2.5);
        if (v < 0.05) continue;
        addTo(f, led, hsv(0.42, 0.7, Math.min(1, v)));
      }
    }
  }
  return f;
};

/** Digits drive a bar on the number row; letters barely register. */
export const numeric: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const digits = LED_BY_NAME;
  let value = 0, lit = 0;
  for (const p of presses) {
    if (classOf(p) !== 'digit') continue;
    const v = Math.exp(-age(p, t) * 0.9);
    if (v < 0.05) continue;
    const d = Number(p.code.replace('Digit', ''));
    if (Number.isFinite(d) && v > lit) { value = d; lit = v; }
  }
  const level = lit > 0 ? (value === 0 ? 1 : value / 9) * lit : 0;
  for (const [led, g] of LED_GEO) {
    f.set(led, g.ux / BOARD_W <= level ? hsv(0.12, 0.9, 0.2 + level * 0.6) : [2, 2, 5]);
  }
  for (let d = 0; d <= 9; d++) {
    const led = digits.get(String(d));
    if (led !== undefined) maxTo(f, led, hsv(0.12, 0.7, 0.22));
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 4);
    if (v < 0.05) continue;
    maxTo(f, p.led, classOf(p) === 'digit'
      ? hsv(0.12, 0.2, Math.min(1, v))
      : hsv(0.6, 0.8, Math.min(1, v * 0.55)));
  }
  return f;
};

/** Punctuation throws sparks. Letters just glow. */
export const punctSpark: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = classOf(p);
    const a = age(p, t);
    if (c !== 'punct') {
      const v = Math.exp(-a * 2.2) * 0.6;
      if (v > 0.05) maxTo(f, p.led, hsv(0.58, 0.75, Math.min(1, v)));
      continue;
    }
    if (a > 1.1) continue;
    const env = 1 - a / 1.1;
    maxTo(f, p.led, hsv(0.85, 0.4, Math.min(1, env)));
    // Six sparks on fixed bearings — deterministic, but seeded off the
    // press so two punctuation marks do not throw the identical pattern.
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6 + p.hue) * Math.PI * 2;
      const r = a * (9 + (k % 3) * 3);
      blob(f, p.ux + Math.cos(ang) * r, p.uy + Math.sin(ang) * r / ROW_SCALE,
        0.65, 0.85 - k * 0.02, env * 0.9);
    }
  }
  return f;
};

/** Arrows and the nav cluster steer a cursor around the board. */
export const navSteer: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  let x = BOARD_W / 2, y = (BOARD_H - 1) / 2;
  for (const p of inOrder(presses)) {
    switch (p.code) {
      case 'ArrowLeft': x -= 2; break;
      case 'ArrowRight': x += 2; break;
      case 'ArrowUp': y -= 1; break;
      case 'ArrowDown': y += 1; break;
      case 'Home': x = 0; break;
      case 'End': x = BOARD_W; break;
      case 'PageUp': y = 0; break;
      case 'PageDown': y = BOARD_H - 1; break;
      default: continue;
    }
    x = Math.max(0, Math.min(BOARD_W, x));
    y = Math.max(0, Math.min(BOARD_H - 1, y));
  }
  for (const led of ALL_LEDS) f.set(led, [2, 2, 6]);
  blob(f, x, y, 1.5, 0.33, 0.95);
  // Non-nav keys still answer, so the board is not dead while you type prose.
  for (const p of presses) {
    if (classOf(p) === 'nav') continue;
    const v = Math.exp(-age(p, t) * 4);
    if (v > 0.05) maxTo(f, p.led, hsv(0.62, 0.8, Math.min(1, v * 0.75)));
  }
  return f;
};

/** An editor's palette: identifiers, numbers, operators, control keys. */
export const syntax: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = clamp01(1 - age(p, t) / 4);
    if (v < 0.04) continue;
    const c = classOf(p);
    // Saturation carries the distinction as much as hue does: control keys
    // read as near-white, the way a caret does against syntax colouring.
    const sat = c === 'enter' || c === 'back' || c === 'mod' ? 0.15 : 0.9;
    maxTo(f, p.led, hsv(CLASS_HUE[c], sat, Math.min(1, v)));
  }
  return f;
};

/** Vowels swell warm and wide; consonants stay tight and cold. */
export const vowelTide: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const a = age(p, t);
    const vowel = isVowel(p);
    const env = Math.exp(-a * (vowel ? 1.1 : 3.4));
    if (env < 0.04) continue;
    if (vowel) blob(f, p.ux, p.uy, 1.4 + a * 2.4, 0.06, env * 0.95, 0.8);
    else maxTo(f, p.led, hsv(0.56, 0.9, Math.min(1, env)));
  }
  return f;
};
