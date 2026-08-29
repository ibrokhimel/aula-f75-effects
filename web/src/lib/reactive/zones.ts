/**
 * Zone effects — the board as regions rather than as ninety keys.
 *
 * Every LED belongs to exactly one zone (see ZONES in core), so these can
 * talk about activity *moving* — out of the home row and into WASD, off the
 * letters and onto the arrows. The family's defining property: two presses
 * light the board differently depending on which region each landed in.
 */

import {
  ALL_LEDS, LED_GEO, NEIGHBOURS8, ZONE_CENTRE, ZONE_HUE, ZONE_NAMES, ZONE_OF,
  type Frame, type Press, type ReactiveFn, type ZoneName,
  ROW_SCALE, addTo, age, blob, clamp01, hsv, inOrder, latest, maxTo, segment,
  zoneMembers, zoneOf,
} from './core';

/** Members per zone, resolved once — zoneMembers walks the whole board. */
const MEMBERS = new Map<ZoneName, number[]>(
  ZONE_NAMES.map((z) => [z, zoneMembers(z)]),
);

/** Keys sitting on the edge of their zone — a neighbour belongs elsewhere. */
const BORDER = new Set(
  ALL_LEDS.filter((led) => (NEIGHBOURS8.get(led) ?? [])
    .some((n) => ZONE_OF.get(n) !== ZONE_OF.get(led))),
);

/** Decayed press count per zone — how warm each region is right now. */
function activity(presses: readonly Press[], t: number, life = 2.5) {
  const a = new Map<ZoneName, number>(ZONE_NAMES.map((z) => [z, 0]));
  for (const p of presses) {
    const z = zoneOf(p);
    a.set(z, (a.get(z) ?? 0) + Math.exp(-age(p, t) / life));
  }
  return a;
}

/** The zone you are working in lights up whole. */
export const zoneGlow: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const act = activity(presses, t, 1.8);
  for (const z of ZONE_NAMES) {
    const v = clamp01((act.get(z) ?? 0) * 0.7);
    if (v < 0.03) continue;
    const hue = ZONE_HUE.get(z) ?? 0;
    for (const led of MEMBERS.get(z) ?? []) {
      maxTo(f, led, hsv(hue, 0.85, Math.min(1, 0.12 + v * 0.88)));
    }
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 5);
    if (v > 0.05) maxTo(f, p.led, hsv(ZONE_HUE.get(zoneOf(p)) ?? 0, 0.25, Math.min(1, v)));
  }
  return f;
};

/** Each zone fills from its own edge in proportion to how much you use it. */
export const zoneMeter: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const act = activity(presses, t, 3.5);
  for (const led of ALL_LEDS) f.set(led, [2, 2, 5]);
  for (const z of ZONE_NAMES) {
    const members = MEMBERS.get(z) ?? [];
    if (!members.length) continue;
    const level = clamp01((act.get(z) ?? 0) / 5);
    if (level < 0.02) continue;
    // Fill the zone left to right by its own extent, so a small zone still
    // reads as a full bar rather than a single pixel.
    const xs = members.map((l) => LED_GEO.get(l)?.ux ?? 0);
    const lo = Math.min(...xs), hi = Math.max(...xs);
    const hue = ZONE_HUE.get(z) ?? 0;
    for (const led of members) {
      const g = LED_GEO.get(led);
      if (!g) continue;
      const u = hi > lo ? (g.ux - lo) / (hi - lo) : 0;
      if (u <= level) f.set(led, hsv(hue, 0.9, 0.15 + level * 0.7));
    }
  }
  return f;
};

/** Light flows out of the zone you left and into the one you moved to. */
export const handoff: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  let from: ZoneName | null = null, to: ZoneName | null = null, at = 0;
  for (let i = 1; i < seq.length; i++) {
    const a = zoneOf(seq[i - 1]), b = zoneOf(seq[i]);
    if (a !== b) { from = a; to = b; at = seq[i].t; }
  }
  const last = latest(presses);
  if (last) {
    const hue = ZONE_HUE.get(zoneOf(last)) ?? 0;
    for (const led of MEMBERS.get(zoneOf(last)) ?? []) maxTo(f, led, hsv(hue, 0.85, 0.16));
  }
  if (from && to) {
    const a = Math.max(0, t - at);
    if (a < 1.2) {
      const u = a / 1.2;
      const s = ZONE_CENTRE.get(from)!, e = ZONE_CENTRE.get(to)!;
      segment(f, s.ux, s.uy, e.ux, e.uy, ZONE_HUE.get(to) ?? 0, (1 - u) * 0.45, 1.1);
      // A packet of light making the trip, so the direction is unambiguous.
      blob(f, s.ux + (e.ux - s.ux) * u, s.uy + (e.uy - s.uy) * u, 1.2,
        ZONE_HUE.get(to) ?? 0, 1 - u * 0.6);
    }
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 5);
    if (v > 0.05) maxTo(f, p.led, hsv(ZONE_HUE.get(zoneOf(p)) ?? 0, 0.3, Math.min(1, v)));
  }
  return f;
};

/** Zones claim board area against each other — the busiest one spreads. */
export const territory: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const act = activity(presses, t, 4);
  const claim = ZONE_NAMES.map((z) => ({
    z, w: 0.25 + (act.get(z) ?? 0), c: ZONE_CENTRE.get(z)!,
  }));
  for (const [led, g] of LED_GEO) {
    let best = claim[0], bestScore = -Infinity;
    for (const c of claim) {
      // Weighted Voronoi: an active zone reaches further into its
      // neighbours' ground than a quiet one.
      const d = Math.hypot(g.ux - c.c.ux, (g.uy - c.c.uy) * ROW_SCALE);
      const score = c.w / (1 + d * d * 0.06);
      if (score > bestScore) { bestScore = score; best = c; }
    }
    f.set(led, hsv(ZONE_HUE.get(best.z) ?? 0, 0.85, 0.06 + clamp01(bestScore) * 0.55));
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 5);
    if (v > 0.05) maxTo(f, p.led, hsv(ZONE_HUE.get(zoneOf(p)) ?? 0, 0.2, Math.min(1, v)));
  }
  return f;
};

