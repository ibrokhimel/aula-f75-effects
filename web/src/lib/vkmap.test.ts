import { describe, expect, it } from "vitest";
import { vkToOutput, outputToName } from "./vkmap";
import keymap from "../data/f75-keymap.json";

describe("vkToOutput", () => {
  it("maps the F75 base-layer defaults (spot checks from KB.ini)", () => {
    expect(vkToOutput(0x1b)).toEqual({ page: 0x00, usage: 0x29 });    // Esc
    expect(vkToOutput(0x70)).toEqual({ page: 0x00, usage: 0x3a });    // F1
    expect(vkToOutput(0x7b)).toEqual({ page: 0x00, usage: 0x45 });    // F12
    expect(vkToOutput(0x41)).toEqual({ page: 0x00, usage: 0x04 });    // A
    expect(vkToOutput(0x31)).toEqual({ page: 0x00, usage: 0x1e });    // 1
    expect(vkToOutput(0x30)).toEqual({ page: 0x00, usage: 0x27 });    // 0
    expect(vkToOutput(0x20)).toEqual({ page: 0x00, usage: 0x2c });    // Space
    expect(vkToOutput(0x26)).toEqual({ page: 0x00, usage: 0x52 });    // ↑
    expect(vkToOutput(0xaf)).toEqual({ page: 0x02, usage: 0xe9 });    // Volume +
    expect(vkToOutput(0xae)).toEqual({ page: 0x02, usage: 0xea });    // Volume -
    expect(vkToOutput(0xad)).toEqual({ page: 0x02, usage: 0xe2 });    // Mute
    expect(vkToOutput(0x00)).toBeNull();
  });

  it("produces a usable output for every F75 base-layer default VK", () => {
    for (const k of keymap.keys) {
      const o = vkToOutput(k.vk);
      expect(o, `unmapped VK 0x${k.vk.toString(16)} for ${k.name}`).not.toBeNull();
    }
  });
});

describe("outputToName", () => {
  it("names key and consumer outputs", () => {
    expect(outputToName({ page: 0x00, usage: 0x29 })).toBe("Esc");
    expect(outputToName({ page: 0x00, usage: 0x00 })).toBe("(none)");
    expect(outputToName({ page: 0x02, usage: 0xe9 })).toBe("Volume +");
    expect(outputToName({ page: 0x02, usage: 0xe2 })).toBe("Mute");
  });
});