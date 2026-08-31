/**
 * AULA F75 Controller — Electron main process.
 *
 * Owns everything long-lived: the HID connection, the global key hook, the
 * effect engine, the tray icon, and persisted settings. The window is just
 * a view; closing it hides it to the tray and nothing else changes.
 */
import {
  app, BrowserWindow, Tray, Menu, ipcMain, protocol, net, dialog, shell,
} from 'electron';
import { join, normalize } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CH, EV, type NativeStatus, type FramePayload } from '../../web/src/lib/native-ipc';
import { REACTIVE } from '../../web/src/lib/reactive';
import { HidTransport } from './hid';
import { AudioCapture } from './audio-capture';
import { KeyHook } from './keyhook';
import { EngineHost } from './engine-host';
import { loadSettings, saveSettings, type PersistedSettings } from './settings';
import { checkForUpdates, RELEASES_URL } from './updater';
import { buildTrayIcon } from './tray-icon';

const SMOKE = process.argv.includes('--smoke');
const START_HIDDEN = process.argv.includes('--hidden');

// The UI is a static Next export served over app:// — a standard scheme, so
// the export's absolute /_next asset paths resolve.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  void bootstrap();
}

async function bootstrap(): Promise<void> {
  let win: BrowserWindow | null = null;
  let tray: Tray | null = null;
  let quitting = false;
  let frameWatchers = 0;
  let settings = loadSettings();

  const log = (line: string) => {
    console.log(`[f75] ${line}`);
    win?.webContents.send(EV.log, line);
  };

  const hid = new HidTransport({
    log,
    onInputReport: (reportId, data) => {
      win?.webContents.send(EV.inputReport, { reportId, data });
    },
    onConnect: () => {
      pushStatus();
      void engine.onDeviceConnected();
    },
    onDisconnect: () => {
      log('Keyboard disconnected — effects resume when it returns');
      pushStatus();
    },
  });

  const engine = new EngineHost({
    getDevice: () => hid.webDevice(),
    log,
    onStateChange: () => {
      pushStatus();
      persistEngineState();
      refreshTray();
      syncAudioCapture();
    },
  });

  const hook = new KeyHook();
  const audio = new AudioCapture(log);

  // Sound effects need system audio flowing; nothing else should keep the
  // hidden capture window (and its WASAPI stream) alive.
  function syncAudioCapture(): void {
    const wantsAudio = engine.reactive !== null
      && REACTIVE[engine.reactive]?.category === 'Sound';
    if (wantsAudio) audio.start();
    else audio.stop();
  }

  function currentStatus(): NativeStatus {
    return {
      connected: hid.connected,
      productName: hid.productName,
      vendorId: hid.vendorId,
      productId: hid.productId,
      transport: hid.transport,
      reactive: engine.reactive,
      animation: engine.animation,
      hits: engine.hits,
      color: engine.colorHex,
      fps: engine.fps,
      paused: engine.paused,
      hookOk: hook.ok,
      hookError: hook.error,
      collections: hid.proxyCollections(),
    };
  }

  function pushStatus(): void {
    win?.webContents.send(EV.status, currentStatus());
  }

  function persistEngineState(): void {
    if (SMOKE) return; // a self-test run must not rewrite the user's state
    const effect: PersistedSettings['effect'] =
      engine.reactive ? { kind: 'reactive', id: engine.reactive }
        : engine.animation ? { kind: 'animation', id: engine.animation }
          : null;
    settings = { ...settings, effect, color: engine.colorHex, fps: engine.fps };
    saveSettings(settings);
  }

  function updateFrameListener(): void {
    engine.setFrameListener(
      frameWatchers > 0 && win !== null
        ? (frame, hits) => {
          const payload: FramePayload = {
            entries: [...frame].map(([led, [r, g, b]]) => [led, r, g, b]),
            hits,
          };
          win?.webContents.send(EV.frame, payload);
        }
        : null,
    );
  }

  // ── IPC ───────────────────────────────────────────────────────────────

  ipcMain.handle(CH.status, () => currentStatus());
  ipcMain.handle(CH.startReactive, (_e, id: string) => engine.startReactive(String(id)));
  ipcMain.handle(CH.startAnimation, (_e, id: string, fps: number) =>
    engine.startAnimation(String(id), Number(fps)));
  ipcMain.handle(CH.stopEffects, () => engine.stop());
  ipcMain.handle(CH.setColor, (_e, hex: string | null) => {
    engine.setColor(typeof hex === 'string' ? hex : null);
    persistEngineState();
  });
  ipcMain.handle(CH.setFps, (_e, fps: number) => {
    engine.setFps(Number(fps));
    persistEngineState();
  });
  ipcMain.handle(CH.getAutostart, () => settings.autostart);
  ipcMain.handle(CH.setAutostart, (_e, on: boolean) => {
    settings = { ...settings, autostart: !!on };
    saveSettings(settings);
    app.setLoginItemSettings({ openAtLogin: !!on, args: ['--hidden'] });
    log(on ? 'Will start with Windows (hidden in the tray)' : 'Removed from Windows startup');
  });
  ipcMain.handle(CH.reconnect, () => hid.reconnect());
  ipcMain.handle(CH.checkUpdate, () => checkForUpdates(app.getVersion()));
  ipcMain.handle(CH.openReleases, () => { void shell.openExternal(RELEASES_URL); });
  ipcMain.handle(CH.watchFrames, (_e, on: boolean) => {
    frameWatchers = Math.max(0, frameWatchers + (on ? 1 : -1));
    updateFrameListener();
  });
  ipcMain.handle(CH.hidSendReport, (_e, reportId: number, data: Uint8Array) =>
    hid.sendReport(Number(reportId), new Uint8Array(data)));
  ipcMain.handle(CH.hidSendFeature, (_e, reportId: number, data: Uint8Array) =>
    hid.sendFeatureReport(Number(reportId), new Uint8Array(data)));
  ipcMain.handle(CH.hidReceiveFeature, (_e, reportId: number) =>
    hid.receiveFeatureReport(Number(reportId)));

  // ── Window & tray ─────────────────────────────────────────────────────

  const uiRoot = app.isPackaged
    ? join(process.resourcesPath, 'web-out')
    : join(__dirname, '..', '..', 'web', 'out');

  function createWindow(): void {
    win = new BrowserWindow({
      width: 1100,
      height: 860,
      minWidth: 760,
      minHeight: 560,
      backgroundColor: '#09090b',
      icon: buildTrayIcon(),
      webPreferences: {
        preload: join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    win.setMenuBarVisibility(false);
    win.on('close', (e) => {
      if (quitting) return;
      e.preventDefault();
      win?.hide();
      log('Window hidden — effects keep running. Reopen or quit from the tray icon.');
    });
    win.on('closed', () => { win = null; updateFrameListener(); });
    win.webContents.on('did-finish-load', () => {
      // A reload starts a fresh page with no watchers; drop stale counts.
      frameWatchers = 0;
      updateFrameListener();
      pushStatus();
    });
    void win.loadURL('app://ui/index.html');
  }

  function showWindow(): void {
    if (win === null) createWindow();
    else { win.show(); win.focus(); }
  }

  function refreshTray(): void {
    if (!tray) return;
    const running = engine.reactive ?? engine.animation;
    tray.setToolTip(running
      ? `AULA F75 — ${running}${engine.paused ? ' (paused)' : ''}`
      : 'AULA F75 Controller');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open Controller', click: showWindow },
      {
        label: 'Pause effects',
        type: 'checkbox',
        checked: engine.paused,
        enabled: engine.running,
        click: (item) => { void engine.setPaused(item.checked); },
      },
      { label: 'Stop effects', enabled: engine.running, click: () => { void engine.stop(); } },
      { type: 'separator' },
      { label: 'Quit', click: () => { quitting = true; app.quit(); } },
    ]));
  }

  // ── App lifecycle ─────────────────────────────────────────────────────

  app.on('second-instance', showWindow);
  app.on('window-all-closed', () => { /* keep running in the tray */ });
  app.on('activate', showWindow);

  let shuttingDown = false;
  app.on('before-quit', (e) => {
    quitting = true;
    if (shuttingDown) return;
    shuttingDown = true;
    e.preventDefault();
    hook.stop();
    audio.stop();
    void engine.shutdown().finally(() => {
      hid.stop();
      app.exit(0);
    });
  });

  await app.whenReady();
  app.setAppUserModelId('com.aula.f75.controller');

  protocol.handle('app', (req) => {
    const url = new URL(req.url);
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
    if (path === '' || path === '.') path = 'index.html';
    const file = join(uiRoot, path);
    // Contain everything inside the export directory.
    if (!file.startsWith(uiRoot) || !existsSync(file)) {
      return net.fetch(pathToFileURL(join(uiRoot, 'index.html')).toString());
    }
    return net.fetch(pathToFileURL(file).toString());
  });

  if (!existsSync(join(uiRoot, 'index.html')) && !SMOKE) {
    dialog.showErrorBox(
      'UI build missing',
      `No static UI found at:\n${uiRoot}\n\nRun "npm run build:web" in desktop/ first.`,
    );
  }

  hid.start();
  hook.start(
    { down: (code, mods) => engine.keyDown(code, mods), up: (code) => engine.keyUp(code) },
    log,
  );

  // Resume where the last session left off.
  engine.setColor(settings.color);
  engine.setFps(settings.fps);
  if (settings.effect) {
    log(`Resuming ${settings.effect.kind} effect: ${settings.effect.id}`);
    if (settings.effect.kind === 'reactive') void engine.startReactive(settings.effect.id);
    else void engine.startAnimation(settings.effect.id, settings.fps);
  }

  if (SMOKE) {
    // Headless self-test: bring everything up, drive real frames through
    // the HID path for a moment, report, and leave cleanly (the board
    // reverts to its onboard effect on quit).
    if (hid.connected && !engine.running) void engine.startAnimation('sine', 30);
    setTimeout(() => {
      const s = currentStatus();
      console.log(`SMOKE ${JSON.stringify(s)}`);
      quitting = true;
      app.quit();
    }, 2500);
    return;
  }

  tray = new Tray(buildTrayIcon());
  tray.on('double-click', showWindow);
  refreshTray();

  if (!START_HIDDEN) createWindow();
}
