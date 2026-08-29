/**
 * AULA F75 — animation registry.
 *
 * Each generator takes elapsed time (seconds) and returns a Map of
 * led_index to [r, g, b]. Keys absent from the map are dark. Keys in this
 * record are persisted in the UI's "currently running" state, so treat them
 * as stable identifiers and do not rename them casually.
 */

import * as classic from './classic';
import * as waves from './waves';
import * as particles from './particles';
import * as nature from './nature';
import * as geometric from './geometric';
import * as retro from './retro';
import * as ambient from './ambient';

// Re-exported so callers can import geometry/colour helpers from '@/lib/animations'.
export * from './core';

export const ANIMATION_CATEGORIES = [
  'Classic', 'Waves', 'Particles', 'Nature', 'Geometric', 'Retro', 'Ambient',
] as const;

export type AnimationCategory = (typeof ANIMATION_CATEGORIES)[number];

export interface AnimationEntry {
  name: string;
  /** One line for the picker: what it looks like, not how it is built.
   *  Required, so a new effect cannot ship without one. */
  description: string;
  category: AnimationCategory;
  fn: import('./core').AnimationFn;
}

export const ANIMATIONS: Record<string, AnimationEntry> = {
  // ── Classic ───────────────────────────────────────────────────────────
  sine: { name: 'Sine Wave', description: 'A rainbow sine wave rolling across the board', category: 'Classic', fn: classic.sineWave },
  rain: { name: 'Rain', description: 'Droplets fall down scattered columns', category: 'Classic', fn: classic.rain },
  fire: { name: 'Fire', description: 'Flames licking up from the bottom row', category: 'Classic', fn: classic.fire },
  breathing: { name: 'Breathing', description: 'The whole board breathes, drifting slowly through the spectrum', category: 'Classic', fn: classic.breathing },
  snake: { name: 'Snake', description: 'A bright head with a fading tail, winding along every key in turn', category: 'Classic', fn: classic.snake },
  rainbow: { name: 'Rainbow', description: 'A rainbow sliding steadily across the board', category: 'Classic', fn: classic.rainbow },
  wave: { name: 'Vertical Wave', description: 'A coloured wave travelling up the rows', category: 'Classic', fn: classic.waveVertical },
  sparkle: { name: 'Sparkle', description: 'Random keys glitter and wink out', category: 'Classic', fn: classic.sparkle },
  plasma: { name: 'Plasma', description: 'Churning colour fields, like a lava lamp', category: 'Classic', fn: classic.plasma },
  aurora: { name: 'Aurora', description: 'A drifting curtain of northern lights', category: 'Classic', fn: classic.aurora },
  ripple: { name: 'Ripple', description: 'Concentric rings spreading from a wandering centre', category: 'Classic', fn: classic.ripple },
  ripplesnap: { name: 'Ripple Snap', description: 'Rings that flare hard and snap off before they cross the board', category: 'Classic', fn: classic.rippleSnap },
  comet: { name: 'Comet', description: 'A white-hot head dragging a long coloured tail', category: 'Classic', fn: classic.comet },
  scanner: { name: 'Scanner', description: 'A red eye sweeping side to side', category: 'Classic', fn: classic.scanner },

  // ── Waves ─────────────────────────────────────────────────────────────
  interference: { name: 'Interference', description: 'Two wandering point sources; bright where their wavefronts agree', category: 'Waves', fn: waves.interference },
  moire: { name: 'Moiré', description: 'Two line gratings counter-rotating — the beat pattern is the effect', category: 'Waves', fn: waves.moire },
  metaballs: { name: 'Metaballs', description: 'Three blobs of light merging and splitting as they drift', category: 'Waves', fn: waves.metaballs },
  flowfield: { name: 'Flow Field', description: 'Colour streaming along invisible currents', category: 'Waves', fn: waves.flowField },
  curlsmoke: { name: 'Curl Smoke', description: 'Smoke curling and folding in on itself', category: 'Waves', fn: waves.curlSmoke },
  chladni: { name: 'Chladni', description: 'Standing-wave patterns, bright along the lines that stay still', category: 'Waves', fn: waves.chladni },
  standingwave: { name: 'Standing Wave', description: 'Horizontal and vertical modes beating against each other', category: 'Waves', fn: waves.standingWave },
  doppler: { name: 'Doppler Rings', description: 'A moving emitter: rings bunch ahead of it and stretch behind', category: 'Waves', fn: waves.dopplerRings },
  sinegrid: { name: 'Sine Grid', description: 'A drifting lattice of soft bright dots', category: 'Waves', fn: waves.sineGrid },
  oilslick: { name: 'Oil Slick', description: 'Thin-film interference: hue swings hard on small thickness changes', category: 'Waves', fn: waves.oilSlick },
  caustics: { name: 'Water Caustics', description: 'The shifting bright seams of light on a pool floor', category: 'Waves', fn: waves.waterCaustics },
  heathaze: { name: 'Heat Haze', description: 'A warm floor with the air shimmering above it', category: 'Waves', fn: waves.heatHaze },
  warptunnel: { name: 'Warp Tunnel', description: 'Stripes rushing past as though flying into a tunnel', category: 'Waves', fn: waves.warpTunnel },
  ripplepool: { name: 'Ripple Pool', description: 'Several slow ring sources overlapping, like rain on still water', category: 'Waves', fn: waves.ripplePool },
  magnetic: { name: 'Magnetic Field', description: 'Field lines arcing between a red pole and a blue one', category: 'Waves', fn: waves.magnetic },
  soapfilm: { name: 'Soap Film', description: 'Slow iridescent swirls, like the skin of a soap bubble', category: 'Waves', fn: waves.soapFilm },
  tidal: { name: 'Tidal', description: 'A slow swell crossing the board, foam picked out on the crest', category: 'Waves', fn: waves.tidal },
  shockwave: { name: 'Shockwave', description: 'Pulses racing outward from the centre of the board', category: 'Waves', fn: waves.shockwave },

  // ── Particles ─────────────────────────────────────────────────────────
  fireworks: { name: 'Fireworks', description: 'Rocket rises, bursts, and the shell sags under gravity as it fades', category: 'Particles', fn: particles.fireworks },
  meteorshower: { name: 'Meteor Shower', description: 'Streaks on a fixed diagonal, staggered so the sky is never empty', category: 'Particles', fn: particles.meteorShower },
  bouncingballs: { name: 'Bouncing Balls', description: 'Balls bouncing, each at its own rhythm', category: 'Particles', fn: particles.bouncingBalls },
  popcorn: { name: 'Popcorn', description: 'Kernels sit dark, pop bright, then arc up and fall back', category: 'Particles', fn: particles.popcorn },
  confetti: { name: 'Confetti', description: 'Keys light at random and fade — cheap, and reliably festive', category: 'Particles', fn: particles.confetti },
  emberrise: { name: 'Ember Rise', description: 'Sparks lifting off a hot floor, drifting sideways as they cool', category: 'Particles', fn: particles.emberRise },
  starfield: { name: 'Starfield', description: 'Stars streaming outward from the centre; they brighten as they near the edge', category: 'Particles', fn: particles.starfield },
  dualcomet: { name: 'Dual Comet', description: 'Two comets on opposite headings; where they cross the overlap flares', category: 'Particles', fn: particles.dualComet },
  orbit: { name: 'Orbit', description: 'Points on nested elliptical orbits — a tiny orrery', category: 'Particles', fn: particles.orbit },
  fountain: { name: 'Fountain', description: 'Jets launched from the bottom centre on a spread of angles', category: 'Particles', fn: particles.fountain },
  glitterfade: { name: 'Glitter Fade', description: 'Sparkle with a long exponential tail instead of a hard on/off', category: 'Particles', fn: particles.glitterFade },
  swarm: { name: 'Swarm', description: 'Agents chasing a wandering attractor, each with its own lag', category: 'Particles', fn: particles.swarm },
  pulsechase: { name: 'Pulse Chase', description: 'Pulses running the serpentine key path — follows the physical rows', category: 'Particles', fn: particles.pulseChase },
  raindropimpact: { name: 'Raindrop Impact', description: 'Drops fall, land on the bottom row, and throw a short splash ring', category: 'Particles', fn: particles.raindropImpact },
  magicdust: { name: 'Magic Dust', description: 'Slow drifting motes that twinkle as they cross — deliberately sparse', category: 'Particles', fn: particles.magicDust },
  plinko: { name: 'Plinko', description: 'Falling tokens that get knocked sideways one step per row', category: 'Particles', fn: particles.plinko },
  shootingstars: { name: 'Shooting Stars', description: 'Rare, fast, long-tailed — mostly dark, which is the point', category: 'Particles', fn: particles.shootingStars },

  // ── Nature ────────────────────────────────────────────────────────────
  firestorm: { name: 'Fire Storm', description: 'A tall, restless fire climbing the whole board', category: 'Nature', fn: nature.fireStorm },
  campfire: { name: 'Campfire', description: 'One low, wide, slow flame — warm enough to leave running', category: 'Nature', fn: nature.campfire },
  lavalamp: { name: 'Lava Lamp', description: 'Slow buoyant blobs — the vertical squeeze is what sells the wax', category: 'Nature', fn: nature.lavaLamp },
  oceandepth: { name: 'Ocean Depth', description: 'Depth gradient with caustic seams drifting across the shallows', category: 'Nature', fn: nature.oceanDepth },
  thunderstorm: { name: 'Thunderstorm', description: 'Dark cloud base, occasional forked flash that briefly blows out the board', category: 'Nature', fn: nature.thunderstorm },
  snowfall: { name: 'Snowfall', description: 'Flakes drifting down with a lateral sway; slow on purpose', category: 'Nature', fn: nature.snowfall },
  blizzard: { name: 'Blizzard', description: 'Same idea, driven sideways and dense enough to wash out the board', category: 'Nature', fn: nature.blizzard },
  autumnleaves: { name: 'Autumn Leaves', description: 'Leaves tumbling — the wobble term is what stops them looking like rain', category: 'Nature', fn: nature.autumnLeaves },
  springbloom: { name: 'Spring Bloom', description: 'Petals opening outward from scattered centres, then closing again', category: 'Nature', fn: nature.springBloom },
  forestcanopy: { name: 'Forest Canopy', description: 'Dappled light through slowly shifting leaves', category: 'Nature', fn: nature.forestCanopy },
  desertmirage: { name: 'Desert Mirage', description: 'Flat harsh light with a shimmer band that wobbles along the horizon', category: 'Nature', fn: nature.desertMirage },
  moonlight: { name: 'Moonlight', description: 'Cold, dim, and slow — cloud shadows crossing a pale wash', category: 'Nature', fn: nature.moonlight },
  bioluminescence: { name: 'Bioluminescence', description: 'Near-black, with soft blooms that swell and die where nothing was', category: 'Nature', fn: nature.bioluminescence },
  coralreef: { name: 'Coral Reef', description: 'Cell-shaded polyps, each on its own pulse phase and hue', category: 'Nature', fn: nature.coralReef },
  volcano: { name: 'Volcano', description: 'A glowing crater that periodically throws a plume up the board', category: 'Nature', fn: nature.volcano },
  icecrystals: { name: 'Ice Crystals', description: 'Frost facets growing outward, then easing back', category: 'Nature', fn: nature.iceCrystals },
  sunrise: { name: 'Sunrise', description: 'A whole day on a 24-second loop: night, dawn, noon, dusk, night again', category: 'Nature', fn: nature.sunrise },
  meadowwind: { name: 'Meadow Wind', description: 'Wind combing a field of grass — a shear wave over a green base', category: 'Nature', fn: nature.meadowWind },

  // ── Geometric ─────────────────────────────────────────────────────────
  spiral: { name: 'Spiral', description: 'Three arms winding out from the centre', category: 'Geometric', fn: geometric.spiral },
  doublespiral: { name: 'Double Spiral', description: 'Two spirals wound opposite ways; the crossings beat against each other', category: 'Geometric', fn: geometric.doubleSpiral },
  lissajous: { name: 'Lissajous', description: 'A dot tracing a Lissajous curve, with a decaying trail behind it', category: 'Geometric', fn: geometric.lissajous },
  checkerpulse: { name: 'Checker Pulse', description: 'Checkerboard whose two colours trade brightness', category: 'Geometric', fn: geometric.checkerPulse },
  expandingrings: { name: 'Expanding Rings', description: 'Rings pulsing outward from the middle of the board', category: 'Geometric', fn: geometric.expandingRings },
  rotatingbars: { name: 'Rotating Bars', description: 'A bar grating rotating about the centre', category: 'Geometric', fn: geometric.rotatingBars },
  hexcells: { name: 'Hex Cells', description: 'Cell interiors lit, borders left dark — reads as a honeycomb', category: 'Geometric', fn: geometric.hexCells },
  voronoi: { name: 'Voronoi', description: 'Flat-shaded voronoi: each cell holds one hue, keyed off its own id', category: 'Geometric', fn: geometric.voronoiCells },
  diagonalwipe: { name: 'Diagonal Wipe', description: 'Repeating diagonal bands sliding across the board', category: 'Geometric', fn: geometric.diagonalWipe },
  crosshair: { name: 'Crosshair', description: 'A plus-shaped reticle drifting on a Lissajous path', category: 'Geometric', fn: geometric.crosshair },
  pinwheel: { name: 'Pinwheel', description: 'Angular sectors spinning — the classic pinwheel', category: 'Geometric', fn: geometric.pinwheel },
  kaleidoscope: { name: 'Kaleidoscope', description: 'Plasma folded into a mirrored wedge, so both halves always agree', category: 'Geometric', fn: geometric.kaleidoscope },
  starburst: { name: 'Starburst', description: 'Radial spokes that pulse outward from the centre in bursts', category: 'Geometric', fn: geometric.starburst },
  boxzoom: { name: 'Box Zoom', description: 'Nested squares scaling endlessly outward', category: 'Geometric', fn: geometric.boxZoom },
  dnahelix: { name: 'DNA Helix', description: 'Two counter-phase strands with rungs where they cross', category: 'Geometric', fn: geometric.dnaHelix },
  mandala: { name: 'Mandala', description: 'Radial and angular harmonics multiplied — a slowly turning mandala', category: 'Geometric', fn: geometric.mandala },
  gridscan: { name: 'Grid Scan', description: 'A row scan and a column scan crossing; the intersection flares', category: 'Geometric', fn: geometric.gridScan },

  // ── Retro ─────────────────────────────────────────────────────────────
  matrixrain: { name: 'Matrix Rain', description: 'Cascading columns, bright head, green decaying tail', category: 'Retro', fn: retro.matrixRain },
  crtscanline: { name: 'CRT Scanline', description: 'A bright raster line rolling down a dim phosphor field', category: 'Retro', fn: retro.crtScanline },
  glitchbars: { name: 'Glitch Bars', description: 'Rows tear sideways and flash chromatic — a broken signal', category: 'Retro', fn: retro.glitchBars },
  vumeter: { name: 'VU Meter', description: 'Column meters that leap and fall back with a held peak marker', category: 'Retro', fn: retro.vuMeter },
  equalizer: { name: 'Equalizer', description: 'Wider bars, palette-shaded rather than red-lined', category: 'Retro', fn: retro.equalizer },
  loadingbar: { name: 'Loading Bar', description: 'Indeterminate progress bar: fills, pauses, resets', category: 'Retro', fn: retro.loadingBar },
  pacman: { name: 'Pac Chase', description: 'A mouth eating a line of pellets, with a ghost in pursuit', category: 'Retro', fn: retro.pacmanChase },
  pong: { name: 'Pong', description: 'Ball rebounding between two paddles that track it imperfectly', category: 'Retro', fn: retro.pongBounce },
  invaders: { name: 'Invaders', description: 'A formation marching side to side, dropping a row each time it turns', category: 'Retro', fn: retro.spaceInvaders },
  tetris: { name: 'Block Drop', description: 'Pieces drop and stack until the well fills, then it collapses row by row', category: 'Retro', fn: retro.tetrisDrop },
  arcade: { name: 'Attract Mode', description: 'Attract mode: full-board colour slams on a fixed beat', category: 'Retro', fn: retro.arcadeAttract },
  terminal: { name: 'Terminal', description: 'A cursor typing across each row, then the screen clears and it starts over', category: 'Retro', fn: retro.terminalCursor },
  datastream: { name: 'Data Stream', description: 'Dense vertical streams of ones and zeroes, cyan rather than green', category: 'Retro', fn: retro.dataStream },
  oscilloscope: { name: 'Oscilloscope', description: 'A live trace: two harmonics summed, drawn as a thin bright line', category: 'Retro', fn: retro.oscilloscope },
  radar: { name: 'Radar Sweep', description: 'Rotating sweep with a phosphor afterglow and a couple of contacts', category: 'Retro', fn: retro.radarSweep },
  boot: { name: 'Boot Sequence', description: 'POST sequence: rows come up one by one, then the board flashes ready', category: 'Retro', fn: retro.bootSequence },
  tvstatic: { name: 'TV Static', description: 'Every key an independent slow-flickering pixel — a TV tuned to static', category: 'Retro', fn: retro.tvStatic },

  // ── Ambient ───────────────────────────────────────────────────────────
  candle: { name: 'Candle', description: 'Warm, uneven, and never quite still', category: 'Ambient', fn: ambient.candle },
  slowgradient: { name: 'Slow Gradient', description: 'The whole board on one hue, drifting slowly enough to be unnoticeable', category: 'Ambient', fn: ambient.slowGradient },
  nordic: { name: 'Nordic Calm', description: 'Muted arctic blues on a slow tide — quiet enough for a dark room', category: 'Ambient', fn: ambient.nordicCalm },
  duotone: { name: 'Duotone Drift', description: 'Two fixed colours cross-fading across the board and over time', category: 'Ambient', fn: ambient.duotoneDrift },
  heartbeat: { name: 'Heartbeat', description: 'Lub-dub: a strong beat, a weaker one 0.28s later, then rest', category: 'Ambient', fn: ambient.heartbeat },
  zenbreath: { name: 'Zen Breath (4-7-8)', description: 'A 4-7-8 breathing pacer: inhale bright and cool, hold, exhale dim and warm', category: 'Ambient', fn: ambient.zenBreath },
  pomodoro: { name: 'Pomodoro Glow', description: '25 minutes of work turning red, then 5 of green break', category: 'Ambient', fn: ambient.pomodoroGlow },
  nightlight: { name: 'Night Light', description: 'Dim, warm, and almost static — usable as an actual desk night light', category: 'Ambient', fn: ambient.nightLight },
  starlight: { name: 'Starlight', description: 'Sparse, slow twinkles on near-black', category: 'Ambient', fn: ambient.starlightDim },
  colortemp: { name: 'Colour Temp', description: 'A colour-temperature sweep, tungsten through to overcast daylight', category: 'Ambient', fn: ambient.colorTemp },
  edgeglow: { name: 'Edge Glow', description: 'Only the outer ring is lit, breathing — the rest of the board stays dark', category: 'Ambient', fn: ambient.edgeGlow },
  wasd: { name: 'WASD Focus', description: 'WASD and the arrows picked out hot; everything else a dim wash', category: 'Ambient', fn: ambient.wasdFocus },
  typingheat: { name: 'Typing Heat', description: 'A static heat map of where the hands sit — warm centre, cool extremities', category: 'Ambient', fn: ambient.typingHeat },
  monowave: { name: 'Mono Wave', description: 'One hue, one wave — no rainbow anywhere', category: 'Ambient', fn: ambient.monoWave },
  deepspace: { name: 'Deep Space', description: 'Almost black, with a distant flare that swells and dies every few seconds', category: 'Ambient', fn: ambient.deepSpace },
};
