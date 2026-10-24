/**
 * System-audio capture for the Sound effect family.
 *
 * Chromium is the only clean WASAPI loopback client we ship, so capture runs
 * in a hidden BrowserWindow: it grabs the desktop's audio (what the PC is
 * playing — never the microphone), runs a WebAudio analyser, and streams the
 * raw readouts to this process, where the shared sound module turns them
 * into band data for the engine. The window exists only while a Sound effect
 * is running.
 */
import { app, BrowserWindow, desktopCapturer, ipcMain, session, dialog } from 'electron';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUDIO_FFT_SIZE, analyzeAudio, type AudioSample, type AudioInput,
} from '../../packages/engine/src';

// Internal to the capture window — the UI preload only exposes invoke(), so
// pages cannot reach these ipcMain.on channels.
const CH_DATA = 'f75:audio-data';
const CH_ERROR = 'f75:audio-error';

/**
 * The page is self-contained: no bundling, no preload, just the analyser.
 * It must load from file:// — a data: URL is not a secure context, and
 * Chromium does not even expose navigator.mediaDevices there.
 */
function pageFile(): string {
  const script = `
    const { ipcRenderer } = require('electron');
    async function grab() {
      // The direct desktop-capture constraint needs no picker and no gesture;
      // the getDisplayMedia fallback rides the handler main installs.
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: { mandatory: { chromeMediaSource: 'desktop' } },
          video: { mandatory: { chromeMediaSource: 'desktop' } },
        });
      } catch (e) {
        return await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      }
    }
    window.__start = async () => {
      try {
        const stream = await grab();
        // The video track is unavoidable baggage — disabled, never rendered.
        stream.getVideoTracks().forEach((t) => { t.enabled = false; });
        if (stream.getAudioTracks().length === 0) throw new Error('capture has no audio track');
        const ctx = new AudioContext();
        await ctx.resume();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = ${AUDIO_FFT_SIZE};
        analyser.smoothingTimeConstant = 0.5;
        const input = ctx.createMediaStreamSource(stream);
        input.connect(analyser);
        const stereo = (stream.getAudioTracks()[0].getSettings().channelCount || 0) >= 2;
        const splitter = ctx.createChannelSplitter(2);
        const channels = [ctx.createAnalyser(), ctx.createAnalyser()];
        input.connect(splitter);
        channels.forEach((channel, i) => { channel.fftSize = ${AUDIO_FFT_SIZE}; splitter.connect(channel, i); });
        const channelData = channels.map(channel => new Uint8Array(channel.fftSize));
        const freq = new Uint8Array(analyser.frequencyBinCount);
        const time = new Uint8Array(analyser.fftSize);
        setInterval(() => {
          analyser.getByteFrequencyData(freq);
          analyser.getByteTimeDomainData(time);
          const rms = stereo ? channels.map((channel, i) => {
            channel.getByteTimeDomainData(channelData[i]);
            let sum = 0; for (const value of channelData[i]) sum += ((value - 128) / 128) ** 2;
            return Math.min(1, Math.sqrt(sum / channelData[i].length) * 3.2);
          }) : null;
          ipcRenderer.send('${CH_DATA}', freq, time, ctx.sampleRate, rms);
        }, 33);
      } catch (err) {
        ipcRenderer.send('${CH_ERROR}', String((err && err.message) || err));
      }
    };
  `;
  const html = `<!doctype html><title>f75 audio</title><script>${script}</script>`;
  const file = join(app.getPath('userData'), 'audio-capture.html');
  writeFileSync(file, html);
  return file;
}

export class AudioCapture {
  private win: BrowserWindow | null = null;
  private handlerInstalled = false;
  private ready = false;

  constructor(private readonly log: (line: string) => void, private readonly audio: {
    pushAudioSample(sample: AudioSample): void;
    resetSound(): void;
  }, private readonly onStudioSample?: (sample: AudioInput) => void, private readonly onState?: (state: { active: boolean; error?: string }) => void) {
    ipcMain.on(CH_DATA, (e, freq: Uint8Array, time: Uint8Array, sampleRate: number, rms?: number[] | null) => {
      if (!this.win || e.sender !== this.win.webContents) return;
      if (!this.ready) { this.ready = true; this.onState?.({ active: true }); }
      const sample = analyzeAudio(new Uint8Array(freq), new Uint8Array(time), Number(sampleRate) || 48000);
      if (Array.isArray(rms) && rms.length === 2 && rms.every(Number.isFinite)) {
        sample.left = rms[0]; sample.right = rms[1];
      }
      this.audio.pushAudioSample(sample);
      this.onStudioSample?.({ ...sample, waveform: Array.from({ length: 128 }, (_, i) => (time[i * 16] - 128) / 128) });
    });
    ipcMain.on(CH_ERROR, (e, msg: unknown) => {
      if (!this.win || e.sender !== this.win.webContents) return;
      this.log(`Sound capture failed: ${String(msg)} — the effect will stay dark`);
      this.stop(); this.onState?.({ active: false, error: String(msg) });
    });
  }

  get running(): boolean { return this.win !== null; }

  start(): void {
    if (this.win) return;
    this.installDisplayMediaHandler();
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        // Loads only our own inline page above, never remote content.
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false,
      },
    });
    this.win = win;
    this.ready = false;
    win.on('closed', () => { if (this.win === win) this.win = null; });
    try {
      void win.loadFile(pageFile()).then(() => {
        if (this.win !== win) return;
        // userGesture=true, so getDisplayMedia's activation rule cannot bite.
        return win.webContents.executeJavaScript('window.__start()', true);
      }).catch(error => {
        if (this.win !== win) return;
        this.stop(); this.onState?.({ active: false, error: error instanceof Error ? error.message : String(error) });
      });
    } catch (err) {
      this.log(`Sound capture failed to load: ${err instanceof Error ? err.message : String(err)}`);
      this.stop();
      return;
    }
    this.log('Listening to system audio (what the PC plays — not the microphone)');
  }

  stop(): void {
    if (!this.win) return;
    const win = this.win;
    this.win = null;
    this.ready = false;
    win.destroy();
    this.audio.resetSound();
    this.onState?.({ active: false });
    this.log('Stopped listening to system audio');
  }

  /** Fallback grant: system loopback audio plus a throwaway screen source. */
  installDisplayMediaHandler(): void {
    if (this.handlerInstalled) return;
    this.handlerInstalled = true;
    session.defaultSession.setDisplayMediaRequestHandler((req, callback) => {
      void (async () => {
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
        if (req.frame?.url.startsWith('file:')) { callback(sources[0] ? { video: sources[0], audio: 'loopback' } : {}); return; }
        if (!req.frame?.url.startsWith('app://ui/')) { callback({}); return; }
        const choice = await dialog.showMessageBox({ type: 'question', title: 'Choose a capture source', message: 'Share a display or window with AULA F75 Studio', detail: 'Capture is processed on this computer. Stop it from the studio when finished.', buttons: ['Cancel', ...sources.map(source => source.name)], cancelId: 0, defaultId: 0 });
        const source = sources[choice.response - 1]; callback(source ? { video: source, ...(req.audioRequested ? { audio: 'loopback' as const } : {}) } : {});
      })().catch(() => callback({}));
    }, { useSystemPicker: true });
  }
}
