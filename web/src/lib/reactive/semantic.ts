// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createSemantic } from '../../../../packages/engine/src/reactive/semantic';
export const { classColour, wordFlow, backspaceEats, enterCommit, numeric, punctSpark, navSteer, syntax, vowelTide } = createSemantic(defaultEffects.reactiveCore);
