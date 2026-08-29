import { describe, expect, it } from 'vitest';
import { KB_ROWS } from './protocol';
import keymap from '../data/f75-keymap.json';

/**
 * KB_ROWS is derived from the OEM's KB.ini rather than a generic 75% template.
 * These tests pin it to that source so it cannot silently drift back to a
 * layout this board does not have — which is exactly the bug that made every
 * animation compute positions on keys that do not exist.
 */
const entries = KB_ROWS.map((row) =>
  row.filter((e): e is [string, number, number] => Array.isArray(e)),
);
const flat = entries.flat();

describe('KB_ROWS vs the OEM keymap', () => {
  it('covers exactly the 80 keys the OEM declares', () => {
    const ours = new Set(flat.map(([, idx]) => idx));
    const oem = new Set(keymap.keys.map((k) => k.index));
    expect(ours.size).toBe(80);
    expect([...ours].sort((a, b) => a - b)).toEqual([...oem].sort((a, b) => a - b));
  });

  it('places every key in the row its LED index encodes (index % 6)', () => {
    entries.forEach((row, ri) => {
      for (const [label, idx] of row) {
        expect(idx % 6, `${label} (LED ${idx}) is declared in row ${ri}`).toBe(ri);
      }
    });
  });

  it('uses the OEM label for every key', () => {
    const oemLabel = new Map(keymap.keys.map((k) => [k.index, k.label]));
    for (const [label, idx] of flat) {
      expect(label, `LED ${idx}`).toBe(oemLabel.get(idx));
    }
  });

  it('orders each row left-to-right the way the OEM lays it out', () => {
    const oemX = new Map(keymap.keys.map((k) => [k.index, k.x]));
    for (const row of entries) {
      const xs = row.map(([, idx]) => oemX.get(idx)!);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
    }
  });

  it('omits the keys this board does not have', () => {
    const ours = new Set(flat.map(([, idx]) => idx));
    // Everything the old generic-75% table claimed that this board lacks:
    // columns 15 and 16 entirely, the App key, and index 84 — the row-0 slot
    // behind the rotary knob, which drives no key.
    for (const absent of [84, 90, 91, 92, 94, 95, 96, 97, 98, 101, 65]) {
      expect(ours.has(absent), `LED ${absent} should not be mapped`).toBe(false);
    }
  });

  it('describes a board 16u wide, with every full row flush', () => {
    const widths = KB_ROWS.map((row) =>
      row.reduce<number>((sum, e) => sum + (Array.isArray(e) ? e[2] : e), 0),
    );
    // Row 0 stops at F12 (14.5u) because the rotary knob is not a key. Every
    // other row must come out to exactly the same width, or the rendered board
    // and the animation geometry would be skewed.
    expect(widths[0]).toBe(14.5);
    expect(widths.slice(1)).toEqual([16, 16, 16, 16, 16]);
  });
});
