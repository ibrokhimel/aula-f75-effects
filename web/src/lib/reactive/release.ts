// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createRelease } from '../../../../packages/engine/src/reactive/release';
export const { snap, recoil, bloom, springBack, dropOff, residue, exhale, staccato, unlatch } = createRelease(defaultEffects.reactiveCore);
