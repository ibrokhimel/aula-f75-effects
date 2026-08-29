/**
 * Release effects — the key-*up* is the event.
 *
 * The Hold family builds while a key is down and treats release as an
 * ending. This family inverts that: holding is the quiet part, and letting
 * go is what the board answers. Every effect here is dimmer under a held
 * finger than it is a moment after you lift it, and most scale the answer
 * by how long you held on.
 */

import {
  ALL_LEDS, LED_GEO, type Frame, type ReactiveFn,
  ROW_SCALE, addTo, blob, clamp01, heldFor, hsv, isHeld, maxTo, newestFirst, sinceUp,
} from './core';

/** Hold length that counts as "fully wound up", in seconds. */
const FULL = 1.2;

/** A held key shows only this much — enough to see, not enough to be the effect. */
const IDLE = 0.16;

/** Wind-up from how long the key was down, 0..1. */
const wound = (held: number) => clamp01(held / FULL);

/** Nothing while you hold it, a hard snap the instant you let go. */
export const snap: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    if (isHeld(p, t)) {
      maxTo(f, p.led, hsv(p.hue, 0.9, IDLE));
      continue;
    }
    const a = sinceUp(p, t);
    const v = Math.exp(-a * 9) * (0.45 + wound(heldFor(p, t)) * 0.55);
    if (v < 0.04) continue;
    maxTo(f, p.led, hsv(p.hue, 0.5, Math.min(1, v)));
    // A tight flash on the neighbours makes the snap read as an event
    // rather than as the key merely getting brighter.
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW_SCALE);
      const s = v * Math.exp(-(d * d) / 1.1) * 0.7;
      if (s < 0.05) continue;
      addTo(f, led, hsv(p.hue, 0.8, Math.min(1, s)));
    }
  }
  return f;
};

/** Letting go fires a ring, and a longer hold throws it further. */
export const recoil: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    if (isHeld(p, t)) { maxTo(f, p.led, hsv(0.02, 0.9, IDLE)); continue; }
    const a = sinceUp(p, t);
    if (a > 1.3) continue;
    const w = wound(heldFor(p, t));
    const r = a * (8 + w * 30);
    const env = (1 - a / 1.3) * (0.35 + w * 0.65);
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW_SCALE);
      const v = env * Math.exp(-((d - r) ** 2) / (1.2 + w * 3));
      if (v < 0.05) continue;
      addTo(f, led, hsv(0.02 + w * 0.12, 0.9, Math.min(1, v)));
    }
  }
  return f;
};

/** Dark under the finger, then it blooms open. */
export const bloom: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    if (isHeld(p, t)) continue;
    const a = sinceUp(p, t);
    if (a > 1.6) continue;
    const w = wound(heldFor(p, t));
    // The petal spreads and fades at once, so it opens rather than expands.
    const radius = 0.8 + a * (2.2 + w * 3);
    const env = Math.exp(-a * 2.2) * (0.4 + w * 0.6);
    blob(f, p.ux, p.uy, radius, p.hue, env);
  }
  return f;
};

/** The key overshoots past full brightness, then settles back. */
export const springBack: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    if (isHeld(p, t)) { maxTo(f, p.led, hsv(p.hue, 0.9, IDLE)); continue; }
    const a = sinceUp(p, t);
    if (a > 2) continue;
    const w = wound(heldFor(p, t));
    // A damped oscillation: the further it was wound, the harder it rings.
    const ring = Math.exp(-a * 3) * Math.cos(a * (14 + w * 12));
    const v = clamp01(0.5 + ring * (0.5 + w * 0.5));
    if (v < 0.05) continue;
    maxTo(f, p.led, hsv(p.hue, 0.85, Math.min(1, v * Math.exp(-a * 1.4))));
  }
  return f;
};

/** On release the light falls off the key and down the board. */
export const dropOff: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    if (isHeld(p, t)) { maxTo(f, p.led, hsv(0.55, 0.8, IDLE)); continue; }
    const a = sinceUp(p, t);
    if (a > 1.5) continue;
    const w = wound(heldFor(p, t));
    // Gravity: distance grows with the square of time since release.
    const y = p.uy + a * a * (9 + w * 14);
    const env = (1 - a / 1.5) * (0.45 + w * 0.55);
    blob(f, p.ux, y, 0.85, 0.55 + w * 0.2, env);
  }
  return f;
};

