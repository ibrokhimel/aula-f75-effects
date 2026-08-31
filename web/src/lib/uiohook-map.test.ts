import { describe, it, expect } from 'vitest';
import { UIOHOOK_CODE, buildUiohookToCode } from './uiohook-map';
import { LED_FOR_CODE } from './reactive';

describe('uiohook-map', () => {
  it('covers every code that maps to an LED', () => {
    const missing = [...LED_FOR_CODE.keys()].filter((code) => !(code in UIOHOOK_CODE));
    expect(missing).toEqual([]);
  });

  it('inverts against a UiohookKey-shaped enum, reporting unknown names', () => {
    const fakeEnum = { Escape: 1, A: 30, Shift: 42 };
    const { map, missing } = buildUiohookToCode(fakeEnum);
    expect(map.get(1)).toBe('Escape');
    expect(map.get(30)).toBe('KeyA');
    expect(map.get(42)).toBe('ShiftLeft');
    // Raw-keycode entries resolve without the enum's help.
    expect(map.get(0x0e45)).toBe('Pause');
    // Everything name-based that the fake enum lacks is reported.
    expect(missing).toContain('KeyB');
    expect(missing).not.toContain('Pause');
  });

  it('never maps two browser codes to the same keycode', () => {
    // A full enum: give every referenced name a distinct number.
    const names = new Set(
      Object.values(UIOHOOK_CODE).filter((v): v is string => typeof v === 'string'),
    );
    const fakeEnum: Record<string, number> = {};
    let n = 10_000; // clear of the raw keycodes in the table
    for (const name of names) fakeEnum[name] = n++;
    const { map, missing } = buildUiohookToCode(fakeEnum);
    expect(missing).toEqual([]);
    expect(map.size).toBe(Object.keys(UIOHOOK_CODE).length);
  });
});