/** A ripple that stops at the zone border instead of crossing it. */
export const zoneWave: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const a = age(p, t);
    if (a > 1.2) continue;
    const z = zoneOf(p);
    const hue = ZONE_HUE.get(z) ?? 0;
    const r = a * 9;
    const env = 1 - a / 1.2;
    for (const led of MEMBERS.get(z) ?? []) {
      const g = LED_GEO.get(led);
      if (!g) continue;
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW_SCALE);
      const v = env * Math.exp(-((d - r) ** 2) / 2);
      if (v < 0.05) continue;
      addTo(f, led, hsv(hue, 0.85, Math.min(1, v)));
    }
    maxTo(f, p.led, hsv(hue, 0.5, Math.min(1, env)));
  }
  return f;
};

/** The gaming cluster runs hot and everything else falls away. */
export const wasdMode: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const led of ALL_LEDS) f.set(led, [2, 2, 4]);
  for (const led of MEMBERS.get('wasd') ?? []) maxTo(f, led, hsv(0.02, 0.9, 0.3));
  for (const led of MEMBERS.get('mods') ?? []) maxTo(f, led, hsv(0.08, 0.9, 0.12));
  for (const p of presses) {
    const inCluster = zoneOf(p) === 'wasd';
    const v = Math.exp(-age(p, t) * (inCluster ? 2.2 : 6));
    if (v < 0.05) continue;
    if (inCluster) {
      maxTo(f, p.led, hsv(0.06, 0.35, Math.min(1, v)));
      blob(f, p.ux, p.uy, 1.7, 0.03, v * 0.7);
    } else {
      maxTo(f, p.led, hsv(0.55, 0.8, Math.min(1, v * 0.5)));
    }
  }
  return f;
};

/** The home row is home; wander off it and a thread follows you back. */
export const homeBase: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const home = ZONE_CENTRE.get('home')!;
  for (const led of MEMBERS.get('home') ?? []) maxTo(f, led, hsv(0.42, 0.85, 0.2));
  for (const p of presses) {
    const v = clamp01(1 - age(p, t) / 2.4);
    if (v < 0.05) continue;
    if (zoneOf(p) === 'home') {
      maxTo(f, p.led, hsv(0.42, 0.5, Math.min(1, v)));
      continue;
    }
    // Distance from home decides the colour: the further you have strayed,
    // the redder the thread that ties you back.
    const d = Math.hypot(p.ux - home.ux, (p.uy - home.uy) * ROW_SCALE);
    const far = clamp01(d / 9);
    segment(f, p.ux, p.uy, home.ux, home.uy, 0.42 - far * 0.42, v * 0.5, 0.6);
    maxTo(f, p.led, hsv(0.42 - far * 0.42, 0.9, Math.min(1, v)));
  }
  return f;
};

/** The whole board washes with the blend of the zones you are using. */
export const zoneBlend: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const act = activity(presses, t, 5);
  let total = 0;
  for (const z of ZONE_NAMES) total += act.get(z) ?? 0;
  for (const [led, g] of LED_GEO) {
    let r = 0, gr = 0, b = 0;
    for (const z of ZONE_NAMES) {
      const w = (act.get(z) ?? 0) / (total || 1);
      if (w < 0.01) continue;
      // Each zone tints strongest near its own centre, so the blend still
      // has geography rather than being one flat average.
      const c = ZONE_CENTRE.get(z)!;
      const d = Math.hypot(g.ux - c.ux, (g.uy - c.uy) * ROW_SCALE);
      const k = w * (0.35 + 0.65 * Math.exp(-(d * d) / 40));
      const [cr, cg, cb] = hsv(ZONE_HUE.get(z) ?? 0, 0.9, 1);
      r += cr * k; gr += cg * k; b += cb * k;
    }
    const lift = total > 0 ? 0.85 : 0;
    f.set(led, [
      Math.min(255, Math.round(r * lift) + 3),
      Math.min(255, Math.round(gr * lift) + 3),
      Math.min(255, Math.round(b * lift) + 6),
    ]);
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 5);
    if (v > 0.05) maxTo(f, p.led, hsv(ZONE_HUE.get(zoneOf(p)) ?? 0, 0.2, Math.min(1, v)));
  }
  return f;
};

/** Crossing from one region into another lights the frontier between them. */
export const borderPatrol: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    const za = zoneOf(a), zb = zoneOf(b);
    if (za === zb) continue;
    const v = clamp01(1 - age(b, t) / 1.5);
    if (v < 0.05) continue;
    // Only the border keys of the two zones involved, so the crossing is
    // drawn as a frontier rather than as two lit blocks.
    for (const z of [za, zb]) {
      const hue = ZONE_HUE.get(z) ?? 0;
      for (const led of MEMBERS.get(z) ?? []) {
        if (!BORDER.has(led)) continue;
        addTo(f, led, hsv(hue, 0.9, Math.min(1, v * 0.8)));
      }
    }
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 4);
    if (v > 0.05) maxTo(f, p.led, hsv(ZONE_HUE.get(zoneOf(p)) ?? 0, 0.5, Math.min(1, v)));
  }
  return f;
};
