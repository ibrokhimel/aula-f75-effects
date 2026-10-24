import { createGeometry, type KeyboardLayout } from '../layout';
import * as colors from '../colors';
import type { Frame, RGB } from '../colors';
export * from '../colors';
export type { LedGeo, LedPos } from '../layout';

export function createAnimationCore(layout: KeyboardLayout) {
  const geometry = createGeometry(layout);
  function fill(color: RGB): Frame {
    return new Map(geometry.ALL_LEDS.map((id) => [id, color]));
  }
  return { ...colors, ...geometry, fill };
}
export type AnimationCore = ReturnType<typeof createAnimationCore>;
