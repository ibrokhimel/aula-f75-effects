import { describe, expect, it } from "vitest";
import { defaultForKey, LAYER_BASE, LAYER_FN } from "./keybind";
import { vkToOutput } from "./vkmap";
import keymap from "../data/f75-keymap.json";

type KeyMapKey = (typeof keymap.keys)[number];

describe("defaultForKey", () => {
  it("resolves base-layer defaults from VK", () => {
    const esc = keymap.keys.find((k) => k.name === "esc") as KeyMapKey;
    expect(defaultForKey(LAYER_BASE, esc, vkToOutput)).toEqual({ page: 0x00, usage: 0x29 });
  });
  it("resolves FN1 default from the keymap's fnHid override, or unbound when absent", () => {
    // The FN-layer oracle is Task 2's KB.ini-derived fnHid, not hardcoded usages.
    const esc = keymap.keys.find((k) => k.name === "esc") as KeyMapKey;
    const expected = esc.fnHid
      ? { page: esc.fnHid[0], usage: esc.fnHid[1] }
      : { page: 0x00, usage: 0x00 };
    expect(defaultForKey(LAYER_FN, esc, vkToOutput)).toEqual(expected);
  });
});