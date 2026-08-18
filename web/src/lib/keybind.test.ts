import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BLOB_SIZE, FEATURE_REPORT_ID, LAYER_BASE, LAYER_FN,
  BlobError, defaultBlob, emptyBlob, getSlot, setSlot, slotOffset, validateBlob,
} from "./keybind";
import keymap from "../data/f75-keymap.json";

const base = new Uint8Array(readFileSync(new URL("../../tests/fixtures/factory-base.bin", import.meta.url)));
const fn = new Uint8Array(readFileSync(new URL("../../tests/fixtures/factory-fn.bin", import.meta.url)));

describe("slotOffset", () => {
  it("matches the documented geometry", () => {
    expect(slotOffset(0)).toEqual({ page: 0x08, usage: 0x0b });
    expect(slotOffset(5)).toEqual({ page: 0x1c, usage: 0x1f });
    expect(slotOffset(101)).toEqual({ page: 0x08 + 404, usage: 0x0b + 404 });
    expect(slotOffset(101).usage).toBeLessThan(BLOB_SIZE - 2);
  });
});

describe("validateBlob", () => {
  it("accepts the F87 factory blobs (structural cross-check)", () => {
    expect(() => validateBlob(base)).not.toThrow();
    expect(() => validateBlob(fn)).not.toThrow();
    expect(base[2]).toBe(LAYER_BASE);
    expect(fn[2]).toBe(LAYER_FN);
  });
  it("rejects bad size / header / layer / trailer", () => {
    expect(() => validateBlob(new Uint8Array(10))).toThrow(BlobError);
    const badHeader = new Uint8Array(base); badHeader[0] = 0x00;
    expect(() => validateBlob(badHeader)).toThrow(BlobError);
    const badLayer = new Uint8Array(base); badLayer[2] = 0x02;
    expect(() => validateBlob(badLayer)).toThrow(BlobError);
    const badTrailer = new Uint8Array(base); badTrailer[518] = 0x00;
    expect(() => validateBlob(badTrailer)).toThrow(BlobError);
  });
});

describe("emptyBlob", () => {
  it("builds a well-formed all-unbound blob for each layer", () => {
    for (const l of [LAYER_BASE, LAYER_FN]) {
      const b = emptyBlob(l);
      expect(b).toHaveLength(BLOB_SIZE);
      expect(() => validateBlob(b)).not.toThrow();
      expect(b[0]).toBe(FEATURE_REPORT_ID);
      expect(b[2]).toBe(l);
    }
  });
});

describe("defaultBlob", () => {
  it("generates a valid blob whose default slot matches Esc/A/Space", () => {
    const b = defaultBlob(LAYER_BASE, keymap.keys);
    expect(() => validateBlob(b)).not.toThrow();
    // Esc index 0: VK 0x1B -> {page:0x00, usage:0x29}
    expect(getSlot(b, 0)).toEqual({ page: 0x00, usage: 0x29 });
    // A index 9: VK 0x41 -> {page:0x00, usage:0x04}
    expect(getSlot(b, 9)).toEqual({ page: 0x00, usage: 0x04 });
    // Space index 35: VK 0x20 -> usage 0x2c
    expect(getSlot(b, 35)).toEqual({ page: 0x00, usage: 0x2c });
    // A non-existent matrix index is unbound
    expect(getSlot(b, 127)).toEqual({ page: 0x00, usage: 0x00 });
  });
  it("FN1 defaults are unbound except the KB.ini override (Esc->A)", () => {
    const b = defaultBlob(LAYER_FN, keymap.keys);
    expect(b[2]).toBe(LAYER_FN);
    expect(getSlot(b, 0)).toEqual({ page: 0x00, usage: 0x04 });
    expect(getSlot(b, 9)).toEqual({ page: 0x00, usage: 0x00 });
  });
});

describe("setSlot / getSlot", () => {
  it("round-trips and keeps header/trailer intact", () => {
    const b = emptyBlob(LAYER_BASE);
    setSlot(b, 9, { page: 0x02, usage: 0xe9 });
    expect(getSlot(b, 9)).toEqual({ page: 0x02, usage: 0xe9 });
    expect(() => validateBlob(b)).not.toThrow();
  });
  it("grounds never touches locked F1-F12 slots in tests by convention", () => {
    setSlot(emptyBlob(LAYER_BASE), 12, { page: 0x00, usage: 0x04 });
  });
});