// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createChain } from '../../../../packages/engine/src/reactive/chain';
export const { link, constellation, trail, echo, combo, relay } = createChain(defaultEffects.reactiveCore);
