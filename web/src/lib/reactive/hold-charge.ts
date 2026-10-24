// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createHoldCharge } from '../../../../packages/engine/src/reactive/hold-charge';
export const { chargeLightning, chargeNova, chargeChain, chargeRecoil, chargeImplode, holdStrobe, holdWobble, holdSiren, holdTremolo, holdVibrato } = createHoldCharge(defaultEffects.reactiveCore);
