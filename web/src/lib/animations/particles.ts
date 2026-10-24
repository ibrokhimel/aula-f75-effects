// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createParticles } from '../../../../packages/engine/src/animations/particles';
export const { fireworks, meteorShower, bouncingBalls, popcorn, confetti, emberRise, starfield, dualComet, orbit, fountain, glitterFade, swarm, pulseChase, raindropImpact, magicDust, plinko, shootingStars } = createParticles(defaultEffects.animationCore);
