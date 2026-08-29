'use client';

import { useEffect, useRef } from 'react';
import { KB_ROWS } from '@/lib/protocol';
import type { AnimationFn } from '@/lib/animations';

/** Widest row, in key units — every row is laid out against this. */
const BOARD_U = Math.max(
  ...KB_ROWS.map((row) => row.reduce<number>((s, e) => s + (Array.isArray(e) ? e[2] : e), 0)),
);

interface Props {
  fn: AnimationFn | null;
  /** Label shown above the board; usually the effect name. */
  caption?: string;
}

/**
 * On-screen mirror of what the keyboard is doing. It runs the same generator
 * the hardware path does, so what you see here is what the board renders —
 * and it works with nothing plugged in, which makes browsing 116 effects
 * practical.
 *
 * Colours are written straight to the DOM nodes from a rAF loop rather than
 * through React state: 80 keys at 60fps would be 4,800 re-renders a second
 * otherwise.
 */
export function KeyboardPreview({ fn, caption }: Props) {
  const keyRefs = useRef(new Map<number, HTMLDivElement>());
  // Held in a ref so swapping effects does not tear down the paint loop.
  const fnRef = useRef<AnimationFn | null>(fn);
  useEffect(() => { fnRef.current = fn; }, [fn]);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();

    const paint = () => {
      const gen = fnRef.current;
      const nodes = keyRefs.current;
      if (gen) {
        const colors = gen((performance.now() - t0) / 1000);
        for (const [led, node] of nodes) {
          const c = colors.get(led);
          if (c) {
            const [r, g, b] = c;
            node.style.background = `rgb(${r},${g},${b})`;
            // The bloom is what makes it read as backlighting rather than
            // as a flat swatch; scaled by brightness so dark keys stay dark.
            const lum = (r + g + b) / 765;
            node.style.boxShadow = lum > 0.08
              ? `0 0 ${6 + lum * 10}px rgba(${r},${g},${b},${0.25 + lum * 0.45})`
              : 'none';
          } else {
            node.style.background = '#141417';
            node.style.boxShadow = 'none';
          }
        }
      } else {
        for (const node of nodes.values()) {
          node.style.background = '#141417';
          node.style.boxShadow = 'none';
        }
      }
      raf = requestAnimationFrame(paint);
    };

    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">Live preview</span>
        <span className="text-xs text-zinc-400">{caption ?? 'nothing selected'}</span>
      </div>

      <div className="w-full select-none" style={{ containerType: 'inline-size' }}>
        {KB_ROWS.map((row, ri) => (
          <div key={ri} className="flex w-full" style={{ height: '1.55rem', marginBottom: 3 }}>
            {row.map((entry, ei) => {
              if (!Array.isArray(entry)) {
                return <div key={`g${ei}`} style={{ width: `${(entry / BOARD_U) * 100}%` }} />;
              }
              const [label, led, w] = entry;
              return (
                <div key={led} style={{ width: `${(w / BOARD_U) * 100}%`, padding: '0 1.5px' }}>
                  <div
                    ref={(el) => {
                      if (el) keyRefs.current.set(led, el);
                      else keyRefs.current.delete(led);
                    }}
                    title={`${label} — LED ${led}`}
                    className="h-full w-full rounded-[3px] flex items-center justify-center overflow-hidden"
                    style={{ background: '#141417' }}
                  >
                    <span
                      className="text-[7px] leading-none font-medium text-black/45 truncate px-0.5"
                      style={{ mixBlendMode: 'overlay' }}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
