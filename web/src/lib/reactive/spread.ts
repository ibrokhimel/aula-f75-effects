// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createSpread } from '../../../../packages/engine/src/reactive/spread';
export const { neighbourGlow, blockPulse, flood, gridRipple, infect, quake } = createSpread(defaultEffects.reactiveCore);
