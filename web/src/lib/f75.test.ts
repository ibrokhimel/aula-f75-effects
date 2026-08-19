import { describe, expect, it, vi } from "vitest";
import { buildFrame, extractData, readConfigRegion, writeConfigRegion, readRegion } from "./f75";
import { FEATURE_REPORT_ID, CMD_READ_REGION, CMD_WRITE_REGION, CFG_LEN } from "./f75";

class FakeDevice {
  opened = true;
  sent: Array<[number, Uint8Array, string?]> = [];
  replies: Uint8Array[] = [];
  async sendFeatureReport(id: number, data: Uint8Array) { this.sent.push([id, data]); }
  async receiveFeatureReport(): Promise<DataView> {
    const full = new Uint8Array(520);
    if (this.replies.length > 0) full.set(this.replies.shift()!, 0);
    return new DataView(full.buffer);
  }
  async close() {}
}
type FakeHID = FakeDevice & HIDDevice;
const log = vi.fn();

describe("buildFrame", () => {
  it("lays out header bytes 0x06 cmd addr len", () => {
    const f = buildFrame(CMD_READ_REGION, [0x00, 0x00, 0x01, 0x00], CFG_LEN);
    expect(f).toHaveLength(520);
    expect(f[0]).toBe(0x06);
    expect(f[1]).toBe(0x84);
    expect(f[2]).toBe(0x00); expect(f[3]).toBe(0x00); expect(f[4]).toBe(0x01); expect(f[5]).toBe(0x00);
    expect(f[6]).toBe(0x80); expect(f[7]).toBe(0x00); // len little-endian
    expect(f[8]).toBe(0x00); expect(f[519]).toBe(0x00);
  });
});

describe("extractData", () => {
  it("slices payload after the 8-byte header", () => {
    const r = new Uint8Array(520);
    for (let i = 8; i < 136; i++) r[i] = i;
    const d = extractData(r, 128);
    expect(d).toHaveLength(128);
    expect(d[0]).toBe(8); expect(d[127]).toBe(135);
  });
});

describe("readConfigRegion", () => {
  it("sends a 0x84 read request then strips payload to 128 bytes", async () => {
    const d = new FakeDevice() as unknown as FakeHID;
    const reply = new Uint8Array(520);
    for (let i = 0; i < 128; i++) reply[8 + i] = i;
    d.replies.push(reply);
    const out = await readConfigRegion(d, log);
    expect(d.sent).toHaveLength(1);
    expect(d.sent[0][0]).toBe(FEATURE_REPORT_ID);
    expect(d.sent[0][1][0]).toBe(CMD_READ_REGION);
    expect(out).not.toBeNull();
    expect(out![0]).toBe(0); expect(out![127]).toBe(127);
  });
});

describe("writeConfigRegion", () => {
  it("writes cmd 0x04 with the payload at offset 8", async () => {
    const d = new FakeDevice() as unknown as FakeHID;
    const data = new Uint8Array(128);
    data[0] = 0x11; data[127] = 0x22;
    await writeConfigRegion(d, data, log);
    const [id, body] = d.sent[0];
    expect(id).toBe(FEATURE_REPORT_ID);
    expect(body[0]).toBe(CMD_WRITE_REGION);
    expect(body[7]).toBe(0x11); // payload offset 8 → index 7 after slicing
    expect(body[134]).toBe(0x22); // data[127] lands at frame[135] → body[134]
  });
});

class FakeStuckDevice {
  opened = true;
  sent: Array<[number, Uint8Array]> = [];
  async sendFeatureReport(id: number, data: Uint8Array) { this.sent.push([id, data]); }
  async receiveFeatureReport(): Promise<DataView> {
    return new Promise<DataView>(() => {}); // never resolves — tests the timeout path
  }
  async close() {}
}
type FakeStuckHID = FakeStuckDevice & HIDDevice;

describe("readRegion", () => {
  it("timeouts when the device never replies", async () => {
    const d = new FakeStuckDevice() as unknown as FakeStuckHID;
    const out = await readRegion(d, CMD_READ_REGION, [0, 0, 1, 0], CFG_LEN, log, 50);
    expect(out).toBeNull();
  });
});