'use client';
import { useEffect, useRef } from 'react';
import { BridgeSession, type SystemSample } from '../../../../packages/engine/src';
import { createF75Bridge } from '@/lib/bridges/f75';
import { isNative, nativeConfigureStudio, nativeStudioInput, watchNativeFrames } from '@/lib/native';
import { setStudioFrameSink, setGameFrameSink, setNativePreview } from '@/lib/studio/output';
import { StudioRuntime, type StudioConfiguration } from '@/lib/studio/runtime';

export function useStudioOutput(config: StudioConfiguration, device: HIDDevice | null, loaded: boolean, notify: (line: string) => void) {
  const current = useRef(config), game = useRef(false);
  const runtime = useRef<StudioRuntime | null>(null);
  const stopped = config.playback === 'stopped';
  useEffect(() => { current.current = config; }, [config]);
  useEffect(() => { runtime.current?.configure(config); }, [config]);
  useEffect(() => {
    if (!loaded || !isNative()) return;
    const timer = setTimeout(() => { void nativeConfigureStudio(config).catch(e => notify(`Keyboard output: ${e instanceof Error ? e.message : String(e)}`)); }, 80);
    return () => clearTimeout(timer);
  }, [config, loaded, notify]);
  useEffect(() => {
    if (!loaded || !config.enabled || !isNative()) { setNativePreview(null); return; }
    const off = watchNativeFrames(frame => setNativePreview(frame));
    return () => { off(); setNativePreview(null); };
  }, [loaded, config.enabled]);
  useEffect(() => {
    if (!loaded || isNative() || !device || !config.enabled || stopped) return;
    const session = new BridgeSession(createF75Bridge(device));
    const host = new StudioRuntime(); host.configure(current.current); runtime.current = host;
    let lastPreview = 0, lastPoll = 0, sample: SystemSample | null = null, polling = false;
    const abort = new AbortController();
    let disposed = false;
    void session.connect().catch(e => { if (!disposed) notify(`Keyboard output: ${e instanceof Error ? e.message : String(e)}`); });
    const send = (frame: Parameters<typeof session.sendFrame>[0] | null) => {
      if (!frame || disposed) return;
      void session.sendFrame(frame).catch(e => { if (!disposed) notify(`Keyboard output stopped: ${e instanceof Error ? e.message : String(e)}`); });
    };
    const off = setStudioFrameSink(frame => { lastPreview = performance.now(); if (!game.current) send(frame); });
    const offGame = setGameFrameSink(frame => { game.current = frame !== null; send(frame); });
    const timer = setInterval(() => {
      const now = performance.now(), frame = host.render(now, sample);
      if (now - lastPreview > 200 && !game.current) send(frame);
      if (current.current.mode === 'system-activity' && current.current.modes.activity.source === 'computer' && now - lastPoll > 1000 && !polling) {
        polling = true; lastPoll = now;
        void fetch(process.env.NEXT_PUBLIC_STUDIO_TELEMETRY_URL || 'http://127.0.0.1:3001/telemetry', { signal: abort.signal, cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(value => { sample = value; }).catch(() => { sample = null; }).finally(() => { polling = false; });
      }
    }, 1000 / 30);
    return () => { disposed = true; clearInterval(timer); abort.abort(); off(); offGame(); runtime.current = null; game.current = false; void session.disconnect(); };
  }, [loaded, device, config.enabled, stopped, notify]);
  useEffect(() => {
    if (!loaded || !isNative()) return;
    return setGameFrameSink(frame => { if (!current.current.enabled) return; void nativeStudioInput('game', frame ? [...frame].map(([id, rgb]) => [id, ...rgb]) : null).catch(() => {}); });
  }, [loaded]);
}
