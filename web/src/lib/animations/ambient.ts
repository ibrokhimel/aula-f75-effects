// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createAmbient } from '../../../../packages/engine/src/animations/ambient';
export const { candle, slowGradient, nordicCalm, duotoneDrift, heartbeat, zenBreath, pomodoroGlow, nightLight, starlightDim, colorTemp, edgeGlow, wasdFocus, typingHeat, monoWave, deepSpace } = createAmbient(defaultEffects.animationCore);
