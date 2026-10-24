// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createNature } from '../../../../packages/engine/src/animations/nature';
export const { fireStorm, campfire, lavaLamp, oceanDepth, thunderstorm, snowfall, blizzard, autumnLeaves, springBloom, forestCanopy, desertMirage, moonlight, bioluminescence, coralReef, volcano, iceCrystals, sunrise, meadowWind } = createNature(defaultEffects.animationCore);
