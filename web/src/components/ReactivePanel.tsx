'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  REACTIVE, REACTIVE_CATEGORIES,
  MOD_SHIFT, MOD_CTRL, MOD_ALT,
  type ReactiveCategory,
} from '@/lib/reactive';
import { ReactiveEngine } from '@/lib/reactive/engine';
import { type AnimationFn, type RGB } from '@/lib/animations';
import {
  isNative, nativeStartReactive, nativeStopEffects, nativeSetColor,
  onNativeStatus, watchNativeFrames,
} from '@/lib/native';
import { hexToRgb } from '@/lib/protocol';
import {
  buildDirectFrame, sendDirectFrame, enableDirectMode, disableDirectMode, buildBlankFrame,
} from '@/lib/direct-mode';
import { isWirelessDevice, sendWirelessAnimationFrame, sendWirelessIdle } from '@/lib/wireless-mode';
import { KeyboardPreview } from './KeyboardPreview';
import { ColorControl } from './ColorControl';

interface Props {
  device: HIDDevice | null;
  log: (msg: string) => void;
}

const HW_FPS = 30;
/** Keys the browser would otherwise act on. Everything else types normally. */
const SWALLOW = new Set([
  'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'PageUp', 'PageDown', 'Home', 'End', 'Backspace',
]);

