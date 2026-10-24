import { ReactiveEngine as SharedReactiveEngine } from '../../../../packages/engine/src/reactive/engine';
import { defaultEffects } from '../keyboard-effects';
export { MAX_PRESSES } from '../../../../packages/engine/src/reactive/engine';

export class ReactiveEngine extends SharedReactiveEngine {
  constructor(nowMs: () => number = () => Date.now()) {
    super(defaultEffects.reactiveCore, defaultEffects.reactive, nowMs);
  }
}
