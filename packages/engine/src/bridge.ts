import type { Frame } from './colors';
import type { KeyboardLayout } from './layout';

/** A bridge owns device packets and direct-mode setup/cleanup, never effects. */
export interface KeyboardBridge {
  readonly id: string;
  readonly name: string;
  readonly layout: KeyboardLayout;
  readonly capabilities: {
    readonly perKeyRgb: boolean;
    readonly maxFps: number;
  };
  connect(): Promise<void>;
  /** A complete frame: LEDs missing from the map must be turned off. */
  writeFrame(frame: Frame): Promise<void>;
  /** Restore onboard lighting, but leave a host-owned USB handle open. */
  disconnect(): Promise<void>;
}

/** Serializes lifecycle operations and drops busy/too-fast frames. */
export class BridgeSession {
  private ready = false;
  private writing: Promise<void> | null = null;
  private lifecycle: Promise<void> = Promise.resolve();
  private lastFrameAt = -Infinity;
  private revision = 0;

  constructor(readonly bridge: KeyboardBridge, private readonly nowMs: () => number = () => Date.now()) {
    if (!bridge.capabilities.perKeyRgb) throw new Error('This bridge cannot stream per-key RGB');
    if (!Number.isFinite(bridge.capabilities.maxFps) || bridge.capabilities.maxFps <= 0) {
      throw new Error('Bridge maxFps must be a positive finite number');
    }
  }

  connect(): Promise<void> {
    this.ready = false;
    const revision = ++this.revision;
    return this.enqueue(async () => {
      if (this.writing) await this.writing.catch(() => {});
      try {
        await this.bridge.connect();
        this.lastFrameAt = -Infinity;
        this.ready = revision === this.revision;
      } catch (error) {
        await this.bridge.disconnect().catch(() => {});
        throw error;
      }
    });
  }

  /** False means the host should skip this frame, not queue old animation. */
  async sendFrame(frame: Frame): Promise<boolean> {
    if (!this.ready || this.writing) return false;
    const now = this.nowMs();
    if (now - this.lastFrameAt < 1000 / this.bridge.capabilities.maxFps) return false;
    this.lastFrameAt = now;
    // Defer invocation so even a bridge that throws synchronously is tracked.
    const pending = Promise.resolve().then(() => this.bridge.writeFrame(frame));
    this.writing = pending;
    try {
      await pending;
      return true;
    } catch (error) {
      this.ready = false;
      throw error;
    } finally {
      if (this.writing === pending) this.writing = null;
    }
  }

  disconnect(): Promise<void> {
    this.ready = false;
    this.revision++;
    return this.enqueue(async () => {
      this.ready = false;
      if (this.writing) await this.writing.catch(() => {});
      await this.bridge.disconnect();
    });
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    const pending = this.lifecycle.then(action);
    this.lifecycle = pending.catch(() => {});
    return pending;
  }
}
