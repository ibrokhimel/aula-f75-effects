// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createMemory } from '../../../../packages/engine/src/reactive/memory';
export const { patina, erosion, treeRings, sediment, familiarity, emberField, ghostTyping, evolve, recharge } = createMemory(defaultEffects.reactiveCore);
