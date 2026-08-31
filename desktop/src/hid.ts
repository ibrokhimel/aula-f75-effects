/**
 * node-hid transport for the AULA F75, presenting the same `HIDDevice` shape
 * the shared web libs were written against, so direct-mode/wireless-mode/f75
 * code runs in the main process unchanged.
 *
 * Windows exposes each top-level HID collection as its own device path, and
 * the F75 spreads its vendor traffic across several (the 520-byte feature
 * reports and the 0x13 output reports live on different collections).
 * WebHID hides that by opening the whole interface; this transport does the
 * same by opening every vendor collection and routing each report id to
 * whichever handle accepts it, remembered after the first success.
 */
import HID from 'node-hid';
import {
  WIRED_VID, WIRED_PID, WIRELESS_VID, WIRELESS_PID,
} from '../../web/src/lib/protocol';
import type { ProxyCollectionInfo } from '../../web/src/lib/native-ipc';

const VENDOR_PAGE_MIN = 0xff00;
const VENDOR_PAGE_MAX = 0xff04;
/** Windows GetFeature wants the full report length, report-id byte included. */
const FEATURE_REPORT_LEN = 520;
const RECONNECT_POLL_MS = 3000;

export interface HidTransportEvents {
  log(line: string): void;
  onInputReport(reportId: number, data: Uint8Array): void;
  onConnect(): void;
  onDisconnect(): void;
}

interface Handle {
  dev: HID.HID;
  info: HID.Device;
}

type Op = 'out' | 'feat-set' | 'feat-get';

export class HidTransport {
  private handles: Handle[] = [];
  private info: HID.Device | null = null;
  /** Which handle serves each (operation, reportId), learned by trying. */
  private route = new Map<string, number>();
  private pollTimer: NodeJS.Timeout | null = null;
  private closing = false;

  constructor(private readonly ev: HidTransportEvents) {}

  start(): void {
    this.tryConnect();
    // One poll serves both directions: find the keyboard when disconnected,
    // and notice an unplug (write-only collections never error on removal,
    // so enumeration is the reliable signal).
    this.pollTimer = setInterval(() => {
      if (this.handles.length === 0) {
        this.tryConnect();
        return;
      }
      const ourPath = this.handles[0].info.path;
      try {
        if (!HID.devices().some((d) => d.path === ourPath)) {
          this.ev.log('Keyboard unplugged');
          this.dropDevice(true);
        }
      } catch { /* enumeration hiccup — try again next poll */ }
    }, RECONNECT_POLL_MS);
  }

  stop(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    this.dropDevice(false);
  }

  get connected(): boolean { return this.handles.length > 0; }
  get vendorId(): number | null { return this.info?.vendorId ?? null; }
  get productId(): number | null { return this.info?.productId ?? null; }
  get productName(): string | null { return this.info?.product ?? null; }
  get transport(): 'wired' | 'wireless' | null {
    if (!this.info) return null;
    return this.info.productId === WIRELESS_PID ? 'wireless' : 'wired';
  }

  /**
   * Synthetic collection metadata for the renderer's HIDDevice proxy —
   * node-hid cannot enumerate report ids, so this is the known F75 layout.
   */
  proxyCollections(): ProxyCollectionInfo[] | null {
    if (!this.info) return null;
    return this.handles.map((h) => ({
      usagePage: h.info.usagePage ?? VENDOR_PAGE_MIN,
      outputReportIds: [0x13],
      featureReportIds: [0x06, 0x39, 0x3c],
    }));
  }

  reconnect(): void {
    this.dropDevice(true);
    this.tryConnect();
  }

