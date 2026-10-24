// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createIntensity } from '../../../../packages/engine/src/reactive/intensity';
export const { wpm, redline, gearShift, turbo, throttle, acceleration, pressure, stormFront, bloomRate } = createIntensity(defaultEffects.reactiveCore);
