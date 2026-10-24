import { defaultEffects } from '../keyboard-effects';
import { AUDIO_FFT_SIZE, analyzeAudio } from '../../../../packages/engine/src/audio';
export { AUDIO_FFT_SIZE, SPECTRUM_BINS, analyzeAudio } from '../../../../packages/engine/src/audio';
export type { AudioSample } from '../../../../packages/engine/src/audio';
export const { setSoundClock, soundNow, SOUND_STATE, resetSound, pushAudioSample, audioAlive } = defaultEffects.audio;

// ── Browser capture ─────────────────────────────────────────────────────
// The web playground's path: a screen share with "share audio" ticked. The
// desktop app never calls this — its hidden capture window feeds
// pushAudioSample over IPC with real system loopback instead.

/**
 * Ask the browser for audio and start pushing samples. Resolves to a stop
 * function. Rejects if the user declines or the share carries no audio.
 */
export async function startBrowserCapture(): Promise<() => void> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true, // Chromium refuses audio-only display capture
  });
  for (const track of stream.getVideoTracks()) track.stop();
  if (stream.getAudioTracks().length === 0) {
    throw new Error('The share had no audio — tick "share audio" in the picker');
  }
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = AUDIO_FFT_SIZE;
  analyser.smoothingTimeConstant = 0.5;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const freq = new Uint8Array(analyser.frequencyBinCount);
  const time = new Uint8Array(analyser.fftSize);
  const timer = setInterval(() => {
    analyser.getByteFrequencyData(freq);
    analyser.getByteTimeDomainData(time);
    pushAudioSample(analyzeAudio(freq, time, ctx.sampleRate));
  }, 33);
  return () => {
    clearInterval(timer);
    for (const track of stream.getTracks()) track.stop();
    void ctx.close();
    resetSound();
  };
}
