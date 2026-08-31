/**
 * The always-on effect engine, living in the main process where no window
 * or tab lifecycle can throttle it.
 *
 * Reactive effects run the shared ReactiveEngine off the global key hook;
 * animations are pure functions of time. Either way a plain setInterval
 * paces the stream — 30 fps for reactive, the configured rate for
 * animations — and each tick renders one frame, mirrors it to any watching
 * window, and pushes it to the keyboard.
 */
import { ReactiveEngine } from '../../web/src/lib/reactive/engine';
import { REACTIVE } from '../../web/src/lib/reactive';
import { ANIMATIONS, tintFrame, type Frame, type RGB } from '../../web/src/lib/animations';
import { hexToRgb } from '../../web/src/lib/protocol';
import {
  buildDirectFrame, sendDirectFrame, enableDirectMode, disableDirectMode, buildBlankFrame,
} from '../../web/src/lib/direct-mode';
import {
  isWirelessDevice, sendWirelessAnimationFrame, sendWirelessIdle,
} from '../../web/src/lib/wireless-mode';

const REACTIVE_FPS = 30;

export interface EngineHostDeps {
  getDevice(): HIDDevice | null;
  log(line: string): void;
  /** Effect started/stopped/paused — push status, persist settings. */
  onStateChange(): void;
}

export class EngineHost {
  private readonly engine = new ReactiveEngine(() => performance.now());
  private animationId: string | null = null;
  private animT0 = 0;
  private timer: NodeJS.Timeout | null = null;
  private inFlight = false;
  private frameListener: ((frame: Frame, hits: number) => void) | null = null;

  private color: RGB | null = null;
  colorHex: string | null = null;
  fps = 20;
  paused = false;

  constructor(private readonly deps: EngineHostDeps) {}

  get reactive(): string | null { return this.engine.active; }
  get animation(): string | null { return this.animationId; }
  get hits(): number { return this.engine.hits; }
  get running(): boolean { return this.engine.active !== null || this.animationId !== null; }

  keyDown(code: string, mods: number): void { this.engine.keyDown(code, mods); }
  keyUp(code: string): void { this.engine.keyUp(code); }

  async startReactive(id: string): Promise<void> {
    if (!REACTIVE[id]) { this.deps.log(`Unknown reactive effect: ${id}`); return; }
    await this.stopInternal();
    this.engine.start(id);
    this.deps.log(`Reactive: ${REACTIVE[id].name} — type anywhere in Windows`);
    await this.armTransport();
    this.runLoop(1000 / REACTIVE_FPS);
    this.deps.onStateChange();
  }

  async startAnimation(id: string, fps?: number): Promise<void> {
    if (!ANIMATIONS[id]) { this.deps.log(`Unknown animation: ${id}`); return; }
    await this.stopInternal();
    if (fps !== undefined) this.fps = clampFps(fps);
    this.animationId = id;
    this.animT0 = performance.now();
    this.deps.log(`Animation: ${ANIMATIONS[id].name} at ${this.fps} fps`);
    await this.armTransport();
    this.runLoop(1000 / this.fps);
    this.deps.onStateChange();
  }

  async stop(): Promise<void> {
    const was = this.running;
    await this.stopInternal();
    if (was) {
      this.deps.log('Effects stopped');
      this.deps.onStateChange();
    }
  }

  setColor(hex: string | null): void {
    this.colorHex = hex;
    this.color = hex ? hexToRgb(hex) : null;
  }

  setFps(fps: number): void {
    this.fps = clampFps(fps);
    // Re-pace a running animation; reactive stays at its fixed rate.
    if (this.animationId && this.timer) {
      clearInterval(this.timer);
      this.runLoop(1000 / this.fps);
    }
  }

  async setPaused(p: boolean): Promise<void> {
    if (this.paused === p) return;
    this.paused = p;
    if (p) await this.blankBoard();
    this.deps.onStateChange();
  }

  setFrameListener(fn: ((frame: Frame, hits: number) => void) | null): void {
    this.frameListener = fn;
  }

  /** A replug mid-effect needs direct mode re-armed before frames resume. */
  async onDeviceConnected(): Promise<void> {
    if (this.running && !this.paused) await this.armTransport();
  }

  /** Best-effort hand-back to onboard effects; used on quit. */
  async shutdown(): Promise<void> {
    await this.stopInternal();
  }

  private async stopInternal(): Promise<void> {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.engine.stop();
    this.animationId = null;
    await this.blankBoard();
  }

  private async blankBoard(): Promise<void> {
    const device = this.deps.getDevice();
    if (!device) return;
    try {
      if (isWirelessDevice(device)) {
        await sendWirelessIdle(device);
      } else {
        await sendDirectFrame(device, buildBlankFrame());
        await disableDirectMode(device, () => {});
      }
    } catch { /* best effort */ }
  }

  private async armTransport(): Promise<void> {
    const device = this.deps.getDevice();
    if (!device) return;
    try {
      if (!isWirelessDevice(device)) await enableDirectMode(device, () => {});
    } catch (err) {
      this.deps.log(`Direct mode arm failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private runLoop(intervalMs: number): void {
    this.timer = setInterval(() => { void this.tick(); }, intervalMs);
  }

  private renderNow(): Frame {
    if (this.engine.active) return this.engine.render(this.color);
    if (this.animationId) {
      const def = ANIMATIONS[this.animationId];
      if (!def) return new Map();
      return tintFrame(def.fn((performance.now() - this.animT0) / 1000), this.color);
    }
    return new Map();
  }

  private async tick(): Promise<void> {
    if (this.paused || !this.running) return;
    const frame = this.renderNow();
    this.frameListener?.(frame, this.engine.hits);

    const device = this.deps.getDevice();
    // No board plugged in is not an error — the effect keeps rendering for
    // the on-screen preview and picks the hardware back up on reconnect.
    if (!device || this.inFlight) return;
    this.inFlight = true; // HID writes must not overlap
    try {
      if (isWirelessDevice(device)) {
        await sendWirelessAnimationFrame(device, frame);
      } else {
        await sendDirectFrame(device, buildDirectFrame(frame));
      }
    } catch (err) {
      this.deps.log(`Effect error: ${err instanceof Error ? err.message : String(err)} — stopping`);
      await this.stop();
    } finally {
      this.inFlight = false;
    }
  }
}

function clampFps(fps: number): number {
  return Math.max(5, Math.min(30, Math.round(fps) || 20));
}
