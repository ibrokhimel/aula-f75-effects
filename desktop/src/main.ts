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
import { join, normalize, relative, isAbsolute } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CH, EV, type NativeStatus, type FramePayload } from '../../web/src/lib/native-ipc';
import { REACTIVE } from '../../web/src/lib/reactive';
import { createF75Bridge, F75_LAYOUT } from '../../web/src/lib/bridges/f75';
import { HidTransport } from './hid';
import { AudioCapture } from './audio-capture';
import { KeyHook } from './keyhook';
import { EngineHost } from './engine-host';
import { loadSettings, saveSettings, type PersistedSettings } from './settings';
import { checkForUpdates, RELEASES_URL } from './updater';
import { buildTrayIcon } from './tray-icon';
import { createTelemetrySampler } from './telemetry';
import { VirtualKeyboardBridge, SILENCE, type AudioInput, type PixelSource } from '../../packages/engine/src';
import { parseStudioConfiguration, defaultStudioConfiguration, studioNeedsAudio } from '../../web/src/lib/studio/runtime';

const SMOKE = process.argv.includes('--smoke');
const START_HIDDEN = process.argv.includes('--hidden');
let exitCode = 0;
if (SMOKE) { app.setName('AULA F75 Studio Smoke'); app.setPath('userData', join(app.getPath('temp'), `aula-studio-smoke-${process.pid}`)); }

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
      void engine.onDeviceDisconnected();
      pushStatus();
    },
  });

  const sampleSystem = createTelemetrySampler();
  let virtualFrames = 0;
  const virtual = SMOKE ? new VirtualKeyboardBridge(F75_LAYOUT, frame => { if (frame.size) virtualFrames++; }) : null;
  let studioCaptureAudio = false;
  const engine = new EngineHost({
    systemSample: sampleSystem,
    layout: F75_LAYOUT,
    getBridge: () => {
      if (virtual) return virtual;
      const device = hid.webDevice();
      return device ? createF75Bridge(device, log) : null;
    },
    log,
    onStateChange: () => {
      pushStatus();
      persistEngineState();
      refreshTray();
      syncAudioCapture();
    },
  });

  const hook = new KeyHook();
  const audio = new AudioCapture(log, engine.audio, sample => { engine.pushStudioAudio(sample, false); if (win && !win.isDestroyed() && win.isVisible()) win.webContents.send(EV.studioAudio, sample); }, state => { if (state.error) studioCaptureAudio = false; win?.webContents.send(EV.studioAudioState, state); });

  // Sound effects need system audio flowing; nothing else should keep the
  // hidden capture window (and its WASAPI stream) alive.
  function syncAudioCapture(): void {
    const studio = engine.studioConfiguration;
    if (!studio || !studioNeedsAudio(studio)) studioCaptureAudio = false;
    const wantsAudio = !engine.paused && ((engine.reactive !== null && REACTIVE[engine.reactive]?.category === 'Sound') || (studioCaptureAudio && studio !== null && studioNeedsAudio(studio) && studio.modes.audio.source === 'system'));
    if (wantsAudio) audio.start();
    else audio.stop();
  }

  function currentStatus(): NativeStatus {
    return {
      studio: engine.studioConfiguration,
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
    settings = { ...settings, effect, color: engine.colorHex, fps: engine.fps, studio: engine.studioConfiguration };
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
  ipcMain.handle(CH.getStudio, () => engine.studioConfiguration);
  ipcMain.handle(CH.configureStudio, (_e, value: unknown) => engine.configureStudio(parseStudioConfiguration(value)));
  ipcMain.handle(CH.telemetry, () => sampleSystem());
  ipcMain.handle(CH.studioPreferences, (_e, value: { closeToTray?: boolean }) => { settings = { ...settings, closeToTray: value?.closeToTray !== false }; if (!SMOKE) saveSettings(settings); });
  ipcMain.handle(CH.studioAudioCapture, (_e, on: boolean) => { studioCaptureAudio = on === true; syncAudioCapture(); if (!studioCaptureAudio) engine.pushStudioAudio(SILENCE, false); });
  ipcMain.handle(CH.studioKey, (_e, code: string, down: boolean) => { if (typeof code === 'string' && F75_LAYOUT.leds.some(l => l.keyCode === code)) { if (down) engine.keyDown(code, 0); else engine.keyUp(code); } });
  ipcMain.handle(CH.studioInput, (_e, kind: string, value: unknown) => {
    if (kind === 'audio') {
      const a = value as AudioInput;
      if (!a || ![a.level, a.bass, a.mid, a.treble].every(Number.isFinite) || !Array.isArray(a.spectrum) || !Array.isArray(a.waveform) || a.spectrum.length > 128 || a.waveform.length > 2048 || ![...a.spectrum, ...a.waveform].every(Number.isFinite)) return;
      engine.pushStudioAudio(a);
    } else if (kind === 'screen') {
      if (value === null) { engine.pushStudioScreen(null); return; }
      const p = value as PixelSource;
      if (!Number.isInteger(p?.width) || !Number.isInteger(p.height) || p.width < 1 || p.height < 1 || p.width > 192 || p.height > 108 || !p.data || p.data.length !== p.width * p.height * 4) return;
      engine.pushStudioScreen({ width: p.width, height: p.height, data: new Uint8ClampedArray(p.data) });
    } else if (kind === 'game') {
      if (value === null) { engine.pushStudioGame(null); return; }
      if (!Array.isArray(value) || value.length > 100 || !value.every(row => Array.isArray(row) && row.length === 4 && row.every(Number.isFinite) && F75_LAYOUT.leds.some(l => l.id === row[0]) && row.slice(1).every((n: number) => n >= 0 && n <= 255))) return;
      engine.pushStudioGame(new Map(value.map(row => [row[0], [row[1], row[2], row[3]] as [number, number, number]])));
    }
  });
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
    : join(__dirname, '..', '..', 'web', 'studio-out');

  function createWindow(): void {
    win = new BrowserWindow({
      show: !SMOKE,
      width: 1360,
      height: 860,
      minWidth: 760,
      minHeight: 560,
      backgroundColor: '#151719',
      icon: buildTrayIcon(),
      webPreferences: {
        preload: join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
        offscreen: SMOKE,
      },
    });
    win.setMenuBarVisibility(false);
    if (SMOKE) {
      win.webContents.startPainting();
      win.webContents.on('console-message', (_event, _level, message) => console.log('SMOKE UI', message));
      win.webContents.on('preload-error', (_event, path, error) => console.error('SMOKE PRELOAD', path, error));
    }
    win.on('close', (e) => {
      if (quitting) return;
      if (settings.closeToTray === false) { quitting = true; app.quit(); return; }
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
    void win.loadURL('app://ui/studio.html');
  }

  function showWindow(): void {
    if (win === null) createWindow();
    else { win.show(); win.focus(); }
  }

  function refreshTray(): void {
    if (!tray) return;
    const running = engine.studioConfiguration?.enabled ? engine.studioConfiguration.mode : engine.reactive ?? engine.animation;
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
      app.exit(exitCode);
    });
  });

  await app.whenReady();
  app.setAppUserModelId('com.aula.f75.controller');

  protocol.handle('app', (req) => {
    const url = new URL(req.url);
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
    if (path === '' || path === '.') path = 'studio.html';
    if (!path.includes('.') && existsSync(join(uiRoot, path + '.html'))) path += '.html';
    const file = join(uiRoot, path);
    // Contain everything inside the export directory.
    const inside = relative(uiRoot, file);
    if (inside.startsWith('..') || isAbsolute(inside) || !existsSync(file)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });

  if (!existsSync(join(uiRoot, 'index.html')) && !SMOKE) {
    dialog.showErrorBox(
      'UI build missing',
      `No static UI found at:\n${uiRoot}\n\nRun "npm run build:web" in desktop/ first.`,
    );
  }

  audio.installDisplayMediaHandler();
  if (!SMOKE) hid.start();
  if (!SMOKE) hook.start(
    { down: (code, mods) => engine.keyDown(code, mods), up: (code) => engine.keyUp(code) },
    log,
  );

  // Resume where the last session left off.
  engine.setColor(settings.color);
  engine.setFps(settings.fps);
  if (settings.studio && !SMOKE) {
    void engine.configureStudio(parseStudioConfiguration(settings.studio));
  } else if (settings.effect && !SMOKE) {
    log(`Resuming ${settings.effect.kind} effect: ${settings.effect.id}`);
    if (settings.effect.kind === 'reactive') void engine.startReactive(settings.effect.id);
    else void engine.startAnimation(settings.effect.id, settings.fps);
  }

  if (SMOKE) {
    try {
      hook.start({ down: (code, mods) => engine.keyDown(code, mods), up: code => engine.keyUp(code) }, log);
      if (!hook.ok) throw new Error(`Global key hook failed: ${hook.error}`);
      const c = { ...defaultStudioConfiguration(), enabled: true };
      await engine.configureStudio(c);
      await new Promise(resolve => setTimeout(resolve, 250));
      if (virtualFrames < 2) throw new Error('Native studio emitted no virtual frames');
      await engine.configureStudio({ ...c, mode: 'typing' });
      engine.keyDown('KeyA', 0); engine.keyUp('KeyA');
      await new Promise(resolve => setTimeout(resolve, 150));
      await engine.configureStudio({ ...c, enabled: false });
      createWindow();
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Studio window did not load')), 25000);
        win!.webContents.once('did-finish-load', () => { clearTimeout(timeout); resolve(); });
        win!.webContents.once('did-fail-load', (_e, code, message) => { clearTimeout(timeout); reject(new Error(code + ': ' + message)); });
      });
      await win!.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const until=Date.now()+15000;const t=setInterval(()=>{if(document.querySelector('.studio[data-ready="true"]')){clearInterval(t);resolve(true)}else if(Date.now()>until){clearInterval(t);reject(Error('Studio did not hydrate'))}},100)})`);
      const ui = await win!.webContents.executeJavaScript(`({ title: document.querySelector('h1')?.textContent, tabs: document.querySelectorAll('[role=tab]').length, icons: document.querySelector('.studio-sidebar')?.textContent, native: !!window.f75Native })`);
      if (!ui.native || ui.tabs !== 7 || ui.icons.trim()) throw new Error('Native studio shell failed: ' + JSON.stringify(ui));
      await win!.webContents.executeJavaScript(`Object.defineProperty(document, 'visibilityState', { configurable:true, value:'visible' }); document.dispatchEvent(new Event('visibilitychange'));`);
      await new Promise(resolve => setTimeout(resolve, 500));
      const painted = await win!.webContents.executeJavaScript(`(()=>{const c=document.querySelector('.studio-preview-stage canvas');return c?.getContext('2d').getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data[3] > 0})()`);
      if (!painted) throw new Error('Native keyboard canvas was not painted');
      const image = await win!.webContents.capturePage();
      const resultDir = join(__dirname, '..', '..', 'web', 'test-results', 'studio');
      mkdirSync(resultDir, { recursive: true }); writeFileSync(join(resultDir, 'windows-studio.png'), image.toPNG());
      const workspaces = await win!.webContents.executeJavaScript(`(async()=>{const results=[];for(const [label,id] of [['Key mapping','mapping'],['Macros','macros'],['Profiles','profiles'],['Games','games'],['Settings','settings'],['Advanced','advanced']]){document.querySelector('button[aria-label="'+label+'"]').click();await new Promise(r=>setTimeout(r,100));if(!document.querySelector('[data-page="'+id+'"]'))throw Error('Missing workspace '+label);results.push(label)}return results})()`);
      console.log('SMOKE ' + JSON.stringify({ ...ui, workspaces, painted, hookOk: hook.ok, virtualFrames, hardwareWrites: 0, telemetry: sampleSystem() }));
    } catch (error) { console.error('SMOKE FAILED', error); exitCode = 1; }
    quitting = true; app.quit(); return;
  }

  tray = new Tray(buildTrayIcon());
  tray.on('double-click', showWindow);
  refreshTray();

  if (!START_HIDDEN) createWindow();
}
