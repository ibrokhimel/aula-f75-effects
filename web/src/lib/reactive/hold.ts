// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createHold } from '../../../../packages/engine/src/reactive/hold';
export const { sustain, growRing, chargeBurst, holdPulse, heatBuild, meter, spin, flame, emitter, overload, anchor } = createHold(defaultEffects.reactiveCore);
