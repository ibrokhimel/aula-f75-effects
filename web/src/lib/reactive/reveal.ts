// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createReveal } from '../../../../packages/engine/src/reactive/reveal';
export const { revealPlasma, revealFire, revealRainbow, revealAurora, revealMatrix, eraser, spotlight, burnIn } = createReveal(defaultEffects.reactiveCore, { ...defaultEffects.animationCore, ANIMATIONS: defaultEffects.animations });
