// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createRhythm } from '../../../../packages/engine/src/reactive/rhythm';
export const { metronome, burst, swing, beatGrid, pulseWave, strobe, anticipate, groove, drumline } = createRhythm(defaultEffects.reactiveCore);