  private tryConnect(): void {
    let all: HID.Device[];
    try {
      all = HID.devices();
    } catch (err) {
      this.ev.log(`HID enumeration failed: ${msg(err)}`);
      return;
    }
    const vendor = (d: HID.Device) =>
      ((d.vendorId === WIRED_VID && d.productId === WIRED_PID)
        || (d.vendorId === WIRELESS_VID && d.productId === WIRELESS_PID))
      && (d.usagePage ?? 0) >= VENDOR_PAGE_MIN
      && (d.usagePage ?? 0) <= VENDOR_PAGE_MAX
      && !!d.path;

    // Wired beats wireless when both are plugged in; open every vendor
    // collection of whichever device wins.
    const candidates = all.filter(vendor);
    const wired = candidates.filter((d) => d.productId === WIRED_PID);
    const chosen = wired.length > 0 ? wired : candidates;
    if (chosen.length === 0) return;

    const opened: Handle[] = [];
    for (const info of chosen) {
      try {
        const dev = new HID.HID(info.path!);
        dev.on('data', (buf: Buffer) => {
          // node-hid input reports carry the report id as byte 0 on devices
          // with numbered reports, matching what WebHID splits out.
          if (buf.length > 0) {
            this.ev.onInputReport(buf[0], new Uint8Array(buf.subarray(1)));
          }
        });
        dev.on('error', (err: unknown) => {
          if (this.closing) return;
          // A collection with no input reports fails the moment its read
          // thread starts (ERROR_INVALID_USER_BUFFER). That handle is still
          // fine for writes, so only its reads are given up on; a real
          // unplug is caught by the enumeration poll and by failing writes.
          dev.removeAllListeners('data');
          this.ev.log(`Collection 0x${(info.usagePage ?? 0).toString(16)} reads disabled (${msg(err)}) — kept for writes`);
        });
        opened.push({ dev, info });
      } catch (err) {
        this.ev.log(`Open failed for collection 0x${(info.usagePage ?? 0).toString(16)}: ${msg(err)}`);
      }
    }
    if (opened.length === 0) return;

    this.handles = opened;
    this.info = opened[0].info;
    this.route.clear();
    const vid = this.info.vendorId.toString(16).padStart(4, '0');
    const pid = this.info.productId.toString(16).padStart(4, '0');
    const pages = opened.map((h) => `0x${(h.info.usagePage ?? 0).toString(16)}`).join(', ');
    this.ev.log(`Connected: ${this.info.product ?? 'AULA F75'} (${vid}:${pid}; vendor collections ${pages})`);
    this.ev.onConnect();
  }

  private dropDevice(notify: boolean): void {
    if (this.handles.length === 0) return;
    this.closing = true;
    for (const h of this.handles) {
      try { h.dev.close(); } catch { /* already gone */ }
    }
    this.closing = false;
    this.handles = [];
    this.info = null;
    this.route.clear();
    if (notify) this.ev.onDisconnect();
  }

  /**
   * Run `fn` against the handle known to serve this (op, reportId), or
   * discover it by trying each in turn. "Incorrect function" from Windows
   * means the report belongs to a different collection — exactly the case
   * this routing exists for.
   */
  private withRoute<T>(op: Op, reportId: number, fn: (dev: HID.HID) => T): T {
    if (this.handles.length === 0) throw new Error('Keyboard not connected');
    const key = `${op}:${reportId}`;
    const known = this.route.get(key);
    if (known !== undefined && known < this.handles.length) {
      return fn(this.handles[known].dev);
    }
    let lastErr: unknown = null;
    for (let i = 0; i < this.handles.length; i++) {
      try {
        const out = fn(this.handles[i].dev);
        this.route.set(key, i);
        return out;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  // ── Raw primitives (also serve the renderer proxy over IPC) ───────────

  sendReport(reportId: number, data: Uint8Array): void {
    const buf = Buffer.concat([Buffer.from([reportId]), Buffer.from(data)]);
    this.withRoute('out', reportId, (dev) => dev.write(buf));
  }

  sendFeatureReport(reportId: number, data: Uint8Array): void {
    const buf = Buffer.concat([Buffer.from([reportId]), Buffer.from(data)]);
    this.withRoute('feat-set', reportId, (dev) => dev.sendFeatureReport(buf));
  }

  receiveFeatureReport(reportId: number): Uint8Array {
    return this.withRoute('feat-get', reportId, (dev) =>
      Uint8Array.from(dev.getFeatureReport(reportId, FEATURE_REPORT_LEN)));
  }

  // ── HIDDevice-shaped adapter for the shared libs ──────────────────────

  /**
   * The libs use four members plus identity fields; structural typing lets
   * this stand in for a real HIDDevice. Built fresh per connection so the
   * identity fields are always current.
   */
  webDevice(): HIDDevice | null {
    if (this.handles.length === 0 || !this.info) return null;
    const self = this;
    const dev = {
      opened: true,
      vendorId: this.info.vendorId,
      productId: this.info.productId,
      productName: this.info.product ?? 'AULA F75',
      collections: (this.proxyCollections() ?? []).map((c) => ({
        usagePage: c.usagePage,
        usage: 1,
        outputReports: c.outputReportIds.map((reportId) => ({ reportId })),
        featureReports: c.featureReportIds.map((reportId) => ({ reportId })),
        inputReports: [],
        children: [],
      })),
      open: async () => {},
      close: async () => {},
      forget: async () => {},
      sendReport: async (reportId: number, data: BufferSource) => {
        self.sendReport(reportId, toU8(data));
      },
      sendFeatureReport: async (reportId: number, data: BufferSource) => {
        self.sendFeatureReport(reportId, toU8(data));
      },
      receiveFeatureReport: async (reportId: number) => {
        const out = self.receiveFeatureReport(reportId);
        const copy = new Uint8Array(out);
        return new DataView(copy.buffer);
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      oninputreport: null,
    };
    return dev as unknown as HIDDevice;
  }
}

function toU8(data: BufferSource): Uint8Array {
  return data instanceof Uint8Array ? data
    : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : new Uint8Array(data);
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
