// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createPoint } from '../../../../packages/engine/src/reactive/point';
export const { fadeOut, whileHeld, hueCycle, blink, pulse, whiteHot, spark, chargeHold, inverted, stamp, additive, confettiKey, breathBase } = createPoint(defaultEffects.reactiveCore);
