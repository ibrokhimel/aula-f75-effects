// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createSoundEffects } from '../../../../packages/engine/src/reactive/sound-effects';
export const { SOUND_FNS } = createSoundEffects(defaultEffects.reactiveCore, { ...defaultEffects.animationCore, ANIMATIONS: defaultEffects.animations }, defaultEffects.audio);