export function ReactivePanel({ device, log }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [category, setCategory] = useState<ReactiveCategory | 'All'>('All');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState(0);
  // Colorful by default: these effects each pick their own hues — several key
  // off the press itself — so a single colour is the opt-in, not the baseline.
  const [colorful, setColorful] = useState(true);
  const [color, setColor] = useState('#ff0040');

  // Inside the desktop app the effect runs in the main process off the
  // global key hook; this panel is then a remote control plus a mirror of
  // the frames the engine is really sending.
  const native = isNative();

  // The press buffer, clock, and eviction all live in the shared engine so
  // the desktop app's global-hook path can never drift from this one.
  const [engine] = useState(() => new ReactiveEngine(() => performance.now()));
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef<string | null>(null);
  /** Latest frame streamed from the main process (native mode only). */
  const nativeFrameRef = useRef<Map<number, [number, number, number]>>(new Map());
  // In a ref because renderFrame is deliberately identity-stable: it is
  // captured by the rAF loop that `start` arms, so a colour change has to
  // reach it without re-running that callback.
  const targetRef = useRef<RGB | null>(null);
  useEffect(() => { targetRef.current = colorful ? null : hexToRgb(color); }, [colorful, color]);

  // Colour changes reach the main-process engine as they happen.
  useEffect(() => {
    if (native) void nativeSetColor(colorful ? null : color);
  }, [native, colorful, color]);

  const stop = useCallback(async () => {
    activeRef.current = null;
    setActive(null);
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    engine.stop();
    if (native) {
      await nativeStopEffects();
      nativeFrameRef.current = new Map();
      return;
    }
    if (device?.opened) {
      try {
        if (isWirelessDevice(device)) await sendWirelessIdle(device);
        else {
          await sendDirectFrame(device, buildBlankFrame());
          await disableDirectMode(device, log);
        }
      } catch { /* best effort */ }
    }
  }, [device, log, engine, native]);

  useEffect(() => () => {
    activeRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  // Native mode: the tray or a resumed session can also drive the engine, so
  // mirror whatever the main process says is running.
  useEffect(() => {
    if (!native) return;
    return onNativeStatus((s) => {
      activeRef.current = s.reactive;
      setActive(s.reactive);
      if (!s.reactive) nativeFrameRef.current = new Map();
    });
  }, [native]);

  // Native mode: mirror the engine's real frames for the on-screen board.
  useEffect(() => {
    if (!native || !active) return;
    return watchNativeFrames((frame, hits) => {
      nativeFrameRef.current = frame;
      setHits(hits);
    });
  }, [native, active]);

  // Typing drives the effect, so presses are recorded but NOT swallowed —
  // except keys that would scroll the page out from under you. Never armed in
  // native mode: the global hook already sees every key, focused or not.
  useEffect(() => {
    if (!active || native) return;
    const down = (e: KeyboardEvent) => {
      if (SWALLOW.has(e.code)) e.preventDefault();
      // Auto-repeat is not a new keystroke. Modified presses *are* — the
      // Modifiers family exists to react to them, so they are recorded with
      // the modifier state rather than dropped.
      if (e.repeat) return;
      const mods = (e.shiftKey ? MOD_SHIFT : 0)
        | (e.ctrlKey || e.metaKey ? MOD_CTRL : 0)
        | (e.altKey ? MOD_ALT : 0);
      if (engine.keyDown(e.code, mods)) setHits((n) => n + 1);
    };
    const up = (e: KeyboardEvent) => engine.keyUp(e.code);
    // A lost focus would otherwise leave keys stuck down forever.
    const blur = () => engine.releaseAll();
    window.addEventListener('keydown', down, { capture: true });
    window.addEventListener('keyup', up, { capture: true });
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down, { capture: true });
      window.removeEventListener('keyup', up, { capture: true });
      window.removeEventListener('blur', blur);
    };
  }, [active, engine, native]);

  const renderFrame = useCallback<AnimationFn>(
    () => (native ? nativeFrameRef.current : engine.render(targetRef.current)),
    [engine, native],
  );

  const start = useCallback(async (id: string) => {
    if (activeRef.current) await stop();
    const def = REACTIVE[id];
    if (!def) return;

    engine.start(id);
    setHits(0);
    activeRef.current = id;
    setActive(id);

    if (native) {
      log(`Reactive: ${def.name} (desktop engine — works everywhere)`);
      await nativeSetColor(colorful ? null : color);
      await nativeStartReactive(id);
      return;
    }

    const useWireless = device?.opened ? isWirelessDevice(device) : false;
    if (device?.opened) {
      log(`Reactive: ${def.name} (${useWireless ? '2.4GHz wireless' : 'USB-C direct'})`);
      if (!useWireless) await enableDirectMode(device, log);
    } else {
      log(`Reactive: ${def.name} (preview only — nothing connected)`);
    }

    let hwDue = 0;
    let inFlight = false;
    const loop = (now: number) => {
      if (activeRef.current !== id) return;
      if (device?.opened && now >= hwDue && !inFlight) {
        hwDue = now + 1000 / HW_FPS;
        inFlight = true;
        const colors = renderFrame(0);
        const send = useWireless
          ? sendWirelessAnimationFrame(device, colors)
          : sendDirectFrame(device, buildDirectFrame(colors));
        send.catch((err) => {
          log(`Reactive error: ${err instanceof Error ? err.message : String(err)}`);
          void stop();
        }).finally(() => { inFlight = false; });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [device, log, stop, renderFrame, engine, native, colorful, color]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(REACTIVE).filter(([key, e]) =>
      (category === 'All' || e.category === category) &&
      (!q || e.name.toLowerCase().includes(q) || key.includes(q)),
    );
  }, [category, query]);

  const def = active ? REACTIVE[active] : null;

  return (
    <div className="space-y-4">
      <KeyboardPreview
        fn={active ? renderFrame : null}
        caption={def ? `${def.name} — ${hits} press${hits === 1 ? '' : 'es'}` : undefined}
      />

      {def && <p className="-mt-2 text-xs text-zinc-400">{def.description}</p>}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400 flex items-start justify-between gap-4">
        <div className="space-y-1">
          {active
            ? <p className="text-zinc-300"><strong>{native ? 'Type anywhere in Windows' : 'Type anywhere on this page'}</strong> and the board reacts. Your keystrokes still reach {native ? 'every application' : 'the page'} normally.</p>
            : <p>Pick an effect, then type. Works with nothing connected — the board above reacts too.</p>}
          {native ? (
            <p className="text-emerald-400/70">
              Runs in the background: the effect keeps working in any application,
              even with this window closed to the tray.
            </p>
          ) : (
            <p className="text-amber-400/70">
              Only works while this tab has focus. A browser cannot see keystrokes sent to other
              applications, so this cannot light up while you work elsewhere.
            </p>
          )}
        </div>
        <ColorControl
          colorful={colorful}
          color={color}
          onChangeColorful={setColorful}
          onChangeColor={setColor}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(['All', ...REACTIVE_CATEGORIES] as const).map((cat) => (
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
        {entries.map(([key, e]) => (
          <button
            key={key}
            onClick={() => (active === key ? void stop() : void start(key))}
            title={`${e.name} (${e.category}) — ${e.description}`}
            className={[
              'px-2 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 border truncate',
              active === key
                ? 'bg-violet-600/30 border-violet-500 text-violet-200 shadow-lg shadow-violet-500/10'
                : 'bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-700/60 hover:border-zinc-600',
            ].join(' ')}
          >
            {e.name}
          </button>
        ))}
        {entries.length === 0 && (
          <p className="col-span-full py-6 text-center text-xs text-zinc-500">
            No effects match “{query}”.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-600">
          {entries.length} of {Object.keys(REACTIVE).length} reactive effects
        </p>
        {active && (
          <button
            onClick={() => void stop()}
            className="px-3 py-1.5 rounded text-xs font-medium bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
