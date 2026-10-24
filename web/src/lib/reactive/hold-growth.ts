// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createHoldGrowth } from '../../../../packages/engine/src/reactive/hold-growth';
export const { growSquare, growDiamond, growColumn, growRow, growSpiral, growCone, columnFill, rowFill, radialFill, clockFill } = createHoldGrowth(defaultEffects.reactiveCore);
