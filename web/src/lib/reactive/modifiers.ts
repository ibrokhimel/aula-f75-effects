// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createModifiers } from '../../../../packages/engine/src/reactive/modifiers';
export const { modTint, shiftBloom, ctrlFreeze, altInvert, modStack, shout, modLink, amplify } = createModifiers(defaultEffects.reactiveCore);
