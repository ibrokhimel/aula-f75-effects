import type { Frame } from './colors';
import type { KeyboardLayout } from './layout';
import type { KeyboardBridge } from './bridge';

/** Hardware-free bridge for previews, adapter development, and tests. */
export class VirtualKeyboardBridge implements KeyboardBridge {
  readonly id = 'virtual';
  readonly name = 'Virtual keyboard';
  readonly capabilities = { perKeyRgb: true, maxFps: 60 };
  connected = false;
  frame: Frame = new Map();

  constructor(readonly layout: KeyboardLayout, private readonly onFrame?: (frame: Frame) => void) {}

  async connect(): Promise<void> { this.connected = true; }

  async writeFrame(frame: Frame): Promise<void> {
    if (!this.connected) throw new Error('Virtual keyboard is disconnected');
    this.frame = new Map(this.layout.leds.map(({ id }) => [id, [...(frame.get(id) ?? [0, 0, 0])]]));
    this.onFrame?.(this.frame);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.frame = new Map();
    this.onFrame?.(this.frame);
  }
}
