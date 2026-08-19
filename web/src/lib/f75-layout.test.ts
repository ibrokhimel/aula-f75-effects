import { describe, expect, it } from "vitest";
import { effectOffsetsFor, encodeBrightness, decodeBrightness, diffOffsets, classifySelect } from "./f75-layout";

describe("effectOffsetsFor", () => {
  it("places Ripple (id 7) at offsets 78-79 from the default table base", () => {
    expect(effectOffsetsFor(7)).toEqual({ bright: 78, speedColor: 79 });
  });
  it("is monotonic in id", () => {
    expect(effectOffsetsFor(3).bright).toBeLessThan(effectOffsetsFor(7).bright);
  });
});

describe("brightness encoding", () => {
  it("maps levels 0-4 to bytes 1,3,5,7,9 and back", () => {
    for (let lvl = 0; lvl <= 4; lvl++) expect(decodeBrightness(encodeBrightness(lvl))).toBe(lvl);
    expect(encodeBrightness(4)).toBe(9);
    expect(encodeBrightness(0)).toBe(1);
  });
});

describe("diffOffsets", () => {
  it("returns offsets that changed across probe readings", () => {
    const a = new Uint8Array(8); const b = new Uint8Array(8);
    a[3] = 1; b[3] = 2; b[5] = 9;
    expect(diffOffsets(new Map([[1, a], [2, b]]))).toEqual([3, 5]);
  });
});

describe("classifySelect", () => {
  it("finds the effect-select offset (varied, range-limited to 0-18, echoing a written id)", () => {
    const probes = new Map<number, Uint8Array>();
    for (const id of [1, 9, 18, 255]) {
      const r = new Uint8Array(16);
      r[15] = id; // select offset echoes in-range values and clamps 255 → 18
      if (id === 255) r[15] = 18;
      r[4] = id;   // plain storage offset echoes every value verbatim
      probes.set(id, r);
    }
    expect(classifySelect(probes)).toBe(15);
  });
  it("returns null when no offset is range-limited", () => {
    const probes = new Map<number, Uint8Array>();
    for (const id of [1, 9, 18, 255]) {
      const r = new Uint8Array(16); r[15] = id; probes.set(id, r);
    }
    expect(classifySelect(probes)).toBeNull();
  });
});
