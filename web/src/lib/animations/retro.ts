// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createRetro } from '../../../../packages/engine/src/animations/retro';
export const { matrixRain, crtScanline, glitchBars, vuMeter, equalizer, loadingBar, pacmanChase, pongBounce, spaceInvaders, tetrisDrop, arcadeAttract, terminalCursor, dataStream, oscilloscope, radarSweep, bootSequence, tvStatic } = createRetro(defaultEffects.animationCore);
