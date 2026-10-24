// Compatibility exports for the existing F75 UI and tests.
import { defaultEffects } from '../keyboard-effects';
import { createWaves } from '../../../../packages/engine/src/animations/waves';
export const { interference, moire, metaballs, flowField, curlSmoke, chladni, standingWave, dopplerRings, sineGrid, oilSlick, waterCaustics, heatHaze, warpTunnel, ripplePool, magnetic, soapFilm, tidal, shockwave } = createWaves(defaultEffects.animationCore);
