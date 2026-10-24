// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createSweeps } from '../../../../packages/engine/src/reactive/sweeps';
export const { rowFlash, colFlash, crossFlash, sweepRight, sweepLeft, sweepSplit, sweepUp, sweepDiagonal, laser, boomerang, rowDrain } = createSweeps(defaultEffects.reactiveCore);
