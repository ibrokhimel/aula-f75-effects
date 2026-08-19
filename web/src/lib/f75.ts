import { hex, WIRELESS_PID } from "./protocol";
import type { LogFn } from "./webhid";

export const FEATURE_REPORT_ID = 0x06;
export const CMD_WRITE_REGION = 0x04;
export const CMD_READ_REGION = 0x84;
export const CMD_WRITE_COLORS = 0x0a;
export const CMD_READ_COLORS = 0x8a;
export const CFG_ADDR = [0x00, 0x00, 0x01, 0x00];
export const CFG_LEN = 0x0080;
export const COLOR_LEN = 0x0200;
export const REPORT_SIZE = 520;
export const HEADER_SIZE = 8;

export function buildFrame(cmd: number, addr: number[], len: number): Uint8Array {
  const f = new Uint8Array(REPORT_SIZE);
  f[0] = FEATURE_REPORT_ID;
  f[1] = cmd;
  for (let i = 0; i < 4; i++) f[2 + i] = addr[i] ?? 0;
  f[6] = len & 0xff;
  f[7] = (len >> 8) & 0xff;
  return f;
}

export function extractData(report: Uint8Array, len: number, offset = HEADER_SIZE): Uint8Array {
  return report.slice(offset, offset + len);
}

export async function sendFeature(device: HIDDevice, frame: Uint8Array, log: LogFn) {
  await device.sendFeatureReport(FEATURE_REPORT_ID, frame.slice(1));
  log(`TX-FEATURE 0x06: ${hex(frame)}`);
}

export async function readRegion(
  device: HIDDevice, cmd: number, addr: number[], len: number, log: LogFn, timeoutMs = 800,
): Promise<Uint8Array | null> {
  await sendFeature(device, buildFrame(cmd, addr, len), log);
  try {
    const view = await withTimeout(device.receiveFeatureReport(FEATURE_REPORT_ID), timeoutMs);
    const full = new Uint8Array(REPORT_SIZE);
    new Uint8Array(view.buffer).forEach((b, i) => { if (i < REPORT_SIZE) full[i] = b; });
    log(`RX-FEATURE: ${hex(full)}`);
    return full;
  } catch {
    log("RX-FEATURE: (no reply)");
    return null;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function retry<T>(fn: () => Promise<T | null>, retries: number, log: LogFn, label: string): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    const r = await fn();
    if (r !== null) return r;
    if (i < retries - 1) { log(`  Retrying ${label} (${i + 2}/${retries})...`); await new Promise(r2 => setTimeout(r2, 150)); }
  }
  return null;
}

export async function readConfigRegion(device: HIDDevice, log: LogFn, retries = 3): Promise<Uint8Array | null> {
  const report = await retry(
    () => readRegion(device, CMD_READ_REGION, CFG_ADDR, CFG_LEN, log, 800),
    retries, log, "config read",
  );
  if (report === null) return null;
  const data = extractData(report, CFG_LEN);
  log(`Config region: ${hex(data)}`);
  return data;
}

export async function writeConfigRegion(device: HIDDevice, data: Uint8Array, log: LogFn) {
  const frame = buildFrame(CMD_WRITE_REGION, CFG_ADDR, CFG_LEN);
  frame.set(data, HEADER_SIZE);
  await sendFeature(device, frame, log);
}

export async function readColorTable(device: HIDDevice, log: LogFn): Promise<Uint8Array | null> {
  const report = await readRegion(device, CMD_READ_COLORS, CFG_ADDR, COLOR_LEN, log, 800);
  if (report === null) return null;
  const data = extractData(report, COLOR_LEN);
  log(`Color table: ${hex(data)}`);
  return data;
}

export async function writeColorTable(device: HIDDevice, data: Uint8Array, log: LogFn) {
  const frame = buildFrame(CMD_WRITE_COLORS, CFG_ADDR, COLOR_LEN);
  frame.set(data, HEADER_SIZE);
  await sendFeature(device, frame, log);
}

export function isFeatureTransport(pid: number): boolean {
  return pid !== WIRELESS_PID;
}