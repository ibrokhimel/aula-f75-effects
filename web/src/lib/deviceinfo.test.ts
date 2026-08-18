import { describe, expect, it } from "vitest";
import { WIRED_PID, WIRELESS_PID } from "./protocol";
import { connectionLabel, parseConfigFrames } from "./deviceinfo";

describe("deviceinfo", () => {
  it("counts the config frames that were read", () => {
    const cfg = new Array<(Uint8Array | null)>(10).fill(null);
    cfg[3] = new Uint8Array(19);
    cfg[7] = new Uint8Array(19);
    expect(parseConfigFrames(cfg)).toBe(2);
  });
  it("reports 0 frames when nothing was read", () => {
    expect(parseConfigFrames(new Array(10).fill(null))).toBe(0);
  });
  it("labels the connection from the product ID", () => {
    expect(connectionLabel(WIRED_PID)).toBe("wired");
    expect(connectionLabel(WIRELESS_PID)).toBe("wireless");
    expect(connectionLabel(0x0000)).toBe("unknown");
  });
});