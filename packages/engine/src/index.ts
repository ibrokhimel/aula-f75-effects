import { createAnimationCore } from './animations/core';
import { createAnimations } from './animations';
import { resolveAnimationParameters, type AnimationValues } from './animations/parameters';
import { createReactiveCore } from './reactive/core';
import { createReactiveEffects } from './reactive';
import { createAudioState, SPECTRUM_BINS } from './audio';
import { ReactiveEngine } from './reactive/engine';
import { tintFrame, type Frame, type RGB } from './colors';
import type { KeyboardLayout } from './layout';
import { createExpansion } from './expansion';
export * from './expansion';

export * from './layout';
export * from './colors';
export * from './bridge';
export { VirtualKeyboardBridge } from './virtual';
export { analyzeAudio, AUDIO_FFT_SIZE, SPECTRUM_BINS } from './audio';
export type { AudioSample } from './audio';
export { ANIMATION_CATEGORIES } from './animations';
export type { AnimationCategory, AnimationEntry } from './animations';
export * from './animations/parameters';
export * from './reactive/parameters';
export * from './studio';
export { REACTIVE_CATEGORIES, MOD_SHIFT, MOD_CTRL, MOD_ALT } from './reactive/core';
export type { ReactiveDef, ReactiveFn, ReactiveCategory, Press } from './reactive/core';

/** Each library owns its geometry, cached effect data, and audio state. */
export function createEffectLibrary(layout: KeyboardLayout) {
  const animationCore = createAnimationCore(layout);
  const animations = createAnimations(animationCore);
  const reactiveCore = createReactiveCore(animationCore);
  const audio = { ...createAudioState(), SPECTRUM_BINS };
  const reactive = createReactiveEffects(reactiveCore, { ...animationCore, ANIMATIONS: animations }, audio);
  const expansion = createExpansion(animationCore, audio, animations, reactive);
  Object.assign(animations, expansion.animations);
  Object.assign(reactive, expansion.reactive);
  return { animationCore, animations, reactiveCore, reactive, audio, expansion, events: expansion.events };
}

/** Hosts supply events and call render(); the engine never touches hardware. */
export class EffectsEngine {
  readonly library: ReturnType<typeof createEffectLibrary>;
  private readonly input: ReactiveEngine;
  private animationId: string | null = null;
  private timeAnchor = 0;
  private phaseAnchor = 0;
  private animationValues: AnimationValues = {};
  color: RGB | null = null;

  constructor(readonly layout: KeyboardLayout, private readonly nowMs: () => number = () => Date.now()) {
    this.library = createEffectLibrary(layout);
    this.library.audio.setSoundClock(nowMs);
    this.library.events.setClock(nowMs);
    this.input = new ReactiveEngine(this.library.reactiveCore, this.library.reactive, nowMs);
  }

  get reactive(): string | null { return this.input.active; }
  get animation(): string | null { return this.animationId; }
  get running(): boolean { return this.reactive !== null || this.animation !== null; }
  get hits(): number { return this.input.hits; }

  startAnimation(id: string, parameters?: AnimationValues): boolean {
    if (!Object.hasOwn(this.library.animations, id)) return false;
    this.input.stop();
    this.animationId = id;
    this.library.expansion.reset(id);
    this.animationValues = resolveAnimationParameters(id, parameters);
    this.timeAnchor = this.nowMs();
    this.phaseAnchor = 0;
    return true;
  }

  /** Parameter edits preserve playback time and use the same validation as presets. */
  setAnimationParameters(parameters: AnimationValues): boolean {
    if (!this.animationId) return false;
    const now = this.nowMs();
    this.phaseAnchor += (now - this.timeAnchor) / 1000 * (this.animationValues.rate ?? 1);
    this.timeAnchor = now;
    this.animationValues = resolveAnimationParameters(this.animationId, { ...this.animationValues, ...parameters });
    return true;
  }

  get animationParameters(): AnimationValues { return { ...this.animationValues }; }

  startReactive(id: string, parameters?: AnimationValues): boolean {
    if (!this.input.start(id, parameters)) return false;
    this.library.expansion.reset(id);
    this.animationId = null;
    return true;
  }

  setReactiveParameters(parameters: AnimationValues): void { this.input.setParameters(parameters); }

  keyDown(code: string, mods = 0): boolean { return this.input.keyDown(code, mods); }
  keyUp(code: string): void { this.input.keyUp(code); }
  releaseAll(): void { this.input.releaseAll(); }

  stop(): void {
    this.input.stop();
    this.animationId = null;
    this.library.audio.resetSound();
    this.library.expansion.reset();
  }

  render(): Frame {
    if (this.reactive) return this.input.render(this.color);
    if (!this.animationId) return new Map();
    const seconds = this.phaseAnchor + (this.nowMs() - this.timeAnchor) / 1000 * (this.animationValues.rate ?? 1);
    return tintFrame(this.library.animations[this.animationId].fn(seconds, { ...this.animationValues, rate: 1 }), this.color);
  }
}
