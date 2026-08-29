'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  ANIMATIONS, ANIMATION_CATEGORIES, tintFrame, tintFn,
  type AnimationFn, type AnimationCategory, type RGB,
} from '@/lib/animations';
import { hexToRgb } from '@/lib/protocol';
import { buildDirectFrame, sendDirectFrame, enableDirectMode, disableDirectMode, buildBlankFrame } from '@/lib/direct-mode';
import { isWirelessDevice, sendWirelessAnimationFrame, sendWirelessIdle } from '@/lib/wireless-mode';
import { createTicker, startAudioKeepalive, stopAudioKeepalive, type Ticker } from '@/lib/keepalive';
import { KeyboardPreview } from './KeyboardPreview';
import { ColorControl } from './ColorControl';

interface AnimationsPanelProps {
  device: HIDDevice | null;
  log: (msg: string) => void;
}

export function AnimationsPanel({ device, log }: AnimationsPanelProps) {
  const [running, setRunning] = useState<string | null>(null);
  const [fps, setFps] = useState(20);
  const [category, setCategory] = useState<AnimationCategory | 'All'>('All');
  const [query, setQuery] = useState('');
  // Colorful by default: each of these effects was written around its own
  // palette, so overriding every one of them out of the box would be a loss.
  const [colorful, setColorful] = useState(true);
  const [color, setColor] = useState('#ff0040');
  // What the on-screen board is showing. Independent of `running`, which only
  // tracks the hardware stream — so effects can be browsed with nothing plugged in.
  const [selected, setSelected] = useState<string | null>(null);
  const tickerRef = useRef<Ticker | null>(null);
  const runningRef = useRef(false);
  // Also held in a ref so a colour change reaches the running ticker without
  // tearing the stream down and re-arming direct mode.
  const target: RGB | null = useMemo(() => (colorful ? null : hexToRgb(color)), [colorful, color]);
  const targetRef = useRef(target);
  useEffect(() => { targetRef.current = target; }, [target]);
  const transport = device?.opened ? (isWirelessDevice(device) ? 'wireless' : 'wired') : null;

  const stop = useCallback(async () => {
    runningRef.current = false;
    tickerRef.current?.stop();
    tickerRef.current = null;
    stopAudioKeepalive();
    setRunning(null);
    if (device?.opened) {
      try {
        if (isWirelessDevice(device)) {
          await sendWirelessIdle(device);
        } else {
          await sendDirectFrame(device, buildBlankFrame());
          await disableDirectMode(device, log);
        }
      } catch { /* best effort */ }
    }
  }, [device, log]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      tickerRef.current?.stop();
      tickerRef.current = null;
      stopAudioKeepalive();
    };
  }, []);

  const start = useCallback(async (name: string, fn: AnimationFn) => {
    if (!device?.opened) {
      log('Not connected!');
      return;
    }

    if (runningRef.current) await stop();

    const useWireless = isWirelessDevice(device);
    log(`Starting animation: ${name} (${useWireless ? '2.4GHz wireless' : 'USB-C direct'})`);
    if (!useWireless) {
      await enableDirectMode(device, log);
    }

    runningRef.current = true;
    setRunning(name);

    // Marks the tab audible so the browser does not throttle us in the
    // background. Called here because a click counts as the required gesture.
    if (!(await startAudioKeepalive())) {
      log('Note: background keepalive unavailable — the effect may reset if you switch away.');
    }

    // Driven by a Worker timer rather than requestAnimationFrame: rAF is
    // suspended outright for hidden tabs, and the firmware reverts to its
    // onboard effect as soon as frames stop arriving.
    const t0 = performance.now();
    let inFlight = false;

    tickerRef.current = createTicker(1000 / fps, () => {
      if (!runningRef.current || inFlight) return; // HID writes must not overlap
      inFlight = true;
      // Wall-clock time, so a dropped tick skips ahead instead of slowing down.
      const colors = tintFrame(fn((performance.now() - t0) / 1000), targetRef.current);
      const send = useWireless
        ? sendWirelessAnimationFrame(device, colors)
        : sendDirectFrame(device, buildDirectFrame(colors));
      send
        .catch(async (err) => {
          log(`Animation error: ${err instanceof Error ? err.message : String(err)}`);
          await stop();
        })
        .finally(() => { inFlight = false; });
    });
  }, [device, fps, log, stop]);

  // Re-assert direct mode when the tab comes back: if the browser did throttle
  // us hard enough for the firmware to time out, this recovers without a
  // manual restart.
  useEffect(() => {
    let hiddenAt = 0;
    const onChange = () => {
      if (document.visibilityState !== 'visible') { hiddenAt = Date.now(); return; }
      // Only re-arm after a hide long enough for the firmware to plausibly have
      // timed out. Sending the mode-switch reports on every alt-tab is a lot of
      // needless control traffic at the device.
      const away = Date.now() - hiddenAt;
      if (hiddenAt === 0 || away < 2000) return;
      if (!runningRef.current || !device?.opened || isWirelessDevice(device)) return;
      enableDirectMode(device, () => {}).catch(() => {});
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, [device]);

  // One click drives both surfaces: always the preview, and the keyboard too
  // when one is connected.
  const pick = useCallback(async (key: string, fn: AnimationFn) => {
    if (selected === key) {
      setSelected(null);
      if (runningRef.current) await stop();
      return;
    }
    setSelected(key);
    if (device?.opened) await start(key, fn);
  }, [selected, device, start, stop]);

  const previewFn = useMemo(() => {
    const anim = selected ? ANIMATIONS[selected]?.fn : null;
    return anim ? tintFn(anim, target) : null;
  }, [selected, target]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(ANIMATIONS).filter(([key, a]) =>
      (category === 'All' || a.category === category) &&
      (!q || a.name.toLowerCase().includes(q) || key.includes(q)),
    );
  }, [category, query]);

  return (
    <div className="space-y-4">
      <KeyboardPreview
        fn={previewFn}
        caption={selected ? ANIMATIONS[selected]?.name : undefined}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {transport === 'wireless'
            ? '2.4GHz wireless: uses 20-byte 0x88 color-group output reports'
            : transport === 'wired'
              ? 'USB-C direct mode: uses 520-byte Feature Reports'
              : 'Not connected — preview only. Plug in USB-C or the 2.4GHz dongle to drive the board.'}
        </p>
        <div className="flex items-center gap-4">
          <ColorControl
            colorful={colorful}
            color={color}
            onChangeColorful={setColorful}
            onChangeColor={setColor}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400">FPS:</label>
            <input
              type="number"
              min={5}
              max={30}
              value={fps}
              onChange={(e) => setFps(Math.max(5, Math.min(30, Number(e.target.value))))}
              className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(['All', ...ANIMATION_CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={[
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              category === cat
                ? 'bg-violet-600/25 border-violet-500/70 text-violet-200'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search effects…"
          className="ml-auto w-40 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-500"
        />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
        {entries.map(([key, { name, fn }]) => (
          <button
            key={key}
            onClick={() => pick(key, fn)}
            title={name}
            className={[
              'px-2 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 border truncate',
              selected === key
                ? 'bg-violet-600/30 border-violet-500 text-violet-200 shadow-lg shadow-violet-500/10'
                : 'bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-700/60 hover:border-zinc-600',
            ].join(' ')}
          >
            {running === key ? `■ ${name}` : name}
          </button>
        ))}
        {entries.length === 0 && (
          <p className="col-span-full py-6 text-center text-xs text-zinc-500">
            No effects match “{query}”.
          </p>
        )}
      </div>

      <p className="text-[11px] text-zinc-600">
        {entries.length} of {Object.keys(ANIMATIONS).length} effects
      </p>

      {running && (
        <button
          onClick={() => { setSelected(null); void stop(); }}
          className="w-full py-2 rounded-lg text-sm font-medium bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30 transition-colors"
        >
          Stop Animation
        </button>
      )}
    </div>
  );
}
