import { describe, expect, it } from "vitest";
import keymap from "./f75-keymap.json";

describe("f75-keymap.json", () => {
  it("has a version and source", () => {
    expect(keymap.version).toBe("1");
    expect(keymap.source).toContain("KB.ini");
  });

  it("contains 80 physical keys with unique matrix indices", () => {
    const idx = keymap.keys.map((k) => k.index);
    expect(idx).toHaveLength(80);
    expect(new Set(idx).size).toBe(80);
  });

  it("all indices are valid slot numbers (< 128) and non-negative", () => {
    for (const k of keymap.keys) {
      expect(k.index).toBeGreaterThanOrEqual(0);
      expect(k.index).toBeLessThan(128);
    }
  });

  it("locks exactly the F1–F12 row", () => {
    const locked = keymap.keys.filter((k) => k.locked).map((k) => k.index).sort((a, b) => a - b);
    expect(locked).toEqual([12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78]);
  });

  it("every key has a parses-to-VK default and geometry", () => {
    for (const k of keymap.keys) {
      expect(k.vk).toBeGreaterThan(0);
      expect(k.w).toBeGreaterThan(0);
      expect(k.h).toBeGreaterThan(0);
    }
  });
});