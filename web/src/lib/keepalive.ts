/**
 * Keeping a frame pump alive while the tab is in the background.
 *
 * The firmware reverts to its configured onboard effect after a short idle
 * timeout (see direct-mode.ts). That makes browser throttling a correctness
 * problem, not a performance one — the moment frames stop, the animation is
 * gone. Chrome's rules, in the order they bite:
 *
 *   1. requestAnimationFrame stops completely for a hidden tab. This is why
 *      the animation died the instant you switched away.
 *   2. window setTimeout/setInterval in a hidden tab is clamped to >= 1s.
 *   3. After 5 minutes hidden, "intensive throttling" clamps it to >= 1min.
 *
 * Two mitigations, layered:
 *
 *   - Run the timer in a Worker. Worker timers are not subject to the 1s
 *     window clamp, so this alone fixes the common case.
 *   - Mark the page audible. An audible page is exempt from both background
 *     and intensive throttling, which is what protects the 5-minute cliff.
 *     The tone is 1 Hz at very low gain: below the audible band and far below
 *     any speaker's floor, but the tab still registers as playing audio.
 */

export type Ticker = { stop: () => void };

const WORKER_SRC = `
let id = null;
onmessage = (e) => {
  if (e.data && e.data.type === 'start') {
    if (id !== null) clearInterval(id);
    id = setInterval(() => postMessage(0), e.data.ms);
  } else {
    if (id !== null) clearInterval(id);
    id = null;
  }
};
`;

/**
 * Fire `onTick` every `intervalMs`, from a Worker where possible so a hidden
 * tab does not clamp it. Falls back to a window timer if Workers or blob URLs
 * are unavailable.
 */
export function createTicker(intervalMs: number, onTick: () => void): Ticker {
  try {
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    const worker = new Worker(url);
    worker.onmessage = onTick;
    worker.postMessage({ type: 'start', ms: intervalMs });
    return {
      stop: () => {
        worker.postMessage({ type: 'stop' });
        worker.terminate();
        URL.revokeObjectURL(url);
      },
    };
  } catch {
    const id = setInterval(onTick, intervalMs);
    return { stop: () => clearInterval(id) };
  }
}

let audioCtx: AudioContext | null = null;
let audioNodes: { osc: OscillatorNode; gain: GainNode } | null = null;

/**
 * Mark the page as playing audio so the browser exempts it from background
 * throttling. Must be called from a user gesture, or the AudioContext starts
 * suspended — pressing an effect button qualifies.
 */
export async function startAudioKeepalive(): Promise<boolean> {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext ?? (window as unknown as {
        webkitAudioContext?: typeof AudioContext
      }).webkitAudioContext;
      if (!Ctor) return false;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    if (!audioNodes) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = 1; // sub-audible
      gain.gain.value = 0.001; // non-zero, so the tab counts as audible
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      audioNodes = { osc, gain };
    }
    return audioCtx.state === 'running';
  } catch {
    return false;
  }
}

export function stopAudioKeepalive() {
  if (audioNodes) {
    try { audioNodes.osc.stop(); } catch { /* already stopped */ }
    audioNodes.osc.disconnect();
    audioNodes.gain.disconnect();
    audioNodes = null;
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
}
