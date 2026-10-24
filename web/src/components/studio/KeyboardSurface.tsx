'use client';

import type { ComponentProps, PointerEvent } from 'react';
import { F75_LAYOUT } from '@/lib/bridges/f75/layout';
import { KeyboardCanvas } from './KeyboardCanvas';

export function KeyboardSurface({ selected = [], onSelect, onPress, onRelease, ...canvas }: ComponentProps<typeof KeyboardCanvas> & {
  selected?: readonly number[];
  onSelect?: (id: number, extend: boolean) => void;
  onPress?: (code: string) => void;
  onRelease?: (code: string) => void;
}) {
  function down(event: PointerEvent<HTMLButtonElement>, code: string | undefined) {
    if (!onPress || !code) return;
    event.currentTarget.setPointerCapture(event.pointerId); onPress(code);
  }
  return <div className="studio-key-surface"><KeyboardCanvas {...canvas} />{(onSelect || onPress) && <div className="studio-key-targets" aria-label="Interactive keyboard">{F75_LAYOUT.leds.map(led => <button
    type="button" key={led.id} data-led={led.id} tabIndex={led.id === (selected[0] ?? F75_LAYOUT.leds[0].id) ? 0 : -1} aria-label={`Key ${led.label}`} aria-pressed={onSelect ? selected.includes(led.id) : undefined} title={led.label}
    className={selected.includes(led.id) ? 'is-key-selected' : ''}
    style={{ left: `${(34 + (led.x - (led.width ?? 1) / 2) * 60) / 1024 * 100}%`, top: `${(31 + led.row * 54 + (led.row ? 7 : 0)) / 390 * 100}%`, width: `${((led.width ?? 1) * 60 - 5) / 1024 * 100}%`, height: `${47 / 390 * 100}%` }}
    onClick={event => onSelect?.(led.id, event.shiftKey || event.metaKey || event.ctrlKey)}
    onPointerDown={event => down(event, led.keyCode)} onPointerUp={() => led.keyCode && onRelease?.(led.keyCode)} onLostPointerCapture={() => led.keyCode && onRelease?.(led.keyCode)}
    onKeyDown={event => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const index = F75_LAYOUT.leds.findIndex(key => key.id === led.id);
        const adjacent = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
          ? F75_LAYOUT.leds[Math.max(0, Math.min(F75_LAYOUT.leds.length - 1, index + (event.key === 'ArrowLeft' ? -1 : 1)))]
          : F75_LAYOUT.leds.filter(key => key.row === led.row + (event.key === 'ArrowUp' ? -1 : 1)).sort((a, b) => Math.abs(a.x - led.x) - Math.abs(b.x - led.x))[0];
        if (adjacent) {
          event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-led="${adjacent.id}"]`)?.focus();
          if (event.shiftKey) onSelect?.(adjacent.id, true);
        }
        return;
      }
      if (onPress && led.keyCode && ['Enter', ' '].includes(event.key)) { event.preventDefault(); if (!event.repeat) onPress(led.keyCode); }
    }}
    onKeyUp={event => { if (onRelease && led.keyCode && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onRelease(led.keyCode); } }}
    onBlur={() => led.keyCode && onRelease?.(led.keyCode)}
  />)}</div>}</div>;
}
