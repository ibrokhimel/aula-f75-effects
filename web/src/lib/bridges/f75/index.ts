import type { KeyboardBridge, Frame } from '../../../../../packages/engine/src';
import { F75_LAYOUT } from './layout';
import { WIRED_VID, WIRED_PID, WIRELESS_VID, WIRELESS_PID } from '../../protocol';
import { buildDirectFrame, buildBlankFrame, sendDirectFrame, enableDirectMode, disableDirectMode } from '../../direct-mode';
import { isWirelessDevice, sendWirelessAnimationFrame, sendWirelessIdle } from '../../wireless-mode';

export { F75_LAYOUT } from './layout';

/** The host opens/closes the HID handle; this adapter owns only RGB mode. */
export function createF75Bridge(device: HIDDevice, log: (line: string) => void = () => {}): KeyboardBridge {
  const wired = device.vendorId === WIRED_VID && device.productId === WIRED_PID;
  const wireless = device.vendorId === WIRELESS_VID && device.productId === WIRELESS_PID;
  if (!wired && !wireless) throw new Error('Unsupported device for the AULA F75 bridge');
  return {
    id: wireless ? 'aula-f75-wireless' : 'aula-f75-usb',
    name: wireless ? 'AULA F75 (2.4 GHz)' : 'AULA F75 (USB)',
    layout: F75_LAYOUT,
    capabilities: { perKeyRgb: true, maxFps: 30 },
    async connect() {
      if (!device.opened) throw new Error('Open the F75 HID connection before starting effects');
      if (!isWirelessDevice(device)) await enableDirectMode(device, log);
    },
    async writeFrame(frame: Frame) {
      if (!device.opened) throw new Error('F75 disconnected');
      if (isWirelessDevice(device)) await sendWirelessAnimationFrame(device, frame);
      else await sendDirectFrame(device, buildDirectFrame(frame));
    },
    async disconnect() {
      if (!device.opened) return;
      if (isWirelessDevice(device)) await sendWirelessIdle(device);
      else {
        try { await sendDirectFrame(device, buildBlankFrame()); }
        finally { await disableDirectMode(device, log); }
      }
    },
  };
}
