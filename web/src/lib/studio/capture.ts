import { AUDIO_FFT_SIZE, analyzeAudio, type AudioInput, type PixelSource } from '../../../../packages/engine/src';

export type CaptureSource = 'system' | 'microphone';

/** Capture belongs to the host. The shared engine only receives numeric samples. */
export async function captureAudio(source: CaptureSource, onSample: (sample: AudioInput) => void, onEnded: () => void): Promise<() => void> {
  if (!navigator.mediaDevices) throw new Error('Audio capture is unavailable in this browser.');
  const stream = source === 'microphone'
    ? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false }, video: false })
    : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  let context: AudioContext | null = null, timer: ReturnType<typeof setInterval> | undefined;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true; clearInterval(timer);
    stream.getTracks().forEach(track => track.stop());
    void context?.close();
  };
  try {
    if (!stream.getAudioTracks().length) throw new Error('No audio was shared. Choose a tab and enable “Share tab audio”, or select Microphone.');
    context = new AudioContext();
    await context.resume();
    const analyser = context.createAnalyser();
    analyser.fftSize = AUDIO_FFT_SIZE; analyser.smoothingTimeConstant = 0.2;
    const input = context.createMediaStreamSource(stream);
    input.connect(analyser);
    const stereo = (stream.getAudioTracks()[0].getSettings().channelCount ?? 0) >= 2;
    const splitter = context.createChannelSplitter(2);
    const channels = [context.createAnalyser(), context.createAnalyser()];
    input.connect(splitter);
    channels.forEach((channel, i) => { channel.fftSize = AUDIO_FFT_SIZE; splitter.connect(channel, i); });
    const channelData = channels.map(channel => new Uint8Array(channel.fftSize));
    const frequency = new Uint8Array(analyser.frequencyBinCount), waveform = new Uint8Array(analyser.fftSize);
    timer = setInterval(() => {
      analyser.getByteFrequencyData(frequency); analyser.getByteTimeDomainData(waveform);
      const sample = analyzeAudio(frequency, waveform, context!.sampleRate);
      if (stereo) {
        const rms = channels.map((channel, i) => { channel.getByteTimeDomainData(channelData[i]);
          return Math.min(1, Math.sqrt(channelData[i].reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / channelData[i].length) * 3.2);
        });
        sample.left = rms[0]; sample.right = rms[1];
      }
      onSample({ ...sample, waveform: Array.from({ length: 128 }, (_, i) => (waveform[i * 16] - 128) / 128) });
    }, 33);
    for (const track of stream.getTracks()) track.addEventListener('ended', () => { if (!stopped) { stop(); onEnded(); } });
    return stop;
  } catch (error) { stop(); throw error; }
}

export async function captureScreen(video: HTMLVideoElement, onFrame: (source: PixelSource) => void, onEnded: () => void): Promise<() => void> {
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Screen sharing is unavailable in this browser.');
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 54;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  let timer: ReturnType<typeof setInterval> | undefined, stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true; clearInterval(timer); stream.getTracks().forEach(track => track.stop());
    video.pause(); video.srcObject = null;
  };
  try {
    if (!context) throw new Error('Screen sampling is unavailable.');
    video.srcObject = stream; video.muted = true;
    await video.play();
    timer = setInterval(() => {
      if (video.readyState < 2) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      onFrame({ data: context.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height });
    }, 100);
    stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => { if (!stopped) { stop(); onEnded(); } }));
    return stop;
  } catch (error) { stop(); throw error; }
}

export function captureError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') return 'Capture wasn’t started. Choose a source when you’re ready.';
  if (error instanceof DOMException && error.name === 'NotFoundError') return 'No matching input was found. Try another source.';
  return error instanceof Error ? error.message : 'The source could not be opened.';
}
