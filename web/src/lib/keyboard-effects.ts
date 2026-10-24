import { createEffectLibrary } from '../../../packages/engine/src';
import { F75_LAYOUT } from './bridges/f75/layout';

/** Compatibility context for the current F75 UI; other boards create their own. */
export const defaultEffects = createEffectLibrary(F75_LAYOUT);
