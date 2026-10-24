// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createGesture } from '../../../../packages/engine/src/reactive/gesture';
export const { swipe, arc, zigzag, circle, vector, smear, momentum, compass, scribble } = createGesture(defaultEffects.reactiveCore);
