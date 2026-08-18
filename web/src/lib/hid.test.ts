import { describe, expect, it, vi } from "vitest";
import { writeKeybindBlob } from "./webhid";
import { BLOB_SIZE, LAYER_BASE, LAYER_FN, LAYER_OFFSET, emptyBlob } from "./keybind";

class FakeDevice {
  opened = true;
  sent: Array<[number, Uint8Array]> = [];
  async sendFeatureReport(id: number, data: Uint8Array) { this.sent.push([id, data]); }
  async close() {}
}
const log = vi.fn();

type FakeHID = FakeDevice & HIDDevice;

describe("writeKeybindBlob", () => {
  it("sends feature report 0x06 with the 519-byte body", async () => {
    const d = new FakeDevice() as unknown as FakeHID;
    const blob = emptyBlob(LAYER_BASE);
    await writeKeybindBlob(d, LAYER_BASE, blob, log);
    const [id, body] = d.sent[0];
    expect(id).toBe(0x06);
    expect(body).toHaveLength(BLOB_SIZE - 1);
    expect(body[LAYER_OFFSET - 1]).toBe(LAYER_BASE); // layer byte shifted down one after stripping report id
  });
  it("rejects a layer/header mismatch", async () => {
    const d = new FakeDevice() as unknown as HIDDevice;
    await expect(writeKeybindBlob(d, LAYER_FN, emptyBlob(LAYER_BASE), log))
      .rejects.toThrow(/Layer byte mismatch/);
  });
  it("rejects a short blob", async () => {
    const d = new FakeDevice() as unknown as HIDDevice;
    await expect(writeKeybindBlob(d, LAYER_BASE, new Uint8Array(10), log))
      .rejects.toThrow(/520 bytes/);
  });
});