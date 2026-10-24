// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createGeometric } from '../../../../packages/engine/src/animations/geometric';
export const { spiral, doubleSpiral, lissajous, checkerPulse, expandingRings, rotatingBars, hexCells, voronoiCells, diagonalWipe, crosshair, pinwheel, kaleidoscope, starburst, boxZoom, dnaHelix, mandala, gridScan } = createGeometric(defaultEffects.animationCore);
