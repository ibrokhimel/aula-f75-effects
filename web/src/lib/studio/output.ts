import type { Frame } from '../animations';

// A single renderer publishes frames. Thumbnails and hidden previews never own output.
let sink: ((frame: Frame | null) => void) | null = null;
let gameSink: ((frame: Frame | null) => void) | null = null;
let nativePreview: Frame | null = null;
const previewListeners = new Set<() => void>();
export function subscribeNativePreview(listener: () => void) { previewListeners.add(listener); return () => { previewListeners.delete(listener); }; }
export function setNativePreview(frame: Frame | null) { nativePreview = frame; previewListeners.forEach(fn => fn()); }
export function getNativePreview() { return nativePreview; }
export function setStudioFrameSink(next: typeof sink) { sink = next; return () => { if (sink === next) sink = null; }; }
export function publishStudioFrame(frame: Frame) { sink?.(frame); }
export function setGameFrameSink(next: typeof gameSink) { gameSink = next; return () => { if (gameSink === next) gameSink = null; }; }
export function publishGameFrame(frame: Frame | null) { gameSink?.(frame); }
