/**
 * Minimal message bridge. All typed shaping happens in page code
 * (web/src/lib/native.ts); only two functions cross the isolation boundary,
 * both restricted to the app's own channel namespace.
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

const ALLOWED_PREFIX = 'f75:';

contextBridge.exposeInMainWorld('f75Native', {
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    if (!channel.startsWith(ALLOWED_PREFIX)) {
      return Promise.reject(new Error(`Blocked channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel: string, cb: (...args: unknown[]) => void): (() => void) => {
    if (!channel.startsWith(ALLOWED_PREFIX)) return () => {};
    const handler = (_e: IpcRendererEvent, ...args: unknown[]) => cb(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
