/**
 * Reactive effect registry. Keys are stable identifiers used by the UI.
 */

import { MEMORY_WINDOW, type ReactiveDef } from './core';
import * as point from './point';
import * as hold from './hold';
import * as holdGrowth from './hold-growth';
import * as holdCharge from './hold-charge';
import * as holdMaterial from './hold-material';
import * as chords from './chords';
import * as ripples from './ripples';
import * as sweeps from './sweeps';
import * as particles from './particles';
import * as field from './field';
import * as reveal from './reveal';
import * as chain from './chain';
import * as spread from './spread';
import * as sequence from './sequence';
import * as rhythm from './rhythm';
import * as gesture from './gesture';
import * as release from './release';
import * as semantic from './semantic';
import * as zones from './zones';
import * as modifiers from './modifiers';
import * as memory from './memory';
import * as intensity from './intensity';
import * as idle from './idle';

export * from './core';

/** Memory effects all want the long horizon; spelled once rather than ten times. */
const remembers = (name: string, fn: ReactiveDef['fn']): ReactiveDef =>
  ({ name, category: 'Memory', fn, window: MEMORY_WINDOW });

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

  growsquare: { name: 'Grow Square', category: 'Hold', fn: holdGrowth.growSquare },
  growdiamond: { name: 'Grow Diamond', category: 'Hold', fn: holdGrowth.growDiamond },
  growcolumn: { name: 'Grow Column', category: 'Hold', fn: holdGrowth.growColumn },
  growrow: { name: 'Grow Row', category: 'Hold', fn: holdGrowth.growRow },
  growspiral: { name: 'Grow Spiral', category: 'Hold', fn: holdGrowth.growSpiral },
  growcone: { name: 'Grow Cone', category: 'Hold', fn: holdGrowth.growCone },
  columnfill: { name: 'Column Fill', category: 'Hold', fn: holdGrowth.columnFill },
  rowfill: { name: 'Row Fill', category: 'Hold', fn: holdGrowth.rowFill },
  radialfill: { name: 'Radial Fill', category: 'Hold', fn: holdGrowth.radialFill },
  clockfill: { name: 'Clock Fill', category: 'Hold', fn: holdGrowth.clockFill },

  chargelightning: { name: 'Charge Lightning', category: 'Hold', fn: holdCharge.chargeLightning },
  chargenova: { name: 'Charge Nova', category: 'Hold', fn: holdCharge.chargeNova },
  chargechain: { name: 'Charge Chain', category: 'Hold', fn: holdCharge.chargeChain },
  chargerecoil: { name: 'Charge Recoil', category: 'Hold', fn: holdCharge.chargeRecoil },
  chargeimplode: { name: 'Charge Implode', category: 'Hold', fn: holdCharge.chargeImplode },
  holdstrobe: { name: 'Hold Strobe', category: 'Hold', fn: holdCharge.holdStrobe },
  holdwobble: { name: 'Hold Wobble', category: 'Hold', fn: holdCharge.holdWobble },
  holdsiren: { name: 'Hold Siren', category: 'Hold', fn: holdCharge.holdSiren },
  holdtremolo: { name: 'Hold Tremolo', category: 'Hold', fn: holdCharge.holdTremolo },
  holdvibrato: { name: 'Hold Vibrato', category: 'Hold', fn: holdCharge.holdVibrato },

  holdmelt: { name: 'Melt', category: 'Hold', fn: holdMaterial.holdMelt },
  holdcrack: { name: 'Crack', category: 'Hold', fn: holdMaterial.holdCrack },
  holdrust: { name: 'Rust', category: 'Hold', fn: holdMaterial.holdRust },
  holdbloom: { name: 'Petals', category: 'Hold', fn: holdMaterial.holdBloom },
  holdmagma: { name: 'Magma', category: 'Hold', fn: holdMaterial.holdMagma },
  holdsmoke: { name: 'Smoke', category: 'Hold', fn: holdMaterial.holdSmoke },
  holdportal: { name: 'Portal', category: 'Hold', fn: holdMaterial.holdPortal },
  holdbeam: { name: 'Beam Charge', category: 'Hold', fn: holdMaterial.holdBeamCharge },
  holdshield: { name: 'Shield', category: 'Hold', fn: holdMaterial.holdShield },
  holdwarp: { name: 'Warp', category: 'Hold', fn: holdMaterial.holdWarp },

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

  // ── Sequence ──────────────────────────────────────────────────────────
  march: { name: 'Order March', category: 'Sequence', fn: sequence.march },
  runlength: { name: 'Run Length', category: 'Sequence', fn: sequence.runLength },
  bigram: { name: 'Bigram', category: 'Sequence', fn: sequence.bigram },
  phrase: { name: 'Phrase Lock', category: 'Sequence', fn: sequence.phrase },
  palindrome: { name: 'Palindrome', category: 'Sequence', fn: sequence.palindrome },
  alternate: { name: 'Alternation', category: 'Sequence', fn: sequence.alternate },
  rewind: { name: 'Rewind', category: 'Sequence', fn: sequence.rewind },
  ladder: { name: 'Ladder', category: 'Sequence', fn: sequence.ladder },
  combolock: { name: 'Combo Lock', category: 'Sequence', fn: sequence.comboLock },

  // ── Rhythm ────────────────────────────────────────────────────────────
  metronome: { name: 'Metronome', category: 'Rhythm', fn: rhythm.metronome },
  burst: { name: 'Burst', category: 'Rhythm', fn: rhythm.burst },
  swing: { name: 'Swing', category: 'Rhythm', fn: rhythm.swing },
  beatgrid: { name: 'Beat Grid', category: 'Rhythm', fn: rhythm.beatGrid },
  pulsewave: { name: 'Pulse Wave', category: 'Rhythm', fn: rhythm.pulseWave },
  strobe: { name: 'Strobe', category: 'Rhythm', fn: rhythm.strobe },
  anticipate: { name: 'Anticipate', category: 'Rhythm', fn: rhythm.anticipate },
  groove: { name: 'Groove', category: 'Rhythm', fn: rhythm.groove },
  drumline: { name: 'Drumline', category: 'Rhythm', fn: rhythm.drumline },

  // ── Gesture ───────────────────────────────────────────────────────────
  swipe: { name: 'Swipe', category: 'Gesture', fn: gesture.swipe },
  arc: { name: 'Arc', category: 'Gesture', fn: gesture.arc },
  zigzag: { name: 'Zigzag', category: 'Gesture', fn: gesture.zigzag },
  circle: { name: 'Circle', category: 'Gesture', fn: gesture.circle },
  vector: { name: 'Vector', category: 'Gesture', fn: gesture.vector },
  smear: { name: 'Smear', category: 'Gesture', fn: gesture.smear },
  momentum: { name: 'Momentum', category: 'Gesture', fn: gesture.momentum },
  compass: { name: 'Compass', category: 'Gesture', fn: gesture.compass },
  scribble: { name: 'Scribble', category: 'Gesture', fn: gesture.scribble },

  // ── Release ───────────────────────────────────────────────────────────
  snap: { name: 'Snap', category: 'Release', fn: release.snap },
  recoil: { name: 'Recoil', category: 'Release', fn: release.recoil },
  bloom: { name: 'Bloom', category: 'Release', fn: release.bloom },
  springback: { name: 'Spring Back', category: 'Release', fn: release.springBack },
  dropoff: { name: 'Drop Off', category: 'Release', fn: release.dropOff },
  residue: { name: 'Residue', category: 'Release', fn: release.residue },
  exhale: { name: 'Exhale', category: 'Release', fn: release.exhale },
  staccato: { name: 'Staccato', category: 'Release', fn: release.staccato },
  unlatch: { name: 'Unlatch', category: 'Release', fn: release.unlatch },

  // ── Semantic ──────────────────────────────────────────────────────────
  classcolour: { name: 'Class Colour', category: 'Semantic', fn: semantic.classColour },
  wordflow: { name: 'Word Flow', category: 'Semantic', fn: semantic.wordFlow },
  backspaceeats: { name: 'Backspace Eats', category: 'Semantic', fn: semantic.backspaceEats },
  entercommit: { name: 'Enter Commit', category: 'Semantic', fn: semantic.enterCommit },
  numeric: { name: 'Numeric', category: 'Semantic', fn: semantic.numeric },
  punctspark: { name: 'Punctuation Spark', category: 'Semantic', fn: semantic.punctSpark },
  navsteer: { name: 'Nav Steer', category: 'Semantic', fn: semantic.navSteer },
  syntax: { name: 'Syntax', category: 'Semantic', fn: semantic.syntax },
  voweltide: { name: 'Vowel Tide', category: 'Semantic', fn: semantic.vowelTide },

  // ── Zones ─────────────────────────────────────────────────────────────
  zoneglow: { name: 'Zone Glow', category: 'Zones', fn: zones.zoneGlow },
  zonemeter: { name: 'Zone Meter', category: 'Zones', fn: zones.zoneMeter },
  handoff: { name: 'Handoff', category: 'Zones', fn: zones.handoff },
  territory: { name: 'Territory', category: 'Zones', fn: zones.territory },
  zonewave: { name: 'Zone Wave', category: 'Zones', fn: zones.zoneWave },
  wasdmode: { name: 'WASD Mode', category: 'Zones', fn: zones.wasdMode },
  homebase: { name: 'Home Base', category: 'Zones', fn: zones.homeBase },
  zoneblend: { name: 'Zone Blend', category: 'Zones', fn: zones.zoneBlend },
  borderpatrol: { name: 'Border Patrol', category: 'Zones', fn: zones.borderPatrol },

  // ── Modifiers ─────────────────────────────────────────────────────────
  modtint: { name: 'Mod Tint', category: 'Modifiers', fn: modifiers.modTint },
  shiftbloom: { name: 'Shift Bloom', category: 'Modifiers', fn: modifiers.shiftBloom },
  ctrlfreeze: { name: 'Ctrl Freeze', category: 'Modifiers', fn: modifiers.ctrlFreeze },
  altinvert: { name: 'Alt Invert', category: 'Modifiers', fn: modifiers.altInvert },
  modstack: { name: 'Mod Stack', category: 'Modifiers', fn: modifiers.modStack },
  shout: { name: 'Shout', category: 'Modifiers', fn: modifiers.shout },
  modlink: { name: 'Mod Link', category: 'Modifiers', fn: modifiers.modLink },
  amplify: { name: 'Amplify', category: 'Modifiers', fn: modifiers.amplify },

  // ── Memory ────────────────────────────────────────────────────────────
  patina: remembers('Patina', memory.patina),
  erosion: remembers('Erosion', memory.erosion),
  treerings: remembers('Tree Rings', memory.treeRings),
  sediment: remembers('Sediment', memory.sediment),
  familiarity: remembers('Familiarity', memory.familiarity),
  emberfield: remembers('Ember Field', memory.emberField),
  ghosttyping: remembers('Ghost Typing', memory.ghostTyping),
  evolve: remembers('Evolve', memory.evolve),
  recharge: remembers('Recharge', memory.recharge),

  // ── Intensity ─────────────────────────────────────────────────────────
  wpm: { name: 'Words Per Minute', category: 'Intensity', fn: intensity.wpm },
  redline: { name: 'Redline', category: 'Intensity', fn: intensity.redline },
  gearshift: { name: 'Gear Shift', category: 'Intensity', fn: intensity.gearShift },
  turbo: { name: 'Turbo', category: 'Intensity', fn: intensity.turbo },
  throttle: { name: 'Throttle', category: 'Intensity', fn: intensity.throttle },
  acceleration: { name: 'Acceleration', category: 'Intensity', fn: intensity.acceleration },
  pressure: { name: 'Pressure', category: 'Intensity', fn: intensity.pressure },
  stormfront: { name: 'Storm Front', category: 'Intensity', fn: intensity.stormFront },
  bloomrate: { name: 'Bloom Rate', category: 'Intensity', fn: intensity.bloomRate },

  // ── Idle ──────────────────────────────────────────────────────────────
  sleep: { name: 'Sleep', category: 'Idle', fn: idle.sleep },
  wake: { name: 'Wake', category: 'Idle', fn: idle.wake },
  settlingdust: { name: 'Settling Dust', category: 'Idle', fn: idle.settlingDust },
  slowbreath: { name: 'Slow Breath', category: 'Idle', fn: idle.slowBreath },
  countdown: { name: 'Countdown', category: 'Idle', fn: idle.countdown },
  hourglass: { name: 'Hourglass', category: 'Idle', fn: idle.hourglass },
  frost: { name: 'Frost', category: 'Idle', fn: idle.frost },
  heartbeat: { name: 'Heartbeat', category: 'Idle', fn: idle.heartbeat },
};
