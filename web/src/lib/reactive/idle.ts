// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createIdle } from '../../../../packages/engine/src/reactive/idle';
export const { sleep, wake, settlingDust, slowBreath, countdown, hourglass, frost, heartbeat } = createIdle(defaultEffects.reactiveCore);
