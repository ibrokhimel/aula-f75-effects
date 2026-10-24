import { EXPANSION_PARAMETERS } from '../expansion/catalog';
/** Engine-owned controls. Renderers and hosts share these definitions. */
export type AnimationValues = Readonly<Record<string, number>>;
export type AnimationParameter = { id: string; label: string; default: number } & (
  { kind: 'range'; min: number; max: number; step: number; unit?: string } |
  { kind: 'select'; options: readonly { label: string; value: number }[] }
);

export const ANIMATION_PARAMETERS: Readonly<Record<string, readonly AnimationParameter[]>> = {
  ...EXPANSION_PARAMETERS,
  sine: [{"id":"waves","label":"Wave count","default":4,"min":1,"max":8,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  rain: [{"id":"drops","label":"Drop count","default":6,"min":2,"max":24,"step":1,"unit":"","kind":"range"},{"id":"width","label":"Drop width","default":0.06,"min":0.02,"max":0.14,"step":0.01,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  fire: [{"id":"cooling","label":"Cooling","default":0.7,"min":0.2,"max":1.8,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  breathing: [{"id":"floor","label":"Minimum glow","default":0,"min":0,"max":0.6,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  snake: [{"id":"tail","label":"Tail length","default":10,"min":3,"max":40,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  rainbow: [{"id":"bands","label":"Spectrum repeats","default":1,"min":0.25,"max":4,"step":0.25,"unit":"","kind":"range"},{"kind":"select","id":"direction","label":"Travel","default":1,"options":[{"label":"Left","value":1},{"label":"Right","value":-1}]},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  wave: [{"id":"waves","label":"Wave count","default":3,"min":1,"max":8,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  sparkle: [{"id":"density","label":"Lit keys","default":8,"min":1,"max":50,"step":1,"unit":"%","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  plasma: [{"id":"contrast","label":"Field contrast","default":1.3,"min":0.3,"max":3,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  aurora: [{"id":"width","label":"Curtain width","default":2,"min":0.5,"max":4,"step":0.1,"unit":"","kind":"range"},{"id":"sway","label":"Sway","default":1.15,"min":0,"max":2.5,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  ripple: [{"id":"spacing","label":"Ring density","default":1.05,"min":0.3,"max":3,"step":0.05,"unit":"","kind":"range"},{"id":"decay","label":"Reach","default":16,"min":4,"max":30,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  ripplesnap: [{"id":"life","label":"Ring lifetime","default":0.36,"min":0.1,"max":0.8,"step":0.02,"unit":"s","kind":"range"},{"id":"thickness","label":"Ring width","default":1,"min":0.2,"max":3,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  comet: [{"id":"tail","label":"Tail decay","default":0.28,"min":0.08,"max":0.8,"step":0.02,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  scanner: [{"id":"width","label":"Beam width","default":3.2,"min":0.5,"max":12,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  interference: [{"id":"frequency","label":"Wave frequency","default":1.35,"min":0.3,"max":3,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  moire: [{"id":"spacing","label":"Stripe density","default":2.2,"min":0.5,"max":4,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  metaballs: [{"id":"threshold","label":"Blob separation","default":0.75,"min":0.3,"max":2,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  flowfield: [{"id":"turbulence","label":"Turbulence","default":4,"min":1,"max":8,"step":0.25,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  curlsmoke: [{"id":"curl","label":"Curl strength","default":4,"min":0.5,"max":8,"step":0.25,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  chladni: [{"id":"sharpness","label":"Line definition","default":3.2,"min":1,"max":6,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  standingwave: [{"id":"horizontal","label":"Horizontal mode","default":0.62,"min":0.15,"max":1.5,"step":0.01,"unit":"","kind":"range"},{"id":"vertical","label":"Vertical mode","default":1.05,"min":0.2,"max":3,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  doppler: [{"id":"compression","label":"Doppler compression","default":0.35,"min":0,"max":0.75,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  sinegrid: [{"id":"columns","label":"Column frequency","default":1.6,"min":0.4,"max":3,"step":0.1,"unit":"","kind":"range"},{"id":"rows","label":"Row frequency","default":2.4,"min":0.5,"max":4,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  oilslick: [{"id":"bands","label":"Color bands","default":3.4,"min":0.5,"max":6,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  caustics: [{"id":"sharpness","label":"Seam sharpness","default":3,"min":1,"max":6,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  heathaze: [{"id":"distortion","label":"Heat distortion","default":1.4,"min":0.1,"max":3,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  warptunnel: [{"id":"rings","label":"Ring density","default":6,"min":2,"max":12,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  ripplepool: [{"id":"sources","label":"Ring sources","default":4,"min":1,"max":8,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  magnetic: [{"id":"lines","label":"Line density","default":26,"min":8,"max":60,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  soapfilm: [{"id":"swirls","label":"Swirl detail","default":8,"min":2,"max":16,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  tidal: [{"id":"height","label":"Swell height","default":1.4,"min":0.2,"max":2.5,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  shockwave: [{"id":"rings","label":"Ring density","default":9,"min":3,"max":18,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  fireworks: [{"id":"gravity","label":"Shell gravity","default":2.4,"min":0.2,"max":5,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  meteorshower: [{"id":"count","label":"Meteor count","default":7,"min":2,"max":16,"step":1,"unit":"","kind":"range"},{"id":"slope","label":"Fall angle","default":0.38,"min":-0.5,"max":1,"step":0.02,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  bouncingballs: [{"id":"count","label":"Ball count","default":6,"min":2,"max":12,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  popcorn: [{"id":"power","label":"Pop height","default":7.5,"min":3,"max":12,"step":0.5,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  confetti: [{"id":"density","label":"Spark density","default":7,"min":1,"max":35,"step":1,"unit":"%","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  emberrise: [{"id":"count","label":"Ember count","default":22,"min":4,"max":44,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  starfield: [{"id":"count","label":"Star count","default":30,"min":6,"max":60,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  dualcomet: [{"id":"tail","label":"Tail decay","default":0.3,"min":0.08,"max":0.8,"step":0.02,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  orbit: [{"id":"count","label":"Orbiting points","default":5,"min":2,"max":8,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  fountain: [{"id":"spread","label":"Jet spread","default":1.5,"min":0.3,"max":2.5,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  glitterfade: [{"id":"decay","label":"Glitter decay","default":1.6,"min":0.5,"max":4,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  swarm: [{"id":"count","label":"Agent count","default":14,"min":3,"max":30,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  pulsechase: [{"id":"pulses","label":"Pulse count","default":4,"min":1,"max":8,"step":1,"unit":"","kind":"range"},{"id":"tail","label":"Tail length","default":12,"min":3,"max":24,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  raindropimpact: [{"id":"splash","label":"Splash lifetime","default":0.4,"min":0.1,"max":0.8,"step":0.05,"unit":"s","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  magicdust: [{"id":"count","label":"Mote count","default":16,"min":3,"max":32,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  plinko: [{"id":"deflection","label":"Row deflection","default":0.75,"min":0.1,"max":2,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  shootingstars: [{"id":"interval","label":"Star interval","default":1.6,"min":0.8,"max":5,"step":0.1,"unit":"s","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  firestorm: [{"id":"cooling","label":"Flame cooling","default":1.35,"min":0.4,"max":2.5,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  campfire: [{"id":"width","label":"Flame width","default":34,"min":8,"max":70,"step":1,"unit":"","kind":"range"},{"id":"cooling","label":"Flame cooling","default":0.85,"min":0.3,"max":1.8,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  lavalamp: [{"id":"threshold","label":"Wax separation","default":0.7,"min":0.2,"max":2,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  oceandepth: [{"id":"depth","label":"Depth contrast","default":0.7,"min":0.2,"max":0.85,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  thunderstorm: [{"id":"interval","label":"Strike interval","default":1.7,"min":0.5,"max":5,"step":0.1,"unit":"s","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  snowfall: [{"id":"count","label":"Flake count","default":24,"min":6,"max":48,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  blizzard: [{"id":"count","label":"Flake count","default":44,"min":12,"max":64,"step":1,"unit":"","kind":"range"},{"id":"slope","label":"Wind angle","default":0.55,"min":-0.5,"max":1.5,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  autumnleaves: [{"id":"count","label":"Leaf count","default":14,"min":3,"max":30,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  springbloom: [{"id":"count","label":"Bloom count","default":5,"min":1,"max":10,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  forestcanopy: [{"id":"detail","label":"Dapple contrast","default":1.15,"min":0.4,"max":2,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  desertmirage: [{"id":"width","label":"Horizon width","default":1.1,"min":0.2,"max":3,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  moonlight: [{"id":"cloud","label":"Cloud opacity","default":0.45,"min":0.1,"max":0.55,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  bioluminescence: [{"id":"growth","label":"Bloom growth","default":1.1,"min":0.2,"max":2.5,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  coralreef: [{"id":"sharpness","label":"Polyp sharpness","default":1.4,"min":0.5,"max":3,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  volcano: [{"id":"interval","label":"Eruption interval","default":4.2,"min":2,"max":10,"step":0.2,"unit":"s","kind":"range"},{"id":"plume","label":"Plume intensity","default":1.6,"min":0.3,"max":3,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  icecrystals: [{"id":"sharpness","label":"Facet sharpness","default":2.5,"min":0.5,"max":5,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  sunrise: [{"id":"cycle","label":"Day length","default":24,"min":8,"max":120,"step":1,"unit":"s","kind":"range"}],
  meadowwind: [{"id":"gust","label":"Gust strength","default":6,"min":1,"max":12,"step":0.5,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  spiral: [{"id":"arms","label":"Spiral arms","default":3,"min":1,"max":8,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  doublespiral: [{"id":"twist","label":"Spiral twist","default":0.9,"min":0.2,"max":2,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  lissajous: [{"id":"trail","label":"Trail samples","default":26,"min":6,"max":40,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  checkerpulse: [{"id":"size","label":"Cell width","default":2,"min":1,"max":5,"step":0.5,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  expandingrings: [{"id":"frequency","label":"Ring density","default":1.1,"min":0.3,"max":3,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  rotatingbars: [{"id":"frequency","label":"Bar frequency","default":1.15,"min":0.3,"max":3,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  hexcells: [{"id":"border","label":"Border contrast","default":0.85,"min":0.1,"max":1,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  voronoi: [{"id":"border","label":"Border sharpness","default":3,"min":1,"max":6,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  diagonalwipe: [{"id":"width","label":"Band spacing","default":5,"min":2,"max":10,"step":0.5,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  crosshair: [{"id":"width","label":"Vertical beam width","default":0.5,"min":0.1,"max":2,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  pinwheel: [{"id":"blades","label":"Blade count","default":6,"min":2,"max":12,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  kaleidoscope: [{"id":"segments","label":"Mirror segments","default":6,"min":2,"max":12,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  starburst: [{"id":"spokes","label":"Spoke count","default":12,"min":4,"max":24,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  boxzoom: [{"id":"spacing","label":"Square frequency","default":2.4,"min":0.5,"max":5,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  dnahelix: [{"id":"twist","label":"Helix frequency","default":0.55,"min":0.15,"max":1.5,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  mandala: [{"id":"petals","label":"Petal count","default":8,"min":3,"max":16,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  gridscan: [{"id":"width","label":"Column beam width","default":1.4,"min":0.2,"max":5,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  matrixrain: [{"id":"decay","label":"Trail decay","default":0.55,"min":0.15,"max":1.2,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  crtscanline: [{"id":"width","label":"Raster width","default":0.28,"min":0.08,"max":1.2,"step":0.02,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  glitchbars: [{"id":"threshold","label":"Torn rows","default":28,"min":5,"max":90,"step":1,"unit":"%","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  vumeter: [{"id":"gain","label":"Meter gain","default":1,"min":0.3,"max":1.8,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  equalizer: [{"id":"width","label":"Band width","default":2.5,"min":1,"max":5,"step":0.5,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  loadingbar: [{"id":"height","label":"Bar half-height","default":1.6,"min":0.4,"max":3,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  pacman: [{"id":"gap","label":"Ghost distance","default":3.5,"min":1,"max":7,"step":0.5,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  pong: [{"id":"height","label":"Paddle reach","default":1.6,"min":0.6,"max":3,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  invaders: [{"id":"spacing","label":"Formation spacing","default":2.2,"min":1.5,"max":3.5,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  tetris: [{"id":"pieces","label":"Pieces per round","default":26,"min":12,"max":50,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  arcade: [{"id":"decay","label":"Beat decay","default":5,"min":1,"max":12,"step":0.5,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  terminal: [{"id":"cps","label":"Typing rate","default":9,"min":2,"max":24,"step":1,"unit":"keys/s","kind":"range"}],
  datastream: [{"id":"decay","label":"Stream decay","default":0.5,"min":0.1,"max":1.2,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  oscilloscope: [{"id":"amplitude","label":"Wave height","default":1.9,"min":0.3,"max":3,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  radar: [{"id":"decay","label":"Phosphor decay","default":1.5,"min":0.3,"max":4,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  boot: [{"id":"cycle","label":"Boot cycle","default":4.5,"min":3.5,"max":10,"step":0.5,"unit":"s","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  tvstatic: [{"id":"floor","label":"Black level","default":40,"min":0,"max":100,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  candle: [{"id":"green","label":"Warmth","default":126,"min":60,"max":200,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  slowgradient: [{"id":"saturation","label":"Saturation","default":0.75,"min":0.1,"max":1,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  nordic: [{"id":"contrast","label":"Ice contrast","default":0.6,"min":0.1,"max":0.8,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  duotone: [{"id":"spread","label":"Blend frequency","default":0.22,"min":0.05,"max":0.7,"step":0.01,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  heartbeat: [{"id":"bpm","label":"Heart rate","default":66,"min":40,"max":140,"step":1,"unit":"bpm","kind":"range"}],
  zenbreath: [{"id":"inhale","label":"Inhale","default":4,"min":2,"max":10,"step":1,"unit":"s","kind":"range"},{"id":"hold","label":"Hold","default":7,"min":0,"max":12,"step":1,"unit":"s","kind":"range"},{"id":"exhale","label":"Exhale","default":8,"min":2,"max":12,"step":1,"unit":"s","kind":"range"}],
  pomodoro: [{"id":"work","label":"Work interval","default":25,"min":1,"max":60,"step":1,"unit":"min","kind":"range"},{"id":"rest","label":"Break interval","default":5,"min":1,"max":30,"step":1,"unit":"min","kind":"range"}],
  nightlight: [{"id":"warmth","label":"Warmth","default":120,"min":50,"max":200,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  starlight: [{"id":"sharpness","label":"Twinkle sparsity","default":6,"min":2,"max":12,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  colortemp: [{"id":"spread","label":"Temperature spread","default":0.35,"min":0,"max":1,"step":0.05,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  edgeglow: [{"id":"width","label":"Side border width","default":1.2,"min":0.5,"max":3,"step":0.1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  wasd: [{"id":"background","label":"Background blue","default":64,"min":0,"max":150,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  typingheat: [{"id":"spread","label":"Hand glow width","default":22,"min":5,"max":45,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  monowave: [{"id":"hue","label":"Hue","default":0.78,"min":0,"max":1,"step":0.01,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
  deepspace: [{"id":"width","label":"Flare radius","default":26,"min":5,"max":60,"step":1,"unit":"","kind":"range"},{"kind":"range","id":"rate","label":"Motion rate","default":1,"min":0.2,"max":3,"step":0.1,"unit":"×"}],
};

/** Ignore unknown keys and normalize untrusted preset/host values. */
export function resolveAnimationParameters(id: string, input?: AnimationValues): Record<string, number> {
  return normalizeControls(Object.hasOwn(ANIMATION_PARAMETERS, id) ? ANIMATION_PARAMETERS[id] : [], input);
}

export function normalizeControls(parameters: readonly AnimationParameter[], input?: AnimationValues): Record<string, number> {
  return Object.fromEntries(parameters.map(parameter => {
    const raw = input?.[parameter.id];
    let value = typeof raw === 'number' && Number.isFinite(raw) ? raw : parameter.default;
    if (parameter.kind === 'select') {
      if (!parameter.options.some(option => option.value === value)) value = parameter.default;
    } else {
      value = Math.min(parameter.max, Math.max(parameter.min, value));
      // Snap about the default so existing defaults keep their exact appearance.
      value = Number((parameter.default + Math.round((value - parameter.default) / parameter.step) * parameter.step).toFixed(6));
      value = Math.min(parameter.max, Math.max(parameter.min, value));
    }
    return [parameter.id, value];
  }));
}
