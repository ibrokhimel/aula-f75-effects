/** Windows scheduling/input host. Effects and device packets live elsewhere. */
import { BridgeSession, EffectsEngine, type KeyboardBridge, type KeyboardLayout, type Frame } from '../../packages/engine/src';
import { hexToRgb } from '../../web/src/lib/protocol';
import { StudioRuntime, type StudioConfiguration } from '../../web/src/lib/studio/runtime';
import type { AudioInput, PixelSource, SystemSample } from '../../packages/engine/src';
import { startEffectEventServer } from './effect-events';
import type { Server } from 'node:http';

export interface EngineHostDeps {
  layout: KeyboardLayout;
  getBridge(): KeyboardBridge | null;
  log(line: string): void;
  onStateChange(): void;
  systemSample?(): SystemSample | null;
}

export class EngineHost {
  private readonly engine: EffectsEngine;
  private studio: StudioRuntime | null = null;
  private session: BridgeSession | null = null;
  private timer: NodeJS.Timeout | null = null;
  private frameListener: ((frame: Frame, hits: number) => void) | null = null;
  private operations: Promise<void> = Promise.resolve();
  private eventServer: Server | null = null;
  private resourceEventAt = -Infinity;
  colorHex: string | null = null;
  fps = 20;
  paused = false;

  constructor(private readonly deps: EngineHostDeps) {
    this.engine = new EffectsEngine(deps.layout, () => performance.now());
    this.engine.library.events.register({ id: 'system-telemetry', types: ['resource'], ttlMs: 5000 });
    const token = process.env.KEYBOARD_EFFECTS_EVENT_TOKEN;
    if (token) this.eventServer = startEffectEventServer(this.engine.library.events, {
      token, port: Number(process.env.KEYBOARD_EFFECTS_EVENT_PORT) || 9735, log: deps.log,
    });
  }

  get reactive(): string | null { return this.engine.reactive; }
  get animation(): string | null { return this.engine.animation; }
  get hits(): number { return this.studio ? this.studio.hits : this.engine.hits; }
  get running(): boolean { return this.studio ? this.studio.config.enabled && this.studio.config.playback !== 'stopped' : this.engine.running; }
  get studioConfiguration(): StudioConfiguration | null { return this.studio?.config ?? null; }
  get audio() { return this.engine.library.audio; }
  get events() { return this.engine.library.events; }

  keyDown(code: string, mods: number): void { if (this.studio) this.studio.keyDown(code, mods); else this.engine.keyDown(code, mods); }
  keyUp(code: string): void { if (this.studio) this.studio.keyUp(code); else this.engine.keyUp(code); }

  configureStudio(config: StudioConfiguration): Promise<void> {
    return this.enqueue(async () => {
      // Sharing the library routes desktop audio capture and app events into studio effects.
      if (!this.studio) { await this.stopInternal(); this.studio = new StudioRuntime(this.engine.library); }
      this.studio.configure(config);
      this.fps = clampFps(this.studio.config.fps);
      this.paused = this.studio.config.playback === 'paused';
      if (this.running) { if (!this.session) await this.armBridge(); }
      else await this.releaseBridge();
      if (this.paused && this.running) {
        const frame = this.studio.render(performance.now(), this.deps.systemSample?.() ?? null);
        this.frameListener?.(frame, this.hits); await this.session?.sendFrame(frame);
      }
      this.runLoop(); this.deps.onStateChange();
    });
  }
  /** feedLibrary is false when the sample already went into the shared library (desktop capture). */
  pushStudioAudio(sample: AudioInput, feedLibrary = true): void { this.studio?.pushAudio(sample, feedLibrary); }
  pushStudioScreen(pixels: PixelSource | null): void { this.studio?.pushScreen(pixels); }
  pushStudioGame(frame: Frame | null): void { this.studio?.pushGame(frame); }

  startReactive(id: string): Promise<void> {
    return this.enqueue(async () => {
      if (!this.engine.library.reactive[id]) { this.deps.log(`Unknown reactive effect: ${id}`); return; }
      await this.stopInternal();
      this.engine.startReactive(id);
      this.deps.log(`Reactive: ${this.engine.library.reactive[id].name} — type anywhere in Windows`);
      if (!this.paused) await this.armBridge();
      this.runLoop();
      this.deps.onStateChange();
    });
  }

