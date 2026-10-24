// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createClassic } from '../../../../packages/engine/src/animations/classic';
export const { sineWave, rain, fire, breathing, snake, rainbow, waveVertical, sparkle, plasma, aurora, ripple, rippleSnap, comet, scanner } = createClassic(defaultEffects.animationCore);
