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
const remembers = (name: string, description: string, fn: ReactiveDef['fn']): ReactiveDef =>
  ({ name, description, category: 'Memory', fn, window: MEMORY_WINDOW });

export const REACTIVE: Record<string, ReactiveDef> = {
  // ── Point ─────────────────────────────────────────────────────────────
  fade: { name: 'Fade Out', description: 'Key lights on press and fades out over ~0.9s', category: 'Point', fn: point.fadeOut },
  held: { name: 'While Held', description: 'Lit only while held — the most literal reading of "reactive"', category: 'Point', fn: point.whileHeld },
  huecycle: { name: 'Hue Cycle', description: 'Hue keeps cycling for as long as the trail lasts', category: 'Point', fn: point.hueCycle },
  blink: { name: 'Blink', description: 'Three quick blinks, then out', category: 'Point', fn: point.blink },
  pulse: { name: 'Pulse', description: 'Swells in, then out — softer than a hard flash', category: 'Point', fn: point.pulse },
  whitehot: { name: 'White Hot', description: 'White at the instant of contact, cooling into its own colour as it dies', category: 'Point', fn: point.whiteHot },
  spark: { name: 'Spark', description: 'A hard, bright flash with almost no tail', category: 'Point', fn: point.spark },
  charge: { name: 'Charge Hold', description: 'Charges the longer you hold, then discharges when you let go', category: 'Point', fn: point.chargeHold },
  inverted: { name: 'Inverted', description: 'The whole board is lit and presses punch holes in it', category: 'Point', fn: point.inverted },
  stamp: { name: 'Stamp', description: 'Each key keeps the colour of the last press for as long as it lasts', category: 'Point', fn: point.stamp },
  additive: { name: 'Additive', description: 'Two overlapping presses add toward white; a chord flares', category: 'Point', fn: point.additive },
  confettikey: { name: 'Confetti Key', description: 'Random per-press colour from a fixed arcade palette rather than a hue wheel', category: 'Point', fn: point.confettiKey },
  breathbase: { name: 'Breathing Base', description: 'Idle keys breathe faintly; pressing one snaps it to full', category: 'Point', fn: point.breathBase },

  // ── Hold ──────────────────────────────────────────────────────────────
  sustain: { name: 'Sustain', description: 'Steady while down, long tail after', category: 'Hold', fn: hold.sustain },
  growring: { name: 'Grow Ring', description: 'A ring that grows outward for as long as you hold, then snaps away', category: 'Hold', fn: hold.growRing },
  chargeburst: { name: 'Charge Burst', description: 'Charges while held; releasing fires a ripple as strong as the charge', category: 'Hold', fn: hold.chargeBurst },
  holdpulse: { name: 'Hold Pulse', description: 'Throbs faster the longer you hold it', category: 'Hold', fn: hold.holdPulse },
  heatbuild: { name: 'Heat Build', description: 'The key heats through red, orange, then white the longer it is down', category: 'Hold', fn: hold.heatBuild },
  meter: { name: 'Hold Meter', description: 'A bar across the board that fills for as long as you keep holding', category: 'Hold', fn: hold.meter },
  spin: { name: 'Spin Up', description: 'A mote orbiting the key, speeding up as the hold lengthens', category: 'Hold', fn: hold.spin },
  flame: { name: 'Flame', description: 'A flame that climbs the board above the key while you hold it', category: 'Hold', fn: hold.flame },
  emitter: { name: 'Emitter', description: 'Emits a fresh ripple at a steady rate for as long as the key is down', category: 'Hold', fn: hold.emitter },
  overload: { name: 'Overload', description: 'Builds toward a threshold; hold past it and the whole board goes off', category: 'Hold', fn: hold.overload },
  anchor: { name: 'Anchor', description: 'Held keys stay lit; the pattern you build persists until you let go', category: 'Hold', fn: hold.anchor },

  growsquare: { name: 'Grow Square', description: 'A square front that widens with the hold', category: 'Hold', fn: holdGrowth.growSquare },
  growdiamond: { name: 'Grow Diamond', description: 'A diamond front that widens the longer you hold', category: 'Hold', fn: holdGrowth.growDiamond },
  growcolumn: { name: 'Grow Column', description: 'The key\'s column lights outward, one row at a time', category: 'Hold', fn: holdGrowth.growColumn },
  growrow: { name: 'Grow Row', description: 'The key\'s row lights outward from the press', category: 'Hold', fn: holdGrowth.growRow },
  growspiral: { name: 'Grow Spiral', description: 'A spiral arm that unwinds further the longer you hold', category: 'Hold', fn: holdGrowth.growSpiral },
  growcone: { name: 'Grow Cone', description: 'A wedge that opens wider the longer you hold', category: 'Hold', fn: holdGrowth.growCone },
  columnfill: { name: 'Column Fill', description: 'The column below the key fills from the bottom up', category: 'Hold', fn: holdGrowth.columnFill },
  rowfill: { name: 'Row Fill', description: 'The row fills outward symmetrically, like a level meter', category: 'Hold', fn: holdGrowth.rowFill },
  radialfill: { name: 'Radial Fill', description: 'A solid disc that grows rather than a ring', category: 'Hold', fn: holdGrowth.radialFill },
  clockfill: { name: 'Clock Fill', description: 'A clock hand sweeping round the key; a full turn is a full charge', category: 'Hold', fn: holdGrowth.clockFill },

  chargelightning: { name: 'Charge Lightning', description: 'Bolts arc out to nearby keys once the charge is high enough', category: 'Hold', fn: holdCharge.chargeLightning },
  chargenova: { name: 'Charge Nova', description: 'Winds up quietly, then whites out the whole board on release', category: 'Hold', fn: holdCharge.chargeNova },
  chargechain: { name: 'Charge Chain', description: 'Letting go sends the charge hopping outward, key to key', category: 'Hold', fn: holdCharge.chargeChain },
  chargerecoil: { name: 'Charge Recoil', description: 'Compresses inward while held, then kicks back out', category: 'Hold', fn: holdCharge.chargeRecoil },
  chargeimplode: { name: 'Charge Implode', description: 'Pulls the board\'s light inward, then lets it snap back', category: 'Hold', fn: holdCharge.chargeImplode },
  holdstrobe: { name: 'Hold Strobe', description: 'Strobes, and the rate climbs with the hold', category: 'Hold', fn: holdCharge.holdStrobe },
  holdwobble: { name: 'Hold Wobble', description: 'The lit point wobbles, and the wobble widens with the hold', category: 'Hold', fn: holdCharge.holdWobble },
  holdsiren: { name: 'Hold Siren', description: 'Hue sweeps up and down like a siren, faster as it winds up', category: 'Hold', fn: holdCharge.holdSiren },
  holdtremolo: { name: 'Hold Tremolo', description: 'Amplitude tremolo that gets deeper the longer you hold', category: 'Hold', fn: holdCharge.holdTremolo },
  holdvibrato: { name: 'Hold Vibrato', description: 'Hue vibrato around the press colour, widening with the hold', category: 'Hold', fn: holdCharge.holdVibrato },

  holdmelt: { name: 'Melt', description: 'Colour runs down the board from the key like wet paint', category: 'Hold', fn: holdMaterial.holdMelt },
  holdcrack: { name: 'Crack', description: 'Fractures spread across the keys and stay where they land', category: 'Hold', fn: holdMaterial.holdCrack },
  holdrust: { name: 'Rust', description: 'Colour corrodes away from the key, desaturating as it goes', category: 'Hold', fn: holdMaterial.holdRust },
  holdbloom: { name: 'Petals', description: 'Petals open around the key as the hold lengthens', category: 'Hold', fn: holdMaterial.holdBloom },
  holdmagma: { name: 'Magma', description: 'A pool of magma widens under the key, crusting at its edge', category: 'Hold', fn: holdMaterial.holdMagma },
  holdsmoke: { name: 'Smoke', description: 'Smoke climbs and fans out above the key', category: 'Hold', fn: holdMaterial.holdSmoke },
  holdportal: { name: 'Portal', description: 'A ring portal widens, with a dark interior and a bright rim', category: 'Hold', fn: holdMaterial.holdPortal },
  holdbeam: { name: 'Beam Charge', description: 'The beam thickens while you charge, then fires across the board', category: 'Hold', fn: holdMaterial.holdBeamCharge },
  holdshield: { name: 'Shield', description: 'A faceted bubble forms around the key and holds', category: 'Hold', fn: holdMaterial.holdShield },
  holdwarp: { name: 'Warp', description: 'The whole board\'s gradient bends further toward the key the longer you hold', category: 'Hold', fn: holdMaterial.holdWarp },

  // ── Chord ─────────────────────────────────────────────────────────────
  chordlines: { name: 'Chord Lines', description: 'Draws a line between every pair of held keys', category: 'Chord', fn: chords.chordLines },
  chordfill: { name: 'Chord Fill', description: 'Fills the area enclosed by the held keys rather than just its edges', category: 'Chord', fn: chords.chordFill },
  siphon: { name: 'Siphon', description: 'The board is lit and drains into whatever you are holding', category: 'Chord', fn: chords.siphon },
  repel: { name: 'Repel', description: 'Pushes a dark bubble outward for as long as you hold', category: 'Chord', fn: chords.repel },
  vine: { name: 'Vine', description: 'Tendrils creep outward key by key for as long as you hold', category: 'Chord', fn: chords.vine },
  freeze: { name: 'Freeze', description: 'Ice creeps out from the held key and lingers after release', category: 'Chord', fn: chords.freeze },
  tug: { name: 'Tug', description: 'The whole board\'s gradient leans toward whatever is held', category: 'Chord', fn: chords.tug },
  magnetise: { name: 'Magnetise', description: 'Every key takes the colour of the nearest held key', category: 'Chord', fn: chords.magnetise },
  bridge: { name: 'Bridge', description: 'A pulse shuttles back and forth between the two most recent held keys', category: 'Chord', fn: chords.bridge },
  fieldlines: { name: 'Field Lines', description: 'Held keys behave like charges; brightness follows the summed field', category: 'Chord', fn: chords.fieldLines },

  // ── Ripple ────────────────────────────────────────────────────────────
  ripple: { name: 'Ripple', description: 'Concentric rings spreading from a wandering centre', category: 'Ripple', fn: ripples.ripple },
  rippletriple: { name: 'Triple Ripple', description: 'Three rings per press, staggered — a stone with a bigger splash', category: 'Ripple', fn: ripples.rippleTriple },
  ripplesquare: { name: 'Square Ripple', description: 'A square wavefront instead of a round one', category: 'Ripple', fn: ripples.rippleSquare },
  ripplediamond: { name: 'Diamond Ripple', description: 'A diamond-shaped wavefront spreading out', category: 'Ripple', fn: ripples.rippleDiamond },
  ripplerainbow: { name: 'Rainbow Ripple', description: 'Hue mapped to radius, so each ring is a small rainbow', category: 'Ripple', fn: ripples.rippleRainbow },
  rippleinward: { name: 'Inward Ripple', description: 'Starts wide and converges onto the key — reads as the board answering', category: 'Ripple', fn: ripples.rippleInward },
  rippleswell: { name: 'Swell', description: 'One slow, wide swell rather than a thin ring', category: 'Ripple', fn: ripples.rippleSwell },
  rippleinterf: { name: 'Interference', description: 'Two presses interfere: crests reinforce, troughs cancel', category: 'Ripple', fn: ripples.rippleInterference },
  rippleecho: { name: 'Echo Ripple', description: 'A ring that bounces off the board edges once', category: 'Ripple', fn: ripples.rippleEcho },

  // ── Sweep ─────────────────────────────────────────────────────────────
  rowflash: { name: 'Row Flash', description: 'The pressed key\'s physical row lights, brightest at the key', category: 'Sweep', fn: sweeps.rowFlash },
  colflash: { name: 'Column Flash', description: 'The whole column above and below the key lights up', category: 'Sweep', fn: sweeps.colFlash },
  crossflash: { name: 'Cross Flash', description: 'Row and column together — a plus centred on the key', category: 'Sweep', fn: sweeps.crossFlash },
  sweepright: { name: 'Sweep Right', description: 'Light runs rightward from the key, fading as it goes', category: 'Sweep', fn: sweeps.sweepRight },
  sweepleft: { name: 'Sweep Left', description: 'Light runs leftward from the key, fading as it goes', category: 'Sweep', fn: sweeps.sweepLeft },
  sweepsplit: { name: 'Split Sweep', description: 'Light travels both ways along the row from the key', category: 'Sweep', fn: sweeps.sweepSplit },
  sweepup: { name: 'Sweep Up', description: 'A wave running up the board from the pressed row', category: 'Sweep', fn: sweeps.sweepUp },
  sweepdiag: { name: 'Diagonal Sweep', description: 'A diagonal wavefront, leaning a different way each press', category: 'Sweep', fn: sweeps.sweepDiagonal },
  laser: { name: 'Laser', description: 'A hard beam fired to the nearer edge, leaving a fading track', category: 'Sweep', fn: sweeps.laser },
  boomerang: { name: 'Boomerang', description: 'Out to the edge and back again', category: 'Sweep', fn: sweeps.boomerang },
  rowdrain: { name: 'Row Drain', description: 'The row lights instantly, then drains away from the key', category: 'Sweep', fn: sweeps.rowDrain },

  // ── Particle ──────────────────────────────────────────────────────────
  splash: { name: 'Splash', description: 'Sprays outward and falls under gravity', category: 'Particle', fn: particles.splash },
  fountain: { name: 'Fountain', description: 'Shoots upward from the key and arcs back down', category: 'Particle', fn: particles.fountain },
  sparkleburst: { name: 'Sparkle Burst', description: 'Nearby keys twinkle at random rather than moving', category: 'Particle', fn: particles.sparkleBurst },
  emberfall: { name: 'Ember Fall', description: 'Embers drift down the board from the pressed key', category: 'Particle', fn: particles.emberFall },
  firework: { name: 'Firework', description: 'Rises, then bursts into a shell partway up the board', category: 'Particle', fn: particles.firework },
  shrapnel: { name: 'Shrapnel', description: 'Fast straight shards, no gravity — reads as an impact', category: 'Particle', fn: particles.shrapnel },
  dust: { name: 'Dust', description: 'Slow motes that hang around the key and fade', category: 'Particle', fn: particles.dust },
  drip: { name: 'Drip', description: 'Droplets run straight down the column below the key', category: 'Particle', fn: particles.drip },
  orbitkey: { name: 'Orbit', description: 'A single mote orbiting the pressed key as it fades', category: 'Particle', fn: particles.orbit },

  // ── Field ─────────────────────────────────────────────────────────────
  heatmap: { name: 'Heat Map', description: 'Recently-used keys glow; the map cools if you stop typing', category: 'Field', fn: field.heatmap },
  globalflash: { name: 'Global Flash', description: 'Every press flashes the whole board', category: 'Field', fn: field.globalFlash },
  huestep: { name: 'Hue Step', description: 'The board\'s hue advances a step with every keystroke', category: 'Field', fn: field.hueStep },
  shockwave: { name: 'Shockwave', description: 'Every press sends a ring rolling out across the whole board', category: 'Field', fn: field.shockwave },
  colourpick: { name: 'Colour Pick', description: 'Whole board takes the colour of the last key you hit', category: 'Field', fn: field.colourPick },
  ink: { name: 'Ink', description: 'Colour bleeds outward from each press and lingers, like ink in water', category: 'Field', fn: field.ink },
  keepalive: { name: 'Keep Alive', description: 'The board is lit and slowly goes dark; typing keeps it alive', category: 'Field', fn: field.keepAlive },
  tempo: { name: 'Tempo', description: 'Brightness and hue track how fast you are typing', category: 'Field', fn: field.tempo },
  gravitywell: { name: 'Gravity Well', description: 'A background gradient that bends toward wherever you last pressed', category: 'Field', fn: field.gravityWell },
  wearout: { name: 'Wear Out', description: 'Keys darken as you use them and slowly recover — an inverse heat map', category: 'Field', fn: field.wearOut },

  // ── Reveal ────────────────────────────────────────────────────────────
  revealplasma: { name: 'Reveal Plasma', description: 'Keys you touch reveal plasma drifting underneath', category: 'Reveal', fn: reveal.revealPlasma },
  revealfire: { name: 'Reveal Fire', description: 'Keys you touch reveal fire burning underneath', category: 'Reveal', fn: reveal.revealFire },
  revealrainbow: { name: 'Reveal Rainbow', description: 'Keys you touch reveal a rainbow underneath', category: 'Reveal', fn: reveal.revealRainbow },
  revealaurora: { name: 'Reveal Aurora', description: 'Keys you touch reveal an aurora underneath', category: 'Reveal', fn: reveal.revealAurora },
  revealmatrix: { name: 'Reveal Matrix', description: 'Keys you touch reveal Matrix rain underneath', category: 'Reveal', fn: reveal.revealMatrix },
  eraser: { name: 'Eraser', description: 'Inverse mask: the animation plays everywhere except where you type', category: 'Reveal', fn: reveal.eraser },
  spotlight: { name: 'Spotlight', description: 'A pool of light that follows the last key you hit', category: 'Reveal', fn: reveal.spotlight },
  burnin: { name: 'Burn In', description: 'The board is dark and each press burns a lasting hole of colour', category: 'Reveal', fn: reveal.burnIn },

  // ── Chain ─────────────────────────────────────────────────────────────
  link: { name: 'Link', description: 'Draws a line between each consecutive pair of keypresses', category: 'Chain', fn: chain.link },
  constellation: { name: 'Constellation', description: 'Recent presses stay lit like stars, dimming with age', category: 'Chain', fn: chain.constellation },
  trail: { name: 'Trail', description: 'A comet that walks the keys in the order you hit them', category: 'Chain', fn: chain.trail },
  echo: { name: 'Echo', description: 'Every press replays as a fading echo a beat later', category: 'Chain', fn: chain.echo },
  combo: { name: 'Combo Meter', description: 'The board reads as a run of typing: a bar grows while you keep going', category: 'Chain', fn: chain.combo },
  relay: { name: 'Relay', description: 'Each press hands its colour to the next one, so a phrase fades as a ramp', category: 'Chain', fn: chain.relay },

  // ── Spread ────────────────────────────────────────────────────────────
  neighbourglow: { name: 'Neighbour Glow', description: 'Immediate neighbours glow at a fraction of the pressed key', category: 'Spread', fn: spread.neighbourGlow },
  blockpulse: { name: 'Block Pulse', description: 'A 3x3 block pulses around the key', category: 'Spread', fn: spread.blockPulse },
  flood: { name: 'Flood', description: 'Light floods outward across the key grid, a ring of neighbours at a time', category: 'Spread', fn: spread.flood },
  gridripple: { name: 'Grid Ripple', description: 'A ring expanding key by key across the grid', category: 'Spread', fn: spread.gridRipple },
  infect: { name: 'Infect', description: 'Colour infects neighbours and keeps spreading — slow, and it takes over', category: 'Spread', fn: spread.infect },
  quake: { name: 'Quake', description: 'Neighbours jitter in brightness — the key rattles its surroundings', category: 'Spread', fn: spread.quake },

  // ── Sequence ──────────────────────────────────────────────────────────
  march: { name: 'Order March', description: 'A playhead walks the run in the order you typed it, over and over', category: 'Sequence', fn: sequence.march },
  runlength: { name: 'Run Length', description: 'Hitting the same key twice stacks; a different key resets the stack', category: 'Sequence', fn: sequence.runLength },
  bigram: { name: 'Bigram', description: 'Ordered pairs', category: 'Sequence', fn: sequence.bigram },
  phrase: { name: 'Phrase Lock', description: 'Type the same short phrase twice and it lights up as a phrase', category: 'Sequence', fn: sequence.phrase },
  palindrome: { name: 'Palindrome', description: 'Rewards a run that mirrors itself — abcba lights, abcde does not', category: 'Sequence', fn: sequence.palindrome },
  alternate: { name: 'Alternation', description: 'Alternating hands runs green; hammering one hand runs red', category: 'Sequence', fn: sequence.alternate },
  rewind: { name: 'Rewind', description: 'Stop typing and the run replays itself backwards', category: 'Sequence', fn: sequence.rewind },
  ladder: { name: 'Ladder', description: 'Each press becomes a rung one row above the press before it', category: 'Sequence', fn: sequence.ladder },
  combolock: { name: 'Combo Lock', description: 'A lock that advances while each press lands right of the last', category: 'Sequence', fn: sequence.comboLock },

  // ── Rhythm ────────────────────────────────────────────────────────────
  metronome: { name: 'Metronome', description: 'A tick that swings across the board at whatever tempo you are typing', category: 'Rhythm', fn: rhythm.metronome },
  burst: { name: 'Burst', description: 'Presses crowded into a moment set off a flare; even typing does not', category: 'Rhythm', fn: rhythm.burst },
  swing: { name: 'Swing', description: 'Long-short-long typing leans the board; even typing sits square', category: 'Rhythm', fn: rhythm.swing },
  beatgrid: { name: 'Beat Grid', description: 'On-beat presses stay green; presses off the beat go red', category: 'Rhythm', fn: rhythm.beatGrid },
  pulsewave: { name: 'Pulse Wave', description: 'A travelling wave whose frequency is however fast you are typing', category: 'Rhythm', fn: rhythm.pulseWave },
  strobe: { name: 'Strobe', description: 'The whole board flashes on your beat — and only if the beat is steady', category: 'Rhythm', fn: rhythm.strobe },
  anticipate: { name: 'Anticipate', description: 'Builds toward the moment your next press is due, then resets', category: 'Rhythm', fn: rhythm.anticipate },
  groove: { name: 'Groove', description: 'The last few gaps drawn as bars — your cadence, read left to right', category: 'Rhythm', fn: rhythm.groove },
  drumline: { name: 'Drumline', description: 'Each press lands in the column matching where it fell in the beat', category: 'Rhythm', fn: rhythm.drumline },

  // ── Gesture ───────────────────────────────────────────────────────────
  swipe: { name: 'Swipe', description: 'The direction you moved becomes a sweep across the whole board', category: 'Gesture', fn: gesture.swipe },
  arc: { name: 'Arc', description: 'Three presses define an arc; it is drawn through all three', category: 'Gesture', fn: gesture.arc },
  zigzag: { name: 'Zigzag', description: 'Doubling back on yourself throws a bolt between the two ends', category: 'Gesture', fn: gesture.zigzag },
  circle: { name: 'Circle', description: 'Move around the board in a loop and a ring closes as you come round', category: 'Gesture', fn: gesture.circle },
  vector: { name: 'Vector', description: 'An arrow from the last press through the current one, and beyond', category: 'Gesture', fn: gesture.vector },
  smear: { name: 'Smear', description: 'The path between the two presses smears, as if dragged', category: 'Gesture', fn: gesture.smear },
  momentum: { name: 'Momentum', description: 'A mote flung off in the direction you were moving, coasting to a stop', category: 'Gesture', fn: gesture.momentum },
  compass: { name: 'Compass', description: 'The whole board tilts a gradient toward the way you are travelling', category: 'Gesture', fn: gesture.compass },
  scribble: { name: 'Scribble', description: 'The whole recent path drawn as one continuous stroke', category: 'Gesture', fn: gesture.scribble },

  // ── Release ───────────────────────────────────────────────────────────
  snap: { name: 'Snap', description: 'Nothing while you hold it, a hard snap the instant you let go', category: 'Release', fn: release.snap },
  recoil: { name: 'Recoil', description: 'Letting go fires a ring, and a longer hold throws it further', category: 'Release', fn: release.recoil },
  bloom: { name: 'Bloom', description: 'Dark under the finger, then it blooms open', category: 'Release', fn: release.bloom },
  springback: { name: 'Spring Back', description: 'The key overshoots past full brightness, then settles back', category: 'Release', fn: release.springBack },
  dropoff: { name: 'Drop Off', description: 'On release the light falls off the key and down the board', category: 'Release', fn: release.dropOff },
  residue: { name: 'Residue', description: 'Letting go leaves a stain, and a long hold stains harder', category: 'Release', fn: release.residue },
  exhale: { name: 'Exhale', description: 'A soft puff of air pushed out of the key when it comes up', category: 'Release', fn: release.exhale },
  staccato: { name: 'Staccato', description: 'A tap releases sharp and narrow; a long hold releases soft and wide', category: 'Release', fn: release.staccato },
  unlatch: { name: 'Unlatch', description: 'Hold a set of keys, then release: they unlatch in the order you let go', category: 'Release', fn: release.unlatch },

  // ── Semantic ──────────────────────────────────────────────────────────
  classcolour: { name: 'Class Colour', description: 'Straight readout: every class gets its own colour', category: 'Semantic', fn: semantic.classColour },
  wordflow: { name: 'Word Flow', description: 'Letters build a word; Space or Enter commits it in a flash', category: 'Semantic', fn: semantic.wordFlow },
  backspaceeats: { name: 'Backspace Eats', description: 'Backspace really deletes: it eats the last press still on the board', category: 'Semantic', fn: semantic.backspaceEats },
  entercommit: { name: 'Enter Commit', description: 'Everything accumulates until Enter wipes the board clean', category: 'Semantic', fn: semantic.enterCommit },
  numeric: { name: 'Numeric', description: 'Digits drive a bar on the number row; letters barely register', category: 'Semantic', fn: semantic.numeric },
  punctspark: { name: 'Punctuation Spark', description: 'Punctuation throws sparks', category: 'Semantic', fn: semantic.punctSpark },
  navsteer: { name: 'Nav Steer', description: 'Arrows and the nav cluster steer a cursor around the board', category: 'Semantic', fn: semantic.navSteer },
  syntax: { name: 'Syntax', description: 'An editor\'s palette: identifiers, numbers, operators, control keys', category: 'Semantic', fn: semantic.syntax },
  voweltide: { name: 'Vowel Tide', description: 'Vowels swell warm and wide; consonants stay tight and cold', category: 'Semantic', fn: semantic.vowelTide },

  // ── Zones ─────────────────────────────────────────────────────────────
  zoneglow: { name: 'Zone Glow', description: 'The zone you are working in lights up whole', category: 'Zones', fn: zones.zoneGlow },
  zonemeter: { name: 'Zone Meter', description: 'Each zone fills from its own edge in proportion to how much you use it', category: 'Zones', fn: zones.zoneMeter },
  handoff: { name: 'Handoff', description: 'Light flows out of the zone you left and into the one you moved to', category: 'Zones', fn: zones.handoff },
  territory: { name: 'Territory', description: 'Zones claim board area against each other — the busiest one spreads', category: 'Zones', fn: zones.territory },
  zonewave: { name: 'Zone Wave', description: 'A ripple that stops at the zone border instead of crossing it', category: 'Zones', fn: zones.zoneWave },
  wasdmode: { name: 'WASD Mode', description: 'The gaming cluster runs hot and everything else falls away', category: 'Zones', fn: zones.wasdMode },
  homebase: { name: 'Home Base', description: 'The home row is home; wander off it and a thread follows you back', category: 'Zones', fn: zones.homeBase },
  zoneblend: { name: 'Zone Blend', description: 'The whole board washes with the blend of the zones you are using', category: 'Zones', fn: zones.zoneBlend },
  borderpatrol: { name: 'Border Patrol', description: 'Crossing from one region into another lights the frontier between them', category: 'Zones', fn: zones.borderPatrol },

  // ── Modifiers ─────────────────────────────────────────────────────────
  modtint: { name: 'Mod Tint', description: 'The plain press is blue; each modifier walks the hue somewhere else', category: 'Modifiers', fn: modifiers.modTint },
  shiftbloom: { name: 'Shift Bloom', description: 'Shift makes it bigger: the same key throws a far wider halo', category: 'Modifiers', fn: modifiers.shiftBloom },
  ctrlfreeze: { name: 'Ctrl Freeze', description: 'Hold Ctrl and the board stops moving — let go and it catches up', category: 'Modifiers', fn: modifiers.ctrlFreeze },
  altinvert: { name: 'Alt Invert', description: 'Alt turns the board inside out: everything lights except the key', category: 'Modifiers', fn: modifiers.altInvert },
  modstack: { name: 'Mod Stack', description: 'One ring per modifier held — the combination is countable at a glance', category: 'Modifiers', fn: modifiers.modStack },
  shout: { name: 'Shout', description: 'Shift is a shout: capitals blow out white, lower case stays quiet', category: 'Modifiers', fn: modifiers.shout },
  modlink: { name: 'Mod Link', description: 'Draws the shortcut: a line from the modifier key to the key it modified', category: 'Modifiers', fn: modifiers.modLink },
  amplify: { name: 'Amplify', description: 'Each modifier multiplies the blast — three at once is very loud', category: 'Modifiers', fn: modifiers.amplify },

  // ── Memory ────────────────────────────────────────────────────────────
  patina: remembers('Patina', 'Keys you lean on take on colour, the way brass does under a thumb', memory.patina),
  erosion: remembers('Erosion', 'Everything starts bright; the keys you use most wear down first', memory.erosion),
  treerings: remembers('Tree Rings', 'A ring per stretch of activity, laid down from the middle outward', memory.treeRings),
  sediment: remembers('Sediment', 'Activity settles to the bottom of the board and stacks up in layers', memory.sediment),
  familiarity: remembers('Familiarity', 'The board learns your hands: the keys you actually use stay lit', memory.familiarity),
  emberfield: remembers('Ember Field', 'Heat that takes most of a minute to fade, not most of a second', memory.emberField),
  ghosttyping: remembers('Ghost Typing', 'What you typed a while ago replays as a faint ghost of itself', memory.ghostTyping),
  evolve: remembers('Evolve', 'Your keystrokes seed a pattern that then lives on without you', memory.evolve),
  recharge: remembers('Recharge', 'Every key holds a charge: pressing spends it, and it comes back slowly', memory.recharge),

  // ── Intensity ─────────────────────────────────────────────────────────
  wpm: { name: 'Words Per Minute', description: 'A speedometer: the bar runs further right the faster you type', category: 'Intensity', fn: intensity.wpm },
  redline: { name: 'Redline', description: 'The board heats up as you speed up, and cools when you ease off', category: 'Intensity', fn: intensity.redline },
  gearshift: { name: 'Gear Shift', description: 'Discrete gears', category: 'Intensity', fn: intensity.gearShift },
  turbo: { name: 'Turbo', description: 'Past the threshold the board tips over into something else entirely', category: 'Intensity', fn: intensity.turbo },
  throttle: { name: 'Throttle', description: 'One wave, whose speed is entirely up to you', category: 'Intensity', fn: intensity.throttle },
  acceleration: { name: 'Acceleration', description: 'Speeding up runs warm; easing off runs cold', category: 'Intensity', fn: intensity.acceleration },
  pressure: { name: 'Pressure', description: 'Straight brightness: the board is as loud as you are', category: 'Intensity', fn: intensity.pressure },
  stormfront: { name: 'Storm Front', description: 'Calm at a stroll; at speed the board starts throwing lightning', category: 'Intensity', fn: intensity.stormFront },
  bloomrate: { name: 'Bloom Rate', description: 'Each press blooms, and the faster you go the wider each bloom opens', category: 'Intensity', fn: intensity.bloomRate },

  // ── Idle ──────────────────────────────────────────────────────────────
  sleep: { name: 'Sleep', description: 'The board goes to sleep when you stop, and startles awake when you type', category: 'Idle', fn: idle.sleep },
  wake: { name: 'Wake', description: 'Coming back after a real pause gets a sweep; carrying on does not', category: 'Idle', fn: idle.wake },
  settlingdust: { name: 'Settling Dust', description: 'Dust settles while you sit still, and scatters the moment you type', category: 'Idle', fn: idle.settlingDust },
  slowbreath: { name: 'Slow Breath', description: 'A long, slow breath that only gets going once you leave it alone', category: 'Idle', fn: idle.slowBreath },
  countdown: { name: 'Countdown', description: 'A bar that drains while you are idle and refills when you type', category: 'Idle', fn: idle.countdown },
  hourglass: { name: 'Hourglass', description: 'Sand runs from the top of the board to the bottom while you wait', category: 'Idle', fn: idle.hourglass },
  frost: { name: 'Frost', description: 'Frost creeps across the board while it is idle, and a press melts it', category: 'Idle', fn: idle.frost },
  heartbeat: { name: 'Heartbeat', description: 'A pulse that races while you type and settles to a resting rate', category: 'Idle', fn: idle.heartbeat },
};
