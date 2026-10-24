export * from './core';
export { ANIMATION_CATEGORIES } from '../../../../packages/engine/src/animations';
export type { AnimationCategory, AnimationEntry } from '../../../../packages/engine/src/animations';
export * from '../../../../packages/engine/src/animations/parameters';
import { defaultEffects } from '../keyboard-effects';
export const ANIMATIONS = defaultEffects.animations;
