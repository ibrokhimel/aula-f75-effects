export interface TraceEnv {
  userAgent: string;
  platform: string;
  secureContext: boolean;
  webhidAvailable: boolean;
  locale: string;
  timezone: string;
}

export interface TraceInput {
  status: string;
  connected: boolean;
  logs: string[];
  device: HIDDevice | null;
  env: TraceEnv;
}

export function collectEnv(): TraceEnv {
  const nav = typeof navigator !== "undefined" ? navigator : ({} as Navigator);
  return {
    userAgent: nav.userAgent ?? "unknown",
    platform: nav.platform ?? "unknown",
    secureContext: typeof isSecureContext !== "undefined" ? isSecureContext : false,
    webhidAvailable: !!("hid" in nav),
    locale: nav.language ?? "unknown",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "unknown",
  };
}

function hex(n: number): string {
  return n.toString(16).padStart(4, "0");
}

function describeCollections(device: HIDDevice): string[] {
  const lines: string[] = [];
  for (const c of device.collections) {
    const page = `0x${(c.usagePage ?? 0).toString(16)}`;
    const out = (c.outputReports ?? []).map(r => `0x${(r.reportId ?? 0).toString(16)}`);
    const feat = (c.featureReports ?? []).map(r => `0x${(r.reportId ?? 0).toString(16)}`);
    lines.push(`collection page ${page}: out=[${out}] feat=[${feat}]`);
  }
  return lines;
}

export function buildTrace({ status, connected, logs, device, env }: TraceInput): string {
  const lines: string[] = [];
  lines.push("# AULA F75 controller trace");
  lines.push(`created: ${new Date().toISOString()}`);
  lines.push(`user-agent: ${env.userAgent}`);
  lines.push(`platform: ${env.platform}`);
  lines.push(`locale: ${env.locale}`);
  lines.push(`timezone: ${env.timezone}`);
  lines.push(`secure-context: ${env.secureContext}`);
  lines.push(`webhid-available: ${env.webhidAvailable}`);
  lines.push(`connected: ${connected}`);
  if (device) {
    const vid = hex(device.vendorId);
    const pid = hex(device.productId);
    lines.push(`device: ${device.productName || "(unnamed)"} (${vid}:${pid})`);
    lines.push(`opened: ${device.opened}`);
    for (const line of describeCollections(device)) lines.push(line);
  } else {
    lines.push("device: (none)");
  }
  lines.push(`status: ${status}`);
  lines.push("");
  lines.push(`# log (${logs.length} entries)`);
  for (const entry of logs) lines.push(entry);
  return lines.join("\n") + "\n";
}

export function downloadTrace(content: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `f75-trace-${stamp}.trace`;
  a.click();
  URL.revokeObjectURL(url);
}