/** Letting go leaves a stain, and a long hold stains harder. */
export const residue: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    if (isHeld(p, t)) { maxTo(f, p.led, hsv(0.75, 0.7, IDLE * 0.6)); continue; }
    const w = wound(heldFor(p, t));
    const v = Math.exp(-sinceUp(p, t) / (0.7 + w * 2.6)) * (0.3 + w * 0.7);
    if (v < 0.04) continue;
    maxTo(f, p.led, hsv(0.75 + w * 0.15, 0.85, Math.min(1, v)));
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW_SCALE);
      const s = v * w * Math.exp(-(d * d) / 2.2) * 0.6;
      if (s < 0.05) continue;
      addTo(f, led, hsv(0.78, 0.8, Math.min(1, s)));
    }
  }
  return f;
};

/** A soft puff of air pushed out of the key when it comes up. */
export const exhale: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    if (isHeld(p, t)) continue;
    const a = sinceUp(p, t);
    if (a > 2.2) continue;
    const w = wound(heldFor(p, t));
    const env = Math.exp(-a * 1.6) * (0.35 + w * 0.65);
    // Three staggered shells rather than one ring: it reads as breath
    // rather than as a shockwave.
    for (let k = 0; k < 3; k++) {
      const r = (a - k * 0.12) * (4 + w * 6);
      if (r < 0) continue;
      for (const [led, g] of LED_GEO) {
        const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW_SCALE);
        const v = env * (1 - k * 0.28) * Math.exp(-((d - r) ** 2) / (2.5 + r));
        if (v < 0.05) continue;
        addTo(f, led, hsv(0.5, 0.45, Math.min(1, v)));
      }
    }
  }
  return f;
};

/** A tap releases sharp and narrow; a long hold releases soft and wide. */
export const staccato: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    if (isHeld(p, t)) { maxTo(f, p.led, hsv(0.16, 0.9, IDLE)); continue; }
    const a = sinceUp(p, t);
    const w = wound(heldFor(p, t));
    // Short holds decay fast and stay on their own key; long holds decay
    // slowly and spread. Same event, opposite character.
    const env = Math.exp(-a * (12 - w * 10)) * (0.5 + w * 0.5);
    if (env < 0.04) continue;
    blob(f, p.ux, p.uy, 0.55 + w * 2.6, 0.16 - w * 0.14, env, 0.9 - w * 0.4);
  }
  return f;
};

/** Hold a set of keys, then release: they unlatch in the order you let go. */
export const unlatch: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const released = newestFirst(presses.filter((p) => !isHeld(p, t)))
    .sort((a, b) => (b.release ?? 0) - (a.release ?? 0));
  for (const p of presses) {
    if (isHeld(p, t)) maxTo(f, p.led, hsv(0.08, 0.9, IDLE + 0.06));
  }
  released.forEach((p, i) => {
    const a = sinceUp(p, t);
    if (a > 1.4) return;
    // Each key further back in the release order fires a beat later, so a
    // chord comes apart as a run rather than all at once.
    const delay = i * 0.07;
    const e = a - delay;
    if (e < 0) return;
    // A latch you held open a long time lets go harder than one you tapped.
    const w = wound(heldFor(p, t));
    const v = Math.exp(-e * 4) * clamp01(1 - i / 8) * (0.45 + w * 0.55);
    if (v < 0.05) return;
    maxTo(f, p.led, hsv(0.08 + i * 0.05, 0.85, Math.min(1, v)));
    for (const led of ALL_LEDS) {
      const g = LED_GEO.get(led);
      if (!g) continue;
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW_SCALE);
      const s = v * Math.exp(-((d - e * 9) ** 2) / 2) * 0.55;
      if (s < 0.05) continue;
      addTo(f, led, hsv(0.08 + i * 0.05, 0.8, Math.min(1, s)));
    }
  });
  return f;
};
