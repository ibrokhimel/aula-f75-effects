/**
 * Reactive effect registry. Keys are stable identifiers used by the UI.
 */

import type { ReactiveDef } from './core';
import * as point from './point';
import * as hold from './hold';
import * as chords from './chords';
import * as ripples from './ripples';
import * as sweeps from './sweeps';
import * as particles from './particles';
import * as field from './field';
import * as reveal from './reveal';
import * as chain from './chain';
import * as spread from './spread';

export * from './core';

export const REACTIVE: Record<string, ReactiveDef> = {
  // ── Point ─────────────────────────────────────────────────────────────
  fade: { name: 'Fade Out', category: 'Point', fn: point.fadeOut },
  held: { name: 'While Held', category: 'Point', fn: point.whileHeld },
  huecycle: { name: 'Hue Cycle', category: 'Point', fn: point.hueCycle },
  blink: { name: 'Blink', category: 'Point', fn: point.blink },
  pulse: { name: 'Pulse', category: 'Point', fn: point.pulse },
  whitehot: { name: 'White Hot', category: 'Point', fn: point.whiteHot },
  spark: { name: 'Spark', category: 'Point', fn: point.spark },
  charge: { name: 'Charge Hold', category: 'Point', fn: point.chargeHold },
  inverted: { name: 'Inverted', category: 'Point', fn: point.inverted },
  stamp: { name: 'Stamp', category: 'Point', fn: point.stamp },
  additive: { name: 'Additive', category: 'Point', fn: point.additive },
  confettikey: { name: 'Confetti Key', category: 'Point', fn: point.confettiKey },
  breathbase: { name: 'Breathing Base', category: 'Point', fn: point.breathBase },

  // ── Hold ──────────────────────────────────────────────────────────────
  sustain: { name: 'Sustain', category: 'Hold', fn: hold.sustain },
  growring: { name: 'Grow Ring', category: 'Hold', fn: hold.growRing },
  chargeburst: { name: 'Charge Burst', category: 'Hold', fn: hold.chargeBurst },
  holdpulse: { name: 'Hold Pulse', category: 'Hold', fn: hold.holdPulse },
  heatbuild: { name: 'Heat Build', category: 'Hold', fn: hold.heatBuild },
  meter: { name: 'Hold Meter', category: 'Hold', fn: hold.meter },
  spin: { name: 'Spin Up', category: 'Hold', fn: hold.spin },
  flame: { name: 'Flame', category: 'Hold', fn: hold.flame },
  emitter: { name: 'Emitter', category: 'Hold', fn: hold.emitter },
  overload: { name: 'Overload', category: 'Hold', fn: hold.overload },
  anchor: { name: 'Anchor', category: 'Hold', fn: hold.anchor },

  // ── Chord ─────────────────────────────────────────────────────────────
  chordlines: { name: 'Chord Lines', category: 'Chord', fn: chords.chordLines },
  chordfill: { name: 'Chord Fill', category: 'Chord', fn: chords.chordFill },
  siphon: { name: 'Siphon', category: 'Chord', fn: chords.siphon },
  repel: { name: 'Repel', category: 'Chord', fn: chords.repel },
  vine: { name: 'Vine', category: 'Chord', fn: chords.vine },
  freeze: { name: 'Freeze', category: 'Chord', fn: chords.freeze },
  tug: { name: 'Tug', category: 'Chord', fn: chords.tug },
  magnetise: { name: 'Magnetise', category: 'Chord', fn: chords.magnetise },
  bridge: { name: 'Bridge', category: 'Chord', fn: chords.bridge },
  fieldlines: { name: 'Field Lines', category: 'Chord', fn: chords.fieldLines },

  // ── Ripple ────────────────────────────────────────────────────────────
  ripple: { name: 'Ripple', category: 'Ripple', fn: ripples.ripple },
  rippletriple: { name: 'Triple Ripple', category: 'Ripple', fn: ripples.rippleTriple },
  ripplesquare: { name: 'Square Ripple', category: 'Ripple', fn: ripples.rippleSquare },
  ripplediamond: { name: 'Diamond Ripple', category: 'Ripple', fn: ripples.rippleDiamond },
  ripplerainbow: { name: 'Rainbow Ripple', category: 'Ripple', fn: ripples.rippleRainbow },
  rippleinward: { name: 'Inward Ripple', category: 'Ripple', fn: ripples.rippleInward },
  rippleswell: { name: 'Swell', category: 'Ripple', fn: ripples.rippleSwell },
  rippleinterf: { name: 'Interference', category: 'Ripple', fn: ripples.rippleInterference },
  rippleecho: { name: 'Echo Ripple', category: 'Ripple', fn: ripples.rippleEcho },

  // ── Sweep ─────────────────────────────────────────────────────────────
  rowflash: { name: 'Row Flash', category: 'Sweep', fn: sweeps.rowFlash },
  colflash: { name: 'Column Flash', category: 'Sweep', fn: sweeps.colFlash },
  crossflash: { name: 'Cross Flash', category: 'Sweep', fn: sweeps.crossFlash },
  sweepright: { name: 'Sweep Right', category: 'Sweep', fn: sweeps.sweepRight },
  sweepleft: { name: 'Sweep Left', category: 'Sweep', fn: sweeps.sweepLeft },
  sweepsplit: { name: 'Split Sweep', category: 'Sweep', fn: sweeps.sweepSplit },
  sweepup: { name: 'Sweep Up', category: 'Sweep', fn: sweeps.sweepUp },
  sweepdiag: { name: 'Diagonal Sweep', category: 'Sweep', fn: sweeps.sweepDiagonal },
  laser: { name: 'Laser', category: 'Sweep', fn: sweeps.laser },
  boomerang: { name: 'Boomerang', category: 'Sweep', fn: sweeps.boomerang },
  rowdrain: { name: 'Row Drain', category: 'Sweep', fn: sweeps.rowDrain },

  // ── Particle ──────────────────────────────────────────────────────────
  splash: { name: 'Splash', category: 'Particle', fn: particles.splash },
  fountain: { name: 'Fountain', category: 'Particle', fn: particles.fountain },
  sparkleburst: { name: 'Sparkle Burst', category: 'Particle', fn: particles.sparkleBurst },
  emberfall: { name: 'Ember Fall', category: 'Particle', fn: particles.emberFall },
  firework: { name: 'Firework', category: 'Particle', fn: particles.firework },
  shrapnel: { name: 'Shrapnel', category: 'Particle', fn: particles.shrapnel },
  dust: { name: 'Dust', category: 'Particle', fn: particles.dust },
  drip: { name: 'Drip', category: 'Particle', fn: particles.drip },
  orbitkey: { name: 'Orbit', category: 'Particle', fn: particles.orbit },

  // ── Field ─────────────────────────────────────────────────────────────
  heatmap: { name: 'Heat Map', category: 'Field', fn: field.heatmap },
  globalflash: { name: 'Global Flash', category: 'Field', fn: field.globalFlash },
  huestep: { name: 'Hue Step', category: 'Field', fn: field.hueStep },
  shockwave: { name: 'Shockwave', category: 'Field', fn: field.shockwave },
  colourpick: { name: 'Colour Pick', category: 'Field', fn: field.colourPick },
  ink: { name: 'Ink', category: 'Field', fn: field.ink },
  keepalive: { name: 'Keep Alive', category: 'Field', fn: field.keepAlive },
  tempo: { name: 'Tempo', category: 'Field', fn: field.tempo },
  gravitywell: { name: 'Gravity Well', category: 'Field', fn: field.gravityWell },
  wearout: { name: 'Wear Out', category: 'Field', fn: field.wearOut },

  // ── Reveal ────────────────────────────────────────────────────────────
  revealplasma: { name: 'Reveal Plasma', category: 'Reveal', fn: reveal.revealPlasma },
  revealfire: { name: 'Reveal Fire', category: 'Reveal', fn: reveal.revealFire },
  revealrainbow: { name: 'Reveal Rainbow', category: 'Reveal', fn: reveal.revealRainbow },
  revealaurora: { name: 'Reveal Aurora', category: 'Reveal', fn: reveal.revealAurora },
  revealmatrix: { name: 'Reveal Matrix', category: 'Reveal', fn: reveal.revealMatrix },
  eraser: { name: 'Eraser', category: 'Reveal', fn: reveal.eraser },
  spotlight: { name: 'Spotlight', category: 'Reveal', fn: reveal.spotlight },
  burnin: { name: 'Burn In', category: 'Reveal', fn: reveal.burnIn },

  // ── Chain ─────────────────────────────────────────────────────────────
  link: { name: 'Link', category: 'Chain', fn: chain.link },
  constellation: { name: 'Constellation', category: 'Chain', fn: chain.constellation },
  trail: { name: 'Trail', category: 'Chain', fn: chain.trail },
  echo: { name: 'Echo', category: 'Chain', fn: chain.echo },
  combo: { name: 'Combo Meter', category: 'Chain', fn: chain.combo },
  relay: { name: 'Relay', category: 'Chain', fn: chain.relay },

  // ── Spread ────────────────────────────────────────────────────────────
  neighbourglow: { name: 'Neighbour Glow', category: 'Spread', fn: spread.neighbourGlow },
  blockpulse: { name: 'Block Pulse', category: 'Spread', fn: spread.blockPulse },
  flood: { name: 'Flood', category: 'Spread', fn: spread.flood },
  gridripple: { name: 'Grid Ripple', category: 'Spread', fn: spread.gridRipple },
  infect: { name: 'Infect', category: 'Spread', fn: spread.infect },
  quake: { name: 'Quake', category: 'Spread', fn: spread.quake },
};
