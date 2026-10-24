// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createZones } from '../../../../packages/engine/src/reactive/zones';
export const { zoneGlow, zoneMeter, handoff, territory, zoneWave, wasdMode, homeBase, zoneBlend, borderPatrol } = createZones(defaultEffects.reactiveCore);