  startAnimation(id: string, fps?: number): Promise<void> {
    return this.enqueue(async () => {
      if (!this.engine.library.animations[id]) { this.deps.log(`Unknown animation: ${id}`); return; }
      await this.stopInternal();
      if (fps !== undefined) this.fps = clampFps(fps);
      this.engine.startAnimation(id);
      this.deps.log(`Animation: ${this.engine.library.animations[id].name} at ${this.fps} fps`);
      if (!this.paused) await this.armBridge();
      this.runLoop();
      this.deps.onStateChange();
    });
  }

  stop(): Promise<void> {
    return this.enqueue(async () => {
      const was = this.running;
      await this.stopInternal();
      if (was) { this.deps.log('Effects stopped'); this.deps.onStateChange(); }
    });
  }

  setColor(hex: string | null): void {
    this.colorHex = hex;
    this.engine.color = hex ? hexToRgb(hex) : null;
  }

  setFps(fps: number): void {
    this.fps = clampFps(fps);
    if (this.animation && this.timer) this.runLoop();
  }

  setPaused(paused: boolean): Promise<void> {
    return this.enqueue(async () => {
      if (this.paused === paused) return;
      this.paused = paused;
      this.engine.releaseAll();
      if (this.studio) { this.studio.releaseAll(); this.studio.configure({ ...this.studio.config, playback: paused ? 'paused' : 'playing' }); }
      if (paused && !this.studio) await this.releaseBridge();
      else if (this.running && !this.session) await this.armBridge();
      this.deps.onStateChange();
    });
  }

  setFrameListener(fn: ((frame: Frame, hits: number) => void) | null): void {
    this.frameListener = fn;
  }

  onDeviceConnected(): Promise<void> {
    return this.enqueue(async () => {
      if (this.running && !this.paused) await this.armBridge();
    });
  }

  onDeviceDisconnected(): Promise<void> {
    this.engine.releaseAll();
    this.studio?.releaseAll();
    return this.enqueue(() => this.releaseBridge());
  }

  shutdown(): Promise<void> {
    this.eventServer?.close(); this.eventServer = null;
    return this.enqueue(() => this.stopInternal());
  }

  private async stopInternal(): Promise<void> {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.engine.stop();
    this.studio?.releaseAll(); this.studio = null;
    await this.releaseBridge();
  }

  private async releaseBridge(): Promise<void> {
    const session = this.session;
    this.session = null;
    try { await session?.disconnect(); } catch { /* The device may have been unplugged. */ }
  }

  private async armBridge(): Promise<void> {
    await this.releaseBridge();
    const bridge = this.deps.getBridge();
    if (!bridge) return;
    if (bridge.layout.id !== this.engine.layout.id) {
      this.deps.log(`Bridge layout ${bridge.layout.id} does not match engine layout ${this.engine.layout.id}`);
      return;
    }
    const session = new BridgeSession(bridge, () => performance.now());
    try {
      await session.connect();
      this.session = session;
    } catch (error) {
      this.deps.log(`Bridge connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private runLoop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => { void this.tick(); }, Math.ceil(1000 / (this.reactive ? 30 : this.fps)));
  }

  private async tick(): Promise<void> {
    if (this.paused || !this.running) return;
    const now = performance.now();
    if (this.deps.systemSample && now - this.resourceEventAt > 1000) {
      const sample = this.deps.systemSample();
      if (sample) this.events.push({ version: 1, id: `resource-${now}`, source: 'system-telemetry', at: now,
        type: 'resource', data: { cpu: sample.cpu, memory: sample.memory } });
      this.resourceEventAt = now;
    }
    const frame = this.studio ? this.studio.render(performance.now(), this.deps.systemSample?.() ?? null) : this.engine.render();
    this.frameListener?.(frame, this.hits);
    const session = this.session;
    if (!session) return;
    try { await session.sendFrame(frame); }
    catch (error) {
      // A late failure from an old connection must not stop a new effect.
      if (this.session !== session) return;
      this.deps.log(`Effect error: ${error instanceof Error ? error.message : String(error)} — stopping`);
      await this.stop();
    }
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    const pending = this.operations.then(action);
    this.operations = pending.catch(() => {});
    return pending;
  }
}

function clampFps(fps: number): number {
  return Number.isFinite(fps) ? Math.max(5, Math.min(30, Math.round(fps) || 20)) : 20;
}
