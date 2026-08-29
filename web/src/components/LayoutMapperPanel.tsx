'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  buildDirectFrame, sendDirectFrame, enableDirectMode, disableDirectMode,
  buildBlankFrame, startPreviewKeepalive, stopPreviewKeepalive,
} from '@/lib/direct-mode';
import { isWirelessDevice } from '@/lib/wireless-mode';
import { CODE_LABEL, KEY_WIDTH, generateKbRows } from '@/lib/layout-map';

interface Props {
  device: HIDDevice | null;
  log: (msg: string) => void;
}

/** LED index = column * 6 + row, verified against the shipped KB_ROWS. */
const N_ROWS = 6;
const N_COLS = 17;
const ALL_INDICES = Array.from({ length: N_ROWS * N_COLS }, (_, i) => i);
/**
 * The alpha block matches a standard 75% and is not worth re-testing. What is
 * actually uncertain on this board is the right-hand column cluster (cols
 * 14-16) and the bottom row, where the F75 drops the right Alt and App keys.
 */
const UNCERTAIN = [
  ...Array.from({ length: 18 }, (_, i) => 84 + i), // cols 14-16
  53, 59, 65, // bottom row: right Alt / Fn / App on a generic 75%
];

export function LayoutMapperPanel({ device, log }: Props) {
  const [queue, setQueue] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<Record<number, string>>({});
  const [active, setActive] = useState(false);
  const posRef = useRef(0);
  const activeRef = useRef(false);

  const wired = device?.opened && !isWirelessDevice(device);
  const current = active && pos < queue.length ? queue[pos] : null;

  const light = useCallback(async (idx: number | null) => {
    if (!device?.opened) return;
    stopPreviewKeepalive();
    const colors = new Map<number, [number, number, number]>();
    if (idx !== null) colors.set(idx, [255, 255, 255]);
    const frame = idx === null ? buildBlankFrame() : buildDirectFrame(colors);
    try {
      await sendDirectFrame(device, frame);
      // Without a keepalive the firmware drops back to its own effect after a
      // second or so, and the key you are meant to identify goes dark.
      if (idx !== null) startPreviewKeepalive(device, frame);
    } catch (err) {
      log(`Mapper: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [device, log]);

  const finish = useCallback(async () => {
    activeRef.current = false;
    setActive(false);
    stopPreviewKeepalive();
    if (device?.opened) {
      try {
        await sendDirectFrame(device, buildBlankFrame());
        await disableDirectMode(device, log);
      } catch { /* best effort */ }
    }
  }, [device, log]);

  const record = useCallback((idx: number, code: string | null) => {
    if (code) setResults((r) => ({ ...r, [idx]: code }));
    const next = posRef.current + 1;
    posRef.current = next;
    setPos(next);
    if (next >= queue.length) { void finish(); return; }
    void light(queue[next]);
  }, [queue, light, finish]);

  // Physical keypresses are the answer channel: event.code identifies the key
  // that was actually pressed, independent of layout or modifiers.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      const idx = queue[posRef.current];
      if (idx !== undefined) record(idx, e.code);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [active, queue, record]);

  useEffect(() => () => { stopPreviewKeepalive(); }, []);

  const begin = useCallback(async (indices: number[]) => {
    if (!device?.opened) { log('Not connected!'); return; }
    if (isWirelessDevice(device)) {
      log('Layout mapping needs the USB-C cable — the wireless path cannot address single LEDs.');
      return;
    }
    await enableDirectMode(device, log);
    setQueue(indices);
    setResults({});
    setPos(0);
    posRef.current = 0;
    activeRef.current = true;
    setActive(true);
    await light(indices[0]);
  }, [device, log, light]);

  const mapped = Object.keys(results).length;
  const snippet = generateKbRows(results, N_ROWS, N_COLS);

  return (
    <div className="space-y-4">
      <div className="text-xs text-zinc-400 space-y-1">
        <p>
          Lights one LED at a time. <strong className="text-zinc-200">Press the key that lights up</strong> —
          the app records which LED index drives it. Use Skip if nothing lights (that index has no key).
        </p>
        <p className="text-zinc-500">
          Needs the USB-C cable. Keystrokes are captured, so nothing you press reaches the page.
        </p>
      </div>

      {!active && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => begin(UNCERTAIN)}
            disabled={!wired}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-violet-600/25 border border-violet-500/70 text-violet-200 hover:bg-violet-600/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Map uncertain keys ({UNCERTAIN.length})
          </button>
          <button
            onClick={() => begin(ALL_INDICES)}
            disabled={!wired}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800/60 border border-zinc-700 text-zinc-300 hover:bg-zinc-700/60 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Map all {ALL_INDICES.length}
          </button>
          {!wired && (
            <p className="self-center text-xs text-amber-400/80">Connect over USB-C to start.</p>
          )}
        </div>
      )}

      {active && current !== null && (
        <div className="rounded-lg border border-violet-500/40 bg-violet-950/20 p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-zinc-300">
              Press the lit key —{' '}
              <span className="font-mono text-violet-300">
                LED {current}
              </span>{' '}
              <span className="text-zinc-500">
                (col {Math.floor(current / N_ROWS)}, row {current % N_ROWS})
              </span>
            </p>
            <span className="text-xs text-zinc-500">{pos + 1} / {queue.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-[width] duration-200"
              style={{ width: `${((pos + 1) / queue.length) * 100}%` }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => record(current, null)}
              className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700"
            >
              Skip — nothing lit
            </button>
            <button
              onClick={() => void finish()}
              className="px-3 py-1.5 rounded text-xs font-medium bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {mapped > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">{mapped} keys identified</p>
            <button
              onClick={() => navigator.clipboard?.writeText(snippet)}
              className="px-2.5 py-1 rounded text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700"
            >
              Copy KB_ROWS
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="text-[11px] font-mono border-collapse">
              <tbody>
                {Array.from({ length: N_ROWS }, (_, r) => (
                  <tr key={r}>
                    <td className="pr-2 text-zinc-600">r{r}</td>
                    {Array.from({ length: N_COLS }, (_, c) => {
                      const idx = c * N_ROWS + r;
                      const code = results[idx];
                      return (
                        <td
                          key={c}
                          title={code ? `${code} = LED ${idx}` : `LED ${idx}`}
                          className={[
                            'border px-1 py-0.5 text-center min-w-[2.2rem]',
                            code
                              ? 'border-violet-600/50 bg-violet-900/25 text-violet-200'
                              : 'border-zinc-800 text-zinc-700',
                          ].join(' ')}
                        >
                          {code ? (CODE_LABEL[code] ?? code.replace(/^(Key|Digit)/, '')) : '·'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <pre className="text-[10px] leading-relaxed bg-zinc-900/80 border border-zinc-800 rounded p-3 overflow-x-auto text-zinc-400">
            {snippet}
          </pre>
          <p className="text-[11px] text-zinc-500">
            Paste this over <code className="text-zinc-400">KB_ROWS</code> in{' '}
            <code className="text-zinc-400">src/lib/protocol.ts</code>. Widths come from{' '}
            <code className="text-zinc-400">{Object.keys(KEY_WIDTH).length}</code> known key sizes;
            adjust any that look off.
          </p>
        </div>
      )}
    </div>
  );
}
