import { vkToOutput, type Output } from "./vkmap";

export type F75Key = {
  index: number;
  vk: number;
  x: number;
  y: number;
  w: number;
  h: number;
  fnHid: number[] | null;
  locked: boolean;
  name: string;
  label: string;
};

export const FEATURE_REPORT_ID = 0x06;
export const BLOB_SIZE = 520;
export const LAYER_BASE = 0x00 as const;
export const LAYER_FN = 0x01 as const;
export const LAYER_OFFSET = 2;
export type Layer = typeof LAYER_BASE | typeof LAYER_FN;

const TRAILER = 0xa5;

export class BlobError extends Error {}

export function slotOffset(index: number): { page: number; usage: number } {
  return { page: 0x08 + 4 * index, usage: 0x0b + 4 * index };
}

function slotInRange(index: number): boolean {
  return slotOffset(index).usage < BLOB_SIZE - 2;
}

export function validateBlob(blob: Uint8Array): void {
  if (blob.length !== BLOB_SIZE) throw new BlobError(`Blob must be ${BLOB_SIZE} bytes (got ${blob.length}).`);
  const fixed: Array<[number, number]> = [[0, 0x06], [1, 0x03], [3, 0x00], [4, 0x01], [5, 0x00]];
  for (const [off, want] of fixed) if (blob[off] !== want) throw new BlobError(`Header byte ${off}: expected 0x${want.toString(16).padStart(2, "0")}.`);
  if (blob[2] !== LAYER_BASE && blob[2] !== LAYER_FN) throw new BlobError(`Unknown layer byte 0x${blob[2].toString(16)}.`);
  if (blob[BLOB_SIZE - 2] !== 0x5a || blob[BLOB_SIZE - 1] !== TRAILER) throw new BlobError("Trailer mismatch.");
}

export function emptyBlob(layer: Layer): Uint8Array {
  const b = new Uint8Array(BLOB_SIZE);
  b[0] = FEATURE_REPORT_ID; b[1] = 0x03; b[2] = layer; b[3] = 0x00;
  b[4] = 0x01; b[5] = 0x00; b[6] = 0x00; b[7] = 0xff;
  b[BLOB_SIZE - 2] = 0x5a; b[BLOB_SIZE - 1] = TRAILER;
  return b;
}

export function defaultBlob(layer: Layer, keys: F75Key[]): Uint8Array {
  const b = emptyBlob(layer);
  for (const k of keys) {
    if (k.locked) continue;
    if (layer === LAYER_BASE) {
      const o = vkToOutput(k.vk);
      if (o) setSlot(b, k.index, o);
    } else if (k.fnHid) {
      setSlot(b, k.index, { page: k.fnHid[0], usage: k.fnHid[1] });
    }
  }
  return b;
}

export function defaultForKey(layer: Layer, k: F75Key, vkToOutput: (vk: number) => Output | null): Output {
    if (layer === LAYER_BASE) return vkToOutput(k.vk) ?? { page: 0x00, usage: 0x00 };
    return k.fnHid ? { page: k.fnHid[0], usage: k.fnHid[1] } : { page: 0x00, usage: 0x00 };
}

export function setSlot(blob: Uint8Array, index: number, out: Output): void {
  if (!slotInRange(index)) throw new BlobError(`Slot index ${index} out of range.`);
  const { page, usage } = slotOffset(index);
  blob[page] = out.page;
  blob[page + 1] = 0x00;
  blob[page + 2] = 0x00;
  blob[usage] = out.usage;
}

export function getSlot(blob: Uint8Array, index: number): Output {
  if (!slotInRange(index)) return { page: 0x00, usage: 0x00 };
  const { page, usage } = slotOffset(index);
  return { page: blob[page], usage: blob[usage] };
}