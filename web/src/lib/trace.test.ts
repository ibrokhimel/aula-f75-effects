import { describe, expect, it } from "vitest";
import { buildTrace } from "./trace";

const base = {
  status: "Connected: Gaming Keyboard (258a:010c)",
  connected: true,
  logs: ["[12:00:00.000] Connected", "[12:00:01.000] ✓ Rainbow active!"],
  device: null,
  env: {
    userAgent: "TestBrowser/1.0",
    platform: "Linux x86_64",
    secureContext: true,
    webhidAvailable: true,
    locale: "en-US",
    timezone: "UTC",
  },
};

describe("buildTrace", () => {
  it("has an environment header, status line, and the full log", () => {
    const t = buildTrace(base);
    expect(t).toContain("# AULA F75 controller trace");
    expect(t).toContain("created: ");
    expect(t).toContain("user-agent: TestBrowser/1.0");
    expect(t).toContain("webhid-available: true");
    expect(t).toContain("connected: true");
    expect(t).toContain("status: Connected: Gaming Keyboard (258a:010c)");
    expect(t).toContain("[12:00:01.000] ✓ Rainbow active!");
  });

  it("describes the attached device including report collections", () => {
    const t = buildTrace({
      ...base,
      device: {
        productName: "Gaming Keyboard",
        vendorId: 0x258a,
        productId: 0x010c,
        opened: true,
        collections: [
          { usagePage: 0xff00, outputReports: [], featureReports: [{ reportId: 0x05 }, { reportId: 0x06 }] },
          { usagePage: 0x01, outputReports: [], featureReports: [] },
        ] as unknown as HIDReportItem[][],
      } as unknown as HIDDevice,
    });
    expect(t).toContain("device: Gaming Keyboard (258a:010c)");
    expect(t).toContain("opened: true");
    expect(t).toContain("collection page 0xff00: out=[] feat=[0x5,0x6]");
  });

  it("works without a device and reports none", () => {
    const t = buildTrace({ ...base, connected: false, device: null });
    expect(t).toContain("device: (none)");
  });
});
