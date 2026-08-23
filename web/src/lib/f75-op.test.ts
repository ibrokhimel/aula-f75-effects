import { describe, expect, it, vi } from "vitest";
import { setSleepTimer, setDebounce, applyPerKey } from "./webhid";
import { isFeatureTransport } from "./f75";
import { WIRED_PID, SELF_DEFINE_EFFECT } from "./protocol";

class FakeFeatureDevice {
  productId = WIRED_PID;
  opened = true;
  region = new Uint8Array(128);
  writes: number[] = [];
  async sendFeatureReport(id: number, data: Uint8Array) {
    const frame = new Uint8Array(520); frame[0] = 0x06; frame.set(data, 1);
    if (frame[1] === 0x04) {
      this.region = frame.slice(8, 8 + 128);
      this.writes.push(frame[1]);
    } else if (frame[1] === 0x84) {
      this.writes.push(frame[1]);
    }
  }
  async receiveFeatureReport(): Promise<DataView> {
    const f = new Uint8Array(520); f[0] = 0x06; f.set(this.region, 8);
    return new DataView(f.buffer);
  }
}
type FH = FakeFeatureDevice & HIDDevice;
const log = vi.fn();

describe("feature branch dispatch", () => {
  it("uses only feature-report writes for wired settings ops (no output 0x13 / save)", async () => {
    expect(isFeatureTransport(WIRED_PID)).toBe(true);
    const d = new FakeFeatureDevice();
    d.region[80] = 7;
    await setSleepTimer(d as unknown as FH, 3, log);
    await setDebounce(d as unknown as FH, 2, log);
    expect(d.writes.every(cmd => cmd === 0x04 || cmd === 0x84)).toBe(true);
    expect(d.writes.some(cmd => cmd === 0x04)).toBe(true);
  });

  it("refuses to write an empty per-key map (would black the board out)", async () => {
    const d = new FakeFeatureDevice();
    await applyPerKey(d as unknown as FH, {}, log);
    expect(d.writes).toHaveLength(0);
  });

  it("per-key apply enters the self-define slot (22) before uploading colors", async () => {
    const d = new FakeFeatureDevice();
    d.region[10] = 3;
    await applyPerKey(d as unknown as FH, { 5: [255, 0, 0] }, log);
    expect(d.region[10]).toBe(SELF_DEFINE_EFFECT + 1);
  });
});