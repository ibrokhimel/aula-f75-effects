'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { GAMES, type Game, type GameView } from '@/lib/games';
import type { AnimationFn } from '@/lib/animations';
import {
  buildDirectFrame, sendDirectFrame, enableDirectMode, disableDirectMode, buildBlankFrame,
} from '@/lib/direct-mode';
import { isWirelessDevice, sendWirelessAnimationFrame, sendWirelessIdle } from '@/lib/wireless-mode';
import { KeyboardPreview } from './KeyboardPreview';

interface Props {
  device: HIDDevice | null;
  log: (msg: string) => void;
}

const HW_FPS = 30;
const EMPTY: GameView = { score: 0, status: '', state: 'playing' };

export function GamesPanel({ device, log }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<GameView>(EMPTY);

  const gameRef = useRef<Game | null>(null);
  const heldRef = useRef(new Set<string>());
  const pressedRef = useRef(new Set<string>());
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef<string | null>(null);

  // Rendering reads whatever the game currently holds, so the preview and the
  // keyboard always show the same frame without a second copy of game state.
  // Stable identity, so handing it to KeyboardPreview never restarts its loop.
  const renderFrame = useCallback<AnimationFn>(
    () => gameRef.current?.render() ?? new Map(), []);

  const stop = useCallback(async () => {
    activeRef.current = null;
    setActive(null);
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    heldRef.current.clear();
    pressedRef.current.clear();
    gameRef.current = null;
    if (device?.opened) {
      try {
        if (isWirelessDevice(device)) await sendWirelessIdle(device);
        else {
          await sendDirectFrame(device, buildBlankFrame());
          await disableDirectMode(device, log);
        }
      } catch { /* best effort */ }
    }
  }, [device, log]);

  useEffect(() => () => {
    activeRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  // Keystrokes are the controller, so they must not reach the page. Modifier
  // combos pass through, or the browser's own shortcuts would be trapped too.
  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      if (e.code === 'Escape') { void stop(); return; }
      if (e.repeat) return;
      heldRef.current.add(e.code);
      pressedRef.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      heldRef.current.delete(e.code);
    };
    const blur = () => heldRef.current.clear(); // otherwise keys stick down
    window.addEventListener('keydown', down, { capture: true });
    window.addEventListener('keyup', up, { capture: true });
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down, { capture: true });
      window.removeEventListener('keyup', up, { capture: true });
      window.removeEventListener('blur', blur);
    };
  }, [active, stop]);

  const start = useCallback(async (id: string) => {
    if (activeRef.current) await stop();
    const def = GAMES[id];
    if (!def) return;

    // Seeded from the clock: reproducible within a run, different each time.
    gameRef.current = def.create(Date.now() & 0xffffffff);
    activeRef.current = id;
    setActive(id);
    setView(gameRef.current.view());

    const useWireless = device?.opened ? isWirelessDevice(device) : false;
    if (device?.opened) {
      log(`Starting ${def.name} (${useWireless ? '2.4GHz wireless' : 'USB-C direct'})`);
      if (!useWireless) await enableDirectMode(device, log);
    } else {
      log(`Starting ${def.name} (preview only — nothing connected)`);
    }

    let last = performance.now();
    let hwDue = 0;
    let viewDue = 0;
    let inFlight = false;

    const loop = (now: number) => {
      if (activeRef.current !== id) return;
      // Clamped so a stall cannot teleport the ball through a paddle.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const g = gameRef.current;
      if (g) {
        g.step(dt, { held: heldRef.current, pressed: pressedRef.current });
        pressedRef.current.clear();

        if (device?.opened && now >= hwDue && !inFlight) {
          hwDue = now + 1000 / HW_FPS;
          inFlight = true;
          const colors = g.render();
          const send = useWireless
            ? sendWirelessAnimationFrame(device, colors)
            : sendDirectFrame(device, buildDirectFrame(colors));
          send.catch((err) => {
            log(`Game error: ${err instanceof Error ? err.message : String(err)}`);
            void stop();
          }).finally(() => { inFlight = false; });
        }
        // Throttled: React does not need to re-render at frame rate.
        if (now >= viewDue) { viewDue = now + 100; setView(g.view()); }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [device, log, stop]);

  const def = active ? GAMES[active] : null;

  return (
    <div className="space-y-4">
      <KeyboardPreview
        fn={active ? renderFrame : null}
        caption={def ? `${def.name} — ${view.status}` : undefined}
      />

      {active && def ? (
        <div className="rounded-lg border border-violet-500/40 bg-violet-950/20 p-3 space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-zinc-200 font-medium">{def.name}</span>
            <span className="text-xs text-zinc-400 font-mono">{def.controls}</span>
          </div>
          <p className={[
            'text-sm font-mono',
            view.state === 'over' ? 'text-amber-300' : 'text-zinc-300',
          ].join(' ')}>
            {view.status}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => start(active)}
              className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700"
            >
              {view.state === 'over' ? 'Play again' : 'Restart'}
            </button>
            <button
              onClick={() => void stop()}
              className="px-3 py-1.5 rounded text-xs font-medium bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30"
            >
              Stop (Esc)
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Keys are captured while a game runs — nothing you press reaches the page.
          </p>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          {device?.opened
            ? 'Pick a game. It plays on the keyboard and on the board above.'
            : 'Pick a game — it runs in the preview above. Connect USB-C to play it on the keyboard.'}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {Object.entries(GAMES).map(([id, g]) => (
          <button
            key={id}
            onClick={() => (active === id ? void stop() : void start(id))}
            className={[
              'text-left px-3 py-2.5 rounded-lg border transition-colors',
              active === id
                ? 'bg-violet-600/25 border-violet-500 text-violet-100'
                : 'bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-700/60 hover:border-zinc-600',
            ].join(' ')}
          >
            <span className="block text-sm font-medium">{g.name}</span>
            <span className="block text-[11px] text-zinc-500 mt-0.5">{g.blurb}</span>
            <span className="block text-[11px] font-mono text-zinc-600 mt-1">{g.controls}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
