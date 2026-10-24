// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createChords } from '../../../../packages/engine/src/reactive/chords';
export const { chordLines, chordFill, siphon, repel, vine, freeze, tug, magnetise, bridge, fieldLines } = createChords(defaultEffects.reactiveCore);
