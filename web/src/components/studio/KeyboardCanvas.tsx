'use client';

import { useEffect, useRef } from 'react';
import { F75_LAYOUT } from '@/lib/bridges/f75/layout';
import { adjustFrame } from '@/lib/studio/frame';
import { generatorFor, type Playback, type StudioSettings } from '@/lib/studio/catalog';
import type { Frame } from '@/lib/animations';
import { getNativePreview, publishStudioFrame, subscribeNativePreview } from '@/lib/studio/output';

const UNIT = 60;
const WIDTH = 1024;
const HEIGHT = 390;
const LABELS: Record<string, string> = {
  LShift: 'Shift', RShift: 'Shift', LCtrl: 'Ctrl', LAlt: 'Alt', RAlt: 'Alt',
  Bksp: 'Backspace', Caps: 'Caps Lock', Win: 'Win',
};

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
}

function paint(ctx: CanvasRenderingContext2D, frame: Frame, mini: boolean) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const left = 22, top = 19, boardWidth = 980, boardHeight = 352;
  const shell = ctx.createLinearGradient(0, top, 0, top + boardHeight);
  shell.addColorStop(0, '#41474a'); shell.addColorStop(0.018, '#262c2f');
  shell.addColorStop(0.94, '#151a1d'); shell.addColorStop(1, '#101416');
  ctx.shadowColor = '#090c0d'; ctx.shadowBlur = mini ? 4 : 14; ctx.shadowOffsetY = 8;
  rounded(ctx, left, top, boardWidth, boardHeight, 18); ctx.fillStyle = shell; ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#4a5255'; ctx.lineWidth = 1.2; ctx.stroke();
  rounded(ctx, left + 6, top + 6, boardWidth - 12, boardHeight - 12, 14);
  ctx.fillStyle = '#0e1316'; ctx.fill(); ctx.strokeStyle = '#13181c'; ctx.stroke();

  for (const led of F75_LAYOUT.leds) {
    const [r, g, b] = (frame.get(led.id) ?? [0, 0, 0]).map((channel) => Math.round(255 * (channel / 255) ** 0.75));
    const intensity = Math.max(r, g, b) / 255;
    const x = 34 + (led.x - (led.width ?? 1) / 2) * UNIT;
    const y = 31 + led.row * 54 + (led.row ? 7 : 0);
    const w = (led.width ?? 1) * UNIT - 5, h = 47;
    ctx.fillStyle = '#080d10'; rounded(ctx, x - 1, y - 1, w + 2, h + 4, 7); ctx.fill();

    if (intensity > 0.025) {
      ctx.shadowColor = `rgba(${r},${g},${b},${0.25 + intensity * 0.35})`;
      ctx.shadowBlur = mini ? 7 : 9; ctx.shadowOffsetY = 1;
    }
    ctx.fillStyle = `rgb(${24 + Math.round(r * 0.12)},${29 + Math.round(g * 0.12)},${33 + Math.round(b * 0.12)})`;
    rounded(ctx, x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = intensity > 0.035 ? `rgba(${r},${g},${b},${0.3 + intensity * 0.65})` : '#30383d';
    ctx.lineWidth = intensity > 0.3 ? 1.6 : 1; ctx.stroke();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    const key = ctx.createLinearGradient(x, y + 2, x, y + h - 3);
    key.addColorStop(0, `rgb(${40 + Math.round(r * 0.14)},${45 + Math.round(g * 0.14)},${49 + Math.round(b * 0.14)})`);
    key.addColorStop(1, `rgb(${24 + Math.round(r * 0.1)},${29 + Math.round(g * 0.1)},${33 + Math.round(b * 0.1)})`);
    rounded(ctx, x + 4, y + 3, w - 8, h - 9, 4); ctx.fillStyle = key; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 8, y + 4); ctx.lineTo(x + w - 8, y + 4);
    ctx.strokeStyle = `rgba(214,229,234,${0.06 + intensity * 0.11})`; ctx.lineWidth = 1; ctx.stroke();
    if (mini) continue;
    if (led.label === 'Space') {
      rounded(ctx, x + w / 2 - 24, y + h / 2 - 1, 48, 2.5, 1);
      ctx.fillStyle = `rgb(${Math.max(76, r)},${Math.max(89, g)},${Math.max(95, b)})`; ctx.fill();
    } else {
      const label = LABELS[led.label] ?? led.label;
      const short = label.length < 3 && !label.startsWith('F');
      ctx.font = `${short ? 500 : 450} ${short ? 17 : label.length > 6 ? 12 : 13}px "Geist Variable", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = intensity > 0.07
        ? `rgb(${Math.min(245, 147 + r * 0.5)},${Math.min(249, 157 + g * 0.5)},${Math.min(250, 163 + b * 0.5)})`
        : '#89959b';
      ctx.fillText(label, x + w / 2, y + h / 2 - 1, w - 8);
    }
  }

  // The rotary control occupies the unlit space at the end of the function row.
  const kx = 960, ky = 55;
  ctx.beginPath(); ctx.arc(kx, ky, 25, 0, Math.PI * 2); ctx.fillStyle = '#080d10'; ctx.fill();
  const knob = ctx.createLinearGradient(kx - 20, ky - 20, kx + 20, ky + 20);
  knob.addColorStop(0, '#596165'); knob.addColorStop(0.08, '#858d90');
  knob.addColorStop(0.16, '#2f373b'); knob.addColorStop(0.9, '#1a2125'); knob.addColorStop(1, '#515a5e');
  ctx.beginPath(); ctx.arc(kx, ky, 22, 0, Math.PI * 2); ctx.fillStyle = knob; ctx.fill();
  ctx.strokeStyle = '#667175'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(kx + 12, ky - 15); ctx.lineTo(kx + 15, ky - 18);
  ctx.strokeStyle = '#a7b3b5'; ctx.stroke();
}

interface Props {
  settings: StudioSettings;
  playback?: Playback;
  epoch?: number;
  miniature?: boolean;
  animate?: boolean;
  fps?: number;
  frameSource?: (time: number) => Frame;
  label?: string;
  revision?: number;
  nativePreview?: boolean;
}

export function KeyboardCanvas({ settings, playback = 'playing', epoch = 0, miniature = false, animate = false, fps = 30, frameSource, label, revision = 0, nativePreview = false }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef({ settings, playback, epoch, fps, animate, frameSource });
  const wake = useRef<() => void>(() => {});
  useEffect(() => {
    current.current = { settings, playback, epoch, fps, animate, frameSource };
    wake.current();
  }, [settings, playback, epoch, fps, animate, frameSource, revision]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    let raf = 0, previous = 0, lastPaint = 0, phase = 3.8, seenEpoch = current.current.epoch;
    let previousSignature = '', dirty = true;
    let alive = true, visible = true, intersecting = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const running = () => current.current.playback === 'playing' && (!miniature || (current.current.animate && !reducedMotion.matches));
    const drawable = () => visible && intersecting && document.visibilityState === 'visible';
    const requestDraw = () => {
      dirty = true;
      if (!raf && drawable()) raf = requestAnimationFrame(draw);
    };
    const resize = () => {
      const width = el.clientWidth;
      visible = width > 0;
      if (!visible) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.max(0.1, width / WIDTH) * ratio;
      el.width = Math.round(WIDTH * scale); el.height = Math.round(HEIGHT * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      previousSignature = '';
      requestDraw();
    };
    const draw = (now: number) => {
      raf = 0;
      if (!drawable()) { previous = 0; return; }
      const state = current.current;
      if (state.epoch !== seenEpoch) { phase = 0; seenEpoch = state.epoch; }
      const dt = previous ? Math.min((now - previous) / 1000, 0.1) : 0;
      previous = now;
      if (running()) phase += dt * (state.settings.parameters.rate ?? 1);
      const signature = JSON.stringify([state.settings, state.playback, state.epoch]);
      const shouldPaint = dirty || signature !== previousSignature || (running() && now - lastPaint >= 1000 / (miniature ? 24 : state.fps));
      if (shouldPaint) {
        const frame = (nativePreview ? getNativePreview() : null) ?? (state.playback === 'stopped' ? new Map() : adjustFrame(state.frameSource ? state.frameSource(phase) : generatorFor({ ...state.settings, parameters: { ...state.settings.parameters, rate: 1 } })(phase), state.settings));
        if (nativePreview && !miniature) publishStudioFrame(frame);
        paint(ctx, frame, miniature); lastPaint = now; previousSignature = signature;
        dirty = false;
      }
      if (running()) raf = requestAnimationFrame(draw);
      else previous = 0;
    };
    wake.current = requestDraw;
    const offNative = nativePreview ? subscribeNativePreview(requestDraw) : () => {};
    resize();
    const observer = new ResizeObserver(resize); observer.observe(el);
    const intersection = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      previous = 0;
      if (intersecting) requestDraw();
      else { cancelAnimationFrame(raf); raf = 0; }
    });
    intersection.observe(el);
    const visibility = () => {
      previous = 0;
      if (document.visibilityState === 'visible') requestDraw();
      else { cancelAnimationFrame(raf); raf = 0; }
    };
    document.addEventListener('visibilitychange', visibility);
    reducedMotion.addEventListener('change', requestDraw);
    void document.fonts.ready.then(() => { if (alive) requestDraw(); });
    return () => {
      alive = false; wake.current = () => {}; cancelAnimationFrame(raf);
      offNative();
      observer.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      reducedMotion.removeEventListener('change', requestDraw);
    };
  }, [miniature, nativePreview]);

  return <canvas ref={canvas} className={miniature ? 'studio-keyboard studio-keyboard-mini' : 'studio-keyboard'} role="img" aria-label={label ?? `${settings.variationId} keyboard ${miniature ? 'thumbnail' : 'preview'}`} data-playback={playback} data-animated={miniature && animate} width={WIDTH} height={HEIGHT} />;
}
