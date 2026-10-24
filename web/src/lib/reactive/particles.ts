// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createParticles } from '../../../../packages/engine/src/reactive/particles';
export const { splash, fountain, sparkleBurst, emberFall, firework, shrapnel, dust, drip, orbit } = createParticles(defaultEffects.reactiveCore);
