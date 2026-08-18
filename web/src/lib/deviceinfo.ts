import { WIRED_PID, WIRELESS_PID } from "./protocol";

export type Connection = "wired" | "wireless" | "unknown";

export function parseConfigFrames(config: (Uint8Array | null)[]): number {
  return config.filter((c) => c !== null).length;
}

export function connectionLabel(pid: number): Connection {
  if (pid === WIRED_PID) return "wired";
  if (pid === WIRELESS_PID) return "wireless";
  return "unknown";
}