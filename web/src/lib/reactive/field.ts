// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createField } from '../../../../packages/engine/src/reactive/field';
export const { heatmap, globalFlash, hueStep, shockwave, colourPick, ink, keepAlive, tempo, gravityWell, wearOut } = createField(defaultEffects.reactiveCore);
