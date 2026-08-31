/**
 * Renderer-side access to the desktop app.
 *
 * The Electron preload script exposes a two-function message bridge as
 * `window.f75Native`; everything typed is built here, in ordinary page code,
 * so no structured object ever has to survive the context-isolation
 * serializer. In a plain browser `window.f75Native` is absent and every
 * component falls back to its web behaviour.
 */

import {
  CH, EV,
  type FramePayload, type NativeStatus, type ProxyCollectionInfo,
} from './native-ipc';

interface RawBridge {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  /** Returns an unsubscribe function. */
  on(channel: string, cb: (...args: unknown[]) => void): () => void;
}

function bridge(): RawBridge | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { f75Native?: RawBridge }).f75Native ?? null;
}

/** True when running inside the desktop app. */
export const isNative = () => bridge() !== null;

export async function nativeStatus(): Promise<NativeStatus> {
  return await bridge()!.invoke(CH.status) as NativeStatus;
}

export function onNativeStatus(cb: (s: NativeStatus) => void): () => void {
  const b = bridge();
  if (!b) return () => {};
  return b.on(EV.status, (s) => cb(s as NativeStatus));
}

export function onNativeLog(cb: (line: string) => void): () => void {
  const b = bridge();
  if (!b) return () => {};
  return b.on(EV.log, (line) => cb(line as string));
}

/**
 * Stream engine frames (reactive effects render in the main process, so the
 * on-screen preview mirrors them rather than re-deriving them). The watch is
 * reference-counted by the main process per window; unsubscribe when done.
 */
export function watchNativeFrames(
  cb: (f: Map<number, [number, number, number]>, hits: number) => void,
): () => void {
  const b = bridge();
  if (!b) return () => {};
  const off = b.on(EV.frame, (raw) => {
    const { entries, hits } = raw as FramePayload;
    const m = new Map<number, [number, number, number]>();
    for (const [led, r, g, bch] of entries) m.set(led, [r, g, bch]);
    cb(m, hits);
  });
  void b.invoke(CH.watchFrames, true);
  return () => {
    void b.invoke(CH.watchFrames, false);
    off();
  };
}

export const nativeStartReactive = (id: string) => bridge()!.invoke(CH.startReactive, id);
export const nativeStartAnimation = (id: string, fps: number) => bridge()!.invoke(CH.startAnimation, id, fps);
export const nativeStopEffects = () => bridge()!.invoke(CH.stopEffects);
export const nativeSetColor = (hex: string | null) => bridge()!.invoke(CH.setColor, hex);
export const nativeSetFps = (fps: number) => bridge()!.invoke(CH.setFps, fps);
export const nativeGetAutostart = async () => await bridge()!.invoke(CH.getAutostart) as boolean;
export const nativeSetAutostart = (on: boolean) => bridge()!.invoke(CH.setAutostart, on);
export const nativeReconnect = () => bridge()!.invoke(CH.reconnect);

// ── HIDDevice proxy ─────────────────────────────────────────────────────
// The config panels' lib functions all take a `HIDDevice` and use only four
// primitives plus `collections` metadata. This object forwards those over
// IPC to the node-hid transport in the main process — TypeScript structural
// typing does the rest, so none of the lib code knows the difference.

type InputReportListener = (e: {
  reportId: number;
  data: DataView;
  device: unknown;
}) => void;

export function makeNativeDevice(status: NativeStatus): { device: HIDDevice; dispose: () => void } {
  const b = bridge()!;
  const listeners = new Set<InputReportListener>();

  const offInput = b.on(EV.inputReport, (raw) => {
    const { reportId, data } = raw as { reportId: number; data: Uint8Array };
    // Copy so the DataView's buffer is exactly the payload — webhid.ts reads
    // `e.data.buffer` wholesale and assumes offset 0.
    const copy = new Uint8Array(data);
    for (const fn of [...listeners]) {
      fn({ reportId, data: new DataView(copy.buffer), device: dev });
    }
  });

  const collections = (status.collections ?? []).map((c: ProxyCollectionInfo) => ({
    usagePage: c.usagePage,
    usage: 1,
    outputReports: c.outputReportIds.map((reportId) => ({ reportId })),
    featureReports: c.featureReportIds.map((reportId) => ({ reportId })),
    inputReports: [],
    children: [],
  }));

  const toU8 = (data: BufferSource): Uint8Array =>
    data instanceof Uint8Array ? data
      : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);

  const dev = {
    opened: true,
    vendorId: status.vendorId ?? 0,
    productId: status.productId ?? 0,
    productName: status.productName ?? 'AULA F75',
    collections,
    open: async () => {},
    close: async () => {},
    forget: async () => {},
    sendReport: async (reportId: number, data: BufferSource) => {
      await b.invoke(CH.hidSendReport, reportId, toU8(data));
    },
    sendFeatureReport: async (reportId: number, data: BufferSource) => {
      await b.invoke(CH.hidSendFeature, reportId, toU8(data));
    },
    receiveFeatureReport: async (reportId: number) => {
      const out = await b.invoke(CH.hidReceiveFeature, reportId) as Uint8Array;
      const copy = new Uint8Array(out);
      return new DataView(copy.buffer);
    },
    addEventListener: (type: string, fn: unknown) => {
      if (type === 'inputreport') listeners.add(fn as InputReportListener);
    },
    removeEventListener: (type: string, fn: unknown) => {
      if (type === 'inputreport') listeners.delete(fn as InputReportListener);
    },
    dispatchEvent: () => true,
    oninputreport: null,
  };

  return {
    device: dev as unknown as HIDDevice,
    dispose: () => { listeners.clear(); offInput(); },
  };
}
