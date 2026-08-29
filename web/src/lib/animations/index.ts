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
  category: AnimationCategory;
  fn: import('./core').AnimationFn;
}

export const ANIMATIONS: Record<string, AnimationEntry> = {
  // ── Classic ───────────────────────────────────────────────────────────
  sine: { name: 'Sine Wave', category: 'Classic', fn: classic.sineWave },
  rain: { name: 'Rain', category: 'Classic', fn: classic.rain },
  fire: { name: 'Fire', category: 'Classic', fn: classic.fire },
  breathing: { name: 'Breathing', category: 'Classic', fn: classic.breathing },
  snake: { name: 'Snake', category: 'Classic', fn: classic.snake },
  rainbow: { name: 'Rainbow', category: 'Classic', fn: classic.rainbow },
  wave: { name: 'Vertical Wave', category: 'Classic', fn: classic.waveVertical },
  sparkle: { name: 'Sparkle', category: 'Classic', fn: classic.sparkle },
  plasma: { name: 'Plasma', category: 'Classic', fn: classic.plasma },
  aurora: { name: 'Aurora', category: 'Classic', fn: classic.aurora },
  ripple: { name: 'Ripple', category: 'Classic', fn: classic.ripple },
  ripplesnap: { name: 'Ripple Snap', category: 'Classic', fn: classic.rippleSnap },
  comet: { name: 'Comet', category: 'Classic', fn: classic.comet },
  scanner: { name: 'Scanner', category: 'Classic', fn: classic.scanner },

  // ── Waves ─────────────────────────────────────────────────────────────
  interference: { name: 'Interference', category: 'Waves', fn: waves.interference },
  moire: { name: 'Moiré', category: 'Waves', fn: waves.moire },
  metaballs: { name: 'Metaballs', category: 'Waves', fn: waves.metaballs },
  flowfield: { name: 'Flow Field', category: 'Waves', fn: waves.flowField },
  curlsmoke: { name: 'Curl Smoke', category: 'Waves', fn: waves.curlSmoke },
  chladni: { name: 'Chladni', category: 'Waves', fn: waves.chladni },
  standingwave: { name: 'Standing Wave', category: 'Waves', fn: waves.standingWave },
  doppler: { name: 'Doppler Rings', category: 'Waves', fn: waves.dopplerRings },
  sinegrid: { name: 'Sine Grid', category: 'Waves', fn: waves.sineGrid },
  oilslick: { name: 'Oil Slick', category: 'Waves', fn: waves.oilSlick },
  caustics: { name: 'Water Caustics', category: 'Waves', fn: waves.waterCaustics },
  heathaze: { name: 'Heat Haze', category: 'Waves', fn: waves.heatHaze },
  warptunnel: { name: 'Warp Tunnel', category: 'Waves', fn: waves.warpTunnel },
  ripplepool: { name: 'Ripple Pool', category: 'Waves', fn: waves.ripplePool },
  magnetic: { name: 'Magnetic Field', category: 'Waves', fn: waves.magnetic },
  soapfilm: { name: 'Soap Film', category: 'Waves', fn: waves.soapFilm },
  tidal: { name: 'Tidal', category: 'Waves', fn: waves.tidal },
  shockwave: { name: 'Shockwave', category: 'Waves', fn: waves.shockwave },

  // ── Particles ─────────────────────────────────────────────────────────
  fireworks: { name: 'Fireworks', category: 'Particles', fn: particles.fireworks },
  meteorshower: { name: 'Meteor Shower', category: 'Particles', fn: particles.meteorShower },
  bouncingballs: { name: 'Bouncing Balls', category: 'Particles', fn: particles.bouncingBalls },
  popcorn: { name: 'Popcorn', category: 'Particles', fn: particles.popcorn },
  confetti: { name: 'Confetti', category: 'Particles', fn: particles.confetti },
  emberrise: { name: 'Ember Rise', category: 'Particles', fn: particles.emberRise },
  starfield: { name: 'Starfield', category: 'Particles', fn: particles.starfield },
  dualcomet: { name: 'Dual Comet', category: 'Particles', fn: particles.dualComet },
  orbit: { name: 'Orbit', category: 'Particles', fn: particles.orbit },
  fountain: { name: 'Fountain', category: 'Particles', fn: particles.fountain },
  glitterfade: { name: 'Glitter Fade', category: 'Particles', fn: particles.glitterFade },
  swarm: { name: 'Swarm', category: 'Particles', fn: particles.swarm },
  pulsechase: { name: 'Pulse Chase', category: 'Particles', fn: particles.pulseChase },
  raindropimpact: { name: 'Raindrop Impact', category: 'Particles', fn: particles.raindropImpact },
  magicdust: { name: 'Magic Dust', category: 'Particles', fn: particles.magicDust },
  plinko: { name: 'Plinko', category: 'Particles', fn: particles.plinko },
  shootingstars: { name: 'Shooting Stars', category: 'Particles', fn: particles.shootingStars },

  // ── Nature ────────────────────────────────────────────────────────────
  firestorm: { name: 'Fire Storm', category: 'Nature', fn: nature.fireStorm },
  campfire: { name: 'Campfire', category: 'Nature', fn: nature.campfire },
  lavalamp: { name: 'Lava Lamp', category: 'Nature', fn: nature.lavaLamp },
  oceandepth: { name: 'Ocean Depth', category: 'Nature', fn: nature.oceanDepth },
  thunderstorm: { name: 'Thunderstorm', category: 'Nature', fn: nature.thunderstorm },
  snowfall: { name: 'Snowfall', category: 'Nature', fn: nature.snowfall },
  blizzard: { name: 'Blizzard', category: 'Nature', fn: nature.blizzard },
  autumnleaves: { name: 'Autumn Leaves', category: 'Nature', fn: nature.autumnLeaves },
  springbloom: { name: 'Spring Bloom', category: 'Nature', fn: nature.springBloom },
  forestcanopy: { name: 'Forest Canopy', category: 'Nature', fn: nature.forestCanopy },
  desertmirage: { name: 'Desert Mirage', category: 'Nature', fn: nature.desertMirage },
  moonlight: { name: 'Moonlight', category: 'Nature', fn: nature.moonlight },
  bioluminescence: { name: 'Bioluminescence', category: 'Nature', fn: nature.bioluminescence },
  coralreef: { name: 'Coral Reef', category: 'Nature', fn: nature.coralReef },
  volcano: { name: 'Volcano', category: 'Nature', fn: nature.volcano },
  icecrystals: { name: 'Ice Crystals', category: 'Nature', fn: nature.iceCrystals },
  sunrise: { name: 'Sunrise', category: 'Nature', fn: nature.sunrise },
  meadowwind: { name: 'Meadow Wind', category: 'Nature', fn: nature.meadowWind },

  // ── Geometric ─────────────────────────────────────────────────────────
  spiral: { name: 'Spiral', category: 'Geometric', fn: geometric.spiral },
  doublespiral: { name: 'Double Spiral', category: 'Geometric', fn: geometric.doubleSpiral },
  lissajous: { name: 'Lissajous', category: 'Geometric', fn: geometric.lissajous },
  checkerpulse: { name: 'Checker Pulse', category: 'Geometric', fn: geometric.checkerPulse },
  expandingrings: { name: 'Expanding Rings', category: 'Geometric', fn: geometric.expandingRings },
  rotatingbars: { name: 'Rotating Bars', category: 'Geometric', fn: geometric.rotatingBars },
  hexcells: { name: 'Hex Cells', category: 'Geometric', fn: geometric.hexCells },
  voronoi: { name: 'Voronoi', category: 'Geometric', fn: geometric.voronoiCells },
  diagonalwipe: { name: 'Diagonal Wipe', category: 'Geometric', fn: geometric.diagonalWipe },
  crosshair: { name: 'Crosshair', category: 'Geometric', fn: geometric.crosshair },
  pinwheel: { name: 'Pinwheel', category: 'Geometric', fn: geometric.pinwheel },
  kaleidoscope: { name: 'Kaleidoscope', category: 'Geometric', fn: geometric.kaleidoscope },
  starburst: { name: 'Starburst', category: 'Geometric', fn: geometric.starburst },
  boxzoom: { name: 'Box Zoom', category: 'Geometric', fn: geometric.boxZoom },
  dnahelix: { name: 'DNA Helix', category: 'Geometric', fn: geometric.dnaHelix },
  mandala: { name: 'Mandala', category: 'Geometric', fn: geometric.mandala },
  gridscan: { name: 'Grid Scan', category: 'Geometric', fn: geometric.gridScan },

  // ── Retro ─────────────────────────────────────────────────────────────
  matrixrain: { name: 'Matrix Rain', category: 'Retro', fn: retro.matrixRain },
  crtscanline: { name: 'CRT Scanline', category: 'Retro', fn: retro.crtScanline },
  glitchbars: { name: 'Glitch Bars', category: 'Retro', fn: retro.glitchBars },
  vumeter: { name: 'VU Meter', category: 'Retro', fn: retro.vuMeter },
  equalizer: { name: 'Equalizer', category: 'Retro', fn: retro.equalizer },
  loadingbar: { name: 'Loading Bar', category: 'Retro', fn: retro.loadingBar },
  pacman: { name: 'Pac Chase', category: 'Retro', fn: retro.pacmanChase },
  pong: { name: 'Pong', category: 'Retro', fn: retro.pongBounce },
  invaders: { name: 'Invaders', category: 'Retro', fn: retro.spaceInvaders },
  tetris: { name: 'Block Drop', category: 'Retro', fn: retro.tetrisDrop },
  arcade: { name: 'Attract Mode', category: 'Retro', fn: retro.arcadeAttract },
  terminal: { name: 'Terminal', category: 'Retro', fn: retro.terminalCursor },
  datastream: { name: 'Data Stream', category: 'Retro', fn: retro.dataStream },
  oscilloscope: { name: 'Oscilloscope', category: 'Retro', fn: retro.oscilloscope },
  radar: { name: 'Radar Sweep', category: 'Retro', fn: retro.radarSweep },
  boot: { name: 'Boot Sequence', category: 'Retro', fn: retro.bootSequence },
  tvstatic: { name: 'TV Static', category: 'Retro', fn: retro.tvStatic },

  // ── Ambient ───────────────────────────────────────────────────────────
  candle: { name: 'Candle', category: 'Ambient', fn: ambient.candle },
  slowgradient: { name: 'Slow Gradient', category: 'Ambient', fn: ambient.slowGradient },
  nordic: { name: 'Nordic Calm', category: 'Ambient', fn: ambient.nordicCalm },
  duotone: { name: 'Duotone Drift', category: 'Ambient', fn: ambient.duotoneDrift },
  heartbeat: { name: 'Heartbeat', category: 'Ambient', fn: ambient.heartbeat },
  zenbreath: { name: 'Zen Breath (4-7-8)', category: 'Ambient', fn: ambient.zenBreath },
  pomodoro: { name: 'Pomodoro Glow', category: 'Ambient', fn: ambient.pomodoroGlow },
  nightlight: { name: 'Night Light', category: 'Ambient', fn: ambient.nightLight },
  starlight: { name: 'Starlight', category: 'Ambient', fn: ambient.starlightDim },
  colortemp: { name: 'Colour Temp', category: 'Ambient', fn: ambient.colorTemp },
  edgeglow: { name: 'Edge Glow', category: 'Ambient', fn: ambient.edgeGlow },
  wasd: { name: 'WASD Focus', category: 'Ambient', fn: ambient.wasdFocus },
  typingheat: { name: 'Typing Heat', category: 'Ambient', fn: ambient.typingHeat },
  monowave: { name: 'Mono Wave', category: 'Ambient', fn: ambient.monoWave },
  deepspace: { name: 'Deep Space', category: 'Ambient', fn: ambient.deepSpace },
};
