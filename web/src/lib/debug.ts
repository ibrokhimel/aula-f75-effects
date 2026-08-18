import type { LogFn } from "./webhid";
import { txRx } from "./webhid";

// Send an arbitrary 20-byte frame (space-separated hex; byte 0 = report id,
// e.g. 0x13) via the fork's txRx and return the human-readable reply.
export async function sendRaw(device: HIDDevice, frameHex: string, log: LogFn): Promise<string> {
  const bytes = frameHex.trim().split(/\s+/).map((x) => parseInt(x, 16));
  if (bytes.length !== 20) throw new Error("Raw frames must be exactly 20 bytes (report id + 19).");
  const reply = await txRx(device, new Uint8Array(bytes), log);
  return reply ? Array.from(reply).map((b) => b.toString(16).padStart(2, "0")).join(" ") : "(no reply)";
}