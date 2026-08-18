import { describe, expect, it } from "vitest";
import { MACRO_SUPPORTED, captureKeyPress, macroBlob, type Macro } from "./macros";

const ev = (key: string, code: string) => ({ key, code }) as unknown as KeyboardEvent;

describe("macros (local-first)", () => {
  it("captures a plain key as HID usage", () => {
    expect(captureKeyPress(ev("a", "KeyA")).keyCode).toBe("hida");
  });
  it("captures an Enter as enter", () => {
    expect(captureKeyPress(ev("Enter", "Enter")).keyCode).toBe("enter");
  });
  it("serializes to a stable local blob", () => {
    const m: Macro = { id: "m1", name: "jump", steps: [
      { type: "key", keyCode: "space", ms: 0 }, { type: "delay", keyCode: "", ms: 50 },
    ]};
    const blob = macroBlob(m);
    expect(blob.length).toBeGreaterThan(0);
    expect(new TextDecoder().decode(blob)).toContain("jump");
  });
  it("flags device-write as unsupported until protocol captured", () => {
    expect(MACRO_SUPPORTED).toBe(false);
  });
});