// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createRipples } from '../../../../packages/engine/src/reactive/ripples';
export const { ripple, rippleTriple, rippleSquare, rippleDiamond, rippleRainbow, rippleInward, rippleSwell, rippleInterference, rippleEcho } = createRipples(defaultEffects.reactiveCore);
