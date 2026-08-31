/**
 * The IPC contract between the desktop app's main process and the UI.
 *
 * Shared by both sides — the renderer (via native.ts) and the Electron main
 * process import these names from the same module, so a channel cannot be
 * renamed on one side only. Pure data: no Electron, no DOM.
 */

/** Channels the renderer invokes (request/response). */
export const CH = {
  /** () → NativeStatus */
  status: 'f75:status',
  /** (id: string) → void — start a reactive effect (stops any animation). */
  startReactive: 'f75:start-reactive',
  /** (id: string, fps: number) → void — start an animation (stops reactive). */
  startAnimation: 'f75:start-animation',
  /** () → void — stop whatever effect is running. */
  stopEffects: 'f75:stop-effects',
  /** (hex: string | null) → void — single-colour override; null = colorful. */
  setColor: 'f75:set-color',
  /** (fps: number) → void — animation frame rate. */
  setFps: 'f75:set-fps',
  /** () → boolean / (on: boolean) → void — start with Windows. */
  getAutostart: 'f75:get-autostart',
  setAutostart: 'f75:set-autostart',
  /** () → void — drop and re-enumerate the HID connection. */
  reconnect: 'f75:reconnect',
  /** (on: boolean) → void — renderer wants engine frames streamed. */
  watchFrames: 'f75:watch-frames',

  // HID proxy for the config panels. The main process owns the device; these
  // forward the four primitives the web libs use.
  hidSendReport: 'f75:hid-send-report',
  hidSendFeature: 'f75:hid-send-feature',
  hidReceiveFeature: 'f75:hid-receive-feature',
} as const;

/** Channels the main process pushes to the renderer. */
export const EV = {
  /**
   * NativeStatus — connection or engine state changed. Emitted on state
   * transitions only, never per keystroke; the fast-moving hits counter
   * rides on the frame stream instead.
   */
  status: 'f75:ev-status',
  /** FramePayload — one engine frame, only while watched. */
  frame: 'f75:ev-frame',
  /** { reportId: number; data: Uint8Array } — device input report. */
  inputReport: 'f75:ev-input-report',
  /** string — a log line from the main process. */
  log: 'f75:ev-log',
} as const;

export type FrameEntry = [led: number, r: number, g: number, b: number];

export interface FramePayload {
  entries: FrameEntry[];
  /** Presses recorded since the reactive effect started; 0 for animations. */
  hits: number;
}

export interface NativeStatus {
  connected: boolean;
  productName: string | null;
  vendorId: number | null;
  productId: number | null;
  transport: 'wired' | 'wireless' | null;
  /** Active reactive effect id, or null. */
  reactive: string | null;
  /** Active animation id, or null. */
  animation: string | null;
  /** Presses recorded since the reactive effect started. */
  hits: number;
  /** '#rrggbb' single-colour override, or null for colorful. */
  color: string | null;
  fps: number;
  paused: boolean;
  /** Whether the global keyboard hook is delivering events. */
  hookOk: boolean;
  hookError: string | null;
  /** Synthetic collection info for the HID proxy; null while disconnected. */
  collections: ProxyCollectionInfo[] | null;
}

/**
 * What the renderer needs to fake a `device.collections` array. node-hid
 * cannot read report lists, so the main process fills this from the known
 * F75 descriptor rather than from the device.
 */
export interface ProxyCollectionInfo {
  usagePage: number;
  outputReportIds: number[];
  featureReportIds: number[];
}
