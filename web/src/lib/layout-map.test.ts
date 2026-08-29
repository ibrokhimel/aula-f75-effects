import { describe, it, expect } from 'vitest';
import { generateKbRows, labelFor, KEY_WIDTH } from './layout-map';

describe('labelFor', () => {
  it('maps letter, digit and named codes to KB_ROWS labels', () => {
    expect(labelFor('KeyW')).toBe('W');
    expect(labelFor('Digit4')).toBe('4');
    expect(labelFor('Escape')).toBe('Esc');
    expect(labelFor('ArrowUp')).toBe('↑');
    expect(labelFor('PageDown')).toBe('PgDn');
    expect(labelFor('Backslash')).toBe('\\');
  });

  it('falls back to a stripped code for anything unknown', () => {
    expect(labelFor('IntlYen')).toBe('IntlYen');
  });
});

describe('generateKbRows', () => {
  it('places keys at column * 6 + row and emits gaps between clusters', () => {
    // col 0 row 0, col 2 row 0 — one empty column between them.
    const out = generateKbRows({ 0: 'Escape', 12: 'F1' }, 6, 3);
    expect(out.split('\n')[1]).toBe("    [['Esc', 0, 1], 1, ['F1', 12, 1]],");
  });

  it('does not emit a leading gap before the first key of a row', () => {
    const out = generateKbRows({ 12: 'F1' }, 6, 3);
    expect(out.split('\n')[1]).toBe("    [['F1', 12, 1]],");
  });

  it('applies the known width for wide keys', () => {
    const out = generateKbRows({ 35: 'Space' }, 6, 17);
    expect(out).toContain(`['Space', 35, ${KEY_WIDTH.Space}]`);
  });

  it('quotes backslash and apostrophe so the output is valid TypeScript', () => {
    const out = generateKbRows({ 2: 'Backslash', 3: 'Quote' }, 6, 1);
    expect(out).toContain(`['\\\\', 2, ${KEY_WIDTH['\\']}]`);
    expect(out).toContain('["\'", 3, 1]');
  });

  it('round-trips a captured map back to the same indices', () => {
    const captured: Record<number, string> = {
      0: 'Escape', 1: 'Backquote', 2: 'Tab', 3: 'CapsLock', 4: 'ShiftLeft', 5: 'ControlLeft',
      7: 'Digit1', 8: 'KeyQ', 9: 'KeyA', 10: 'KeyZ', 11: 'MetaLeft',
    };
    const out = generateKbRows(captured, 6, 2);
    const indices = [...out.matchAll(/,\s*(\d+),\s*[\d.]+\]/g)].map((m) => Number(m[1]));
    expect(indices.sort((a, b) => a - b)).toEqual(
      Object.keys(captured).map(Number).sort((a, b) => a - b),
    );
  });
});
