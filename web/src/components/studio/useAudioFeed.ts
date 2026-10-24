'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sampleAudio, type AudioInput } from '../../../../packages/engine/src';
import type { ModeSettings } from '@/lib/studio/modes';
import { captureAudio, captureError } from '@/lib/studio/capture';
import { isNative, nativeStudioInput, nativeStudioAudioCapture, onNativeStudioAudio, onNativeStudioAudioState } from '@/lib/native';

export type AudioSource = ModeSettings['audio']['source'];
export interface AudioFeed {
  active: boolean; pending: boolean; error: string; start: () => Promise<void>; stop: () => void;
  /** Starts a live source once per selected source, so a cancelled picker doesn't reopen on every click. */
  request: () => void;
}

/**
 * One audio input for every mode that needs it. The sample signal flows on its own while
 * `enabled`; live sources start from start(), which browsers require inside a click.
 * Samples arrive raw (unsmoothed) and only while playback is running.
 */
export function useAudioFeed(source: AudioSource, enabled: boolean, playing: boolean, onSample: (sample: AudioInput) => void): AudioFeed {
  const stopCapture = useRef<() => void>(() => {}), generation = useRef(0);
  const current = useRef({ playing, onSample });
  useEffect(() => { current.current = { playing, onSample }; }, [playing, onSample]);
  const [connection, setConnection] = useState({ source: '', phase: 'idle', error: '' });
  const deliver = useCallback((sample: AudioInput) => { if (current.current.playing) current.current.onSample(sample); }, []);

  const stop = useCallback(() => {
    generation.current++; stopCapture.current(); stopCapture.current = () => {};
    setConnection({ source, phase: 'idle', error: '' });
  }, [source]);

  const start = useCallback(async () => {
    generation.current++; stopCapture.current(); stopCapture.current = () => {};
    const token = generation.current;
    if (source === 'sample') return;
    setConnection({ source, phase: 'pending', error: '' });
    try {
      if (isNative() && source === 'system') {
        const off = onNativeStudioAudio(next => { if (generation.current === token) deliver(next); });
        const offState = onNativeStudioAudioState(state => { if (generation.current === token) setConnection({ source, phase: state.active ? 'active' : 'idle', error: state.error ?? '' }); });
        stopCapture.current = () => { off(); offState(); void nativeStudioAudioCapture(false); };
        await nativeStudioAudioCapture(true);
        if (generation.current !== token) { off(); offState(); await nativeStudioAudioCapture(false); }
        return;
      }
      const dispose = await captureAudio(source, next => {
        if (generation.current !== token) return;
        deliver(next);
        if (isNative() && current.current.playing) void nativeStudioInput('audio', next);
      }, () => { if (generation.current === token) setConnection({ source, phase: 'idle', error: 'The input was disconnected.' }); });
      if (generation.current !== token) { dispose(); return; }
      stopCapture.current = dispose; setConnection({ source, phase: 'active', error: '' });
    } catch (error) { if (generation.current === token) setConnection({ source, phase: 'idle', error: captureError(error) }); }
  }, [source, deliver]);

  // The labeled sample signal needs no permission, so it simply runs while wanted.
  useEffect(() => {
    if (!enabled || source !== 'sample') return;
    const started = performance.now();
    const timer = setInterval(() => deliver(sampleAudio((performance.now() - started) / 1000)), 33);
    return () => clearInterval(timer);
  }, [enabled, source, deliver]);
  // Windows loopback capture needs no picker, so it starts as soon as an effect asks for it.
  useEffect(() => {
    if (!enabled || source !== 'system' || !isNative()) return;
    const timer = setTimeout(() => void start(), 0);
    return () => clearTimeout(timer);
  }, [enabled, source, start]);
  // Leaving a source, or no longer needing audio, releases the device. Becoming enabled must not:
  // request() may already have opened capture inside the click that selected the effect.
  const asked = useRef('');
  const release = useCallback(() => { generation.current++; stopCapture.current(); stopCapture.current = () => {}; asked.current = ''; setConnection(c => ({ ...c, phase: 'idle' })); }, []);
  useEffect(() => enabled ? release : undefined, [enabled, release]);
  useEffect(() => release, [source, release]);

  const mine = connection.source === source, active = mine && connection.phase === 'active', pending = mine && connection.phase === 'pending';
  const request = () => { if (source === 'sample' || active || pending || asked.current === source) return; asked.current = source; void start(); };
  return { active, pending, error: mine ? connection.error : '', start, stop, request };
}
