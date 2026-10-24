// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createHoldMaterial } from '../../../../packages/engine/src/reactive/hold-material';
export const { holdMelt, holdCrack, holdRust, holdBloom, holdMagma, holdSmoke, holdPortal, holdBeamCharge, holdShield, holdWarp } = createHoldMaterial(defaultEffects.reactiveCore);
