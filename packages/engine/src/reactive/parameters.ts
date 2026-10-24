import { normalizeControls, type AnimationParameter, type AnimationValues } from '../animations/parameters';
import { EXPANSION_PARAMETERS } from '../expansion/catalog';

/** Curated typing renderers expose only controls implemented in their generators. */
export const REACTIVE_PARAMETERS: Readonly<Record<string, readonly AnimationParameter[]>> = {
  ...EXPANSION_PARAMETERS,
  fade: [{"id":"decay","label":"Release fade","default":0.9,"min":0.2,"max":4,"step":0.1,"kind":"range","unit":"s"}],
  whitehot: [{"id":"decay","label":"Cooling time","default":1,"min":0.2,"max":4,"step":0.1,"kind":"range","unit":"s"}],
  pulse: [{"id":"duration","label":"Pulse duration","default":1.1,"min":0.3,"max":3,"step":0.1,"kind":"range","unit":"s"}],
  ripple: [{"id":"speed","label":"Expansion","default":13,"min":4,"max":28,"step":1,"kind":"range","unit":""},{"id":"life","label":"Ring lifetime","default":1,"min":0.3,"max":3,"step":0.1,"kind":"range","unit":"s"}],
  rippletriple: [{"id":"rings","label":"Ring count","default":3,"min":2,"max":6,"step":1,"kind":"range","unit":""}],
  ripplesquare: [{"id":"speed","label":"Expansion","default":11,"min":4,"max":28,"step":1,"kind":"range","unit":""}],
  rowflash: [{"id":"reach","label":"Row reach","default":5,"min":1,"max":12,"step":1,"kind":"range","unit":""}],
  colflash: [{"id":"decay","label":"Column fade","default":0.8,"min":0.2,"max":3,"step":0.1,"kind":"range","unit":"s"}],
  crossflash: [{"id":"reach","label":"Cross reach","default":6,"min":1,"max":12,"step":1,"kind":"range","unit":""}],
  chargeburst: [{"id":"charge","label":"Full charge","default":1.4,"min":0.3,"max":3,"step":0.1,"kind":"range","unit":"s"}],
  growring: [{"id":"growth","label":"Growth rate","default":6,"min":1,"max":14,"step":1,"kind":"range","unit":""}],
  sparkleburst: [{"id":"radius","label":"Spark radius","default":5,"min":2,"max":10,"step":1,"kind":"range","unit":""},{"id":"life","label":"Spark lifetime","default":0.8,"min":0.2,"max":2,"step":0.1,"kind":"range","unit":"s"}],
  heatmap: [{"id":"cooling","label":"Cooling time","default":3.5,"min":0.5,"max":6,"step":0.5,"kind":"range","unit":"s"}],
  link: [{"id":"width","label":"Link width","default":0.7,"min":0.2,"max":2,"step":0.1,"kind":"range","unit":""}],
  trail: [{"id":"length","label":"Trail keys","default":12,"min":3,"max":24,"step":1,"kind":"range","unit":""}],
};
export function resolveReactiveParameters(id: string, values?: AnimationValues) {
  return normalizeControls(Object.hasOwn(REACTIVE_PARAMETERS, id) ? REACTIVE_PARAMETERS[id] : [], values);
}
