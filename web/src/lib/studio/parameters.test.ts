import { describe, expect, it } from 'vitest';
import { ANIMATIONS, resolveAnimationParameters, tintFn, type Frame } from '../animations';
import { EffectsEngine } from '../../../../packages/engine/src';
import { F75_LAYOUT } from '../bridges/f75/layout';

const times = [0.13, 0.79, 2.37, 4.8, 8.2, 17.9, 75, 137, 650, 1630];
const serialize = (frame: Frame) => JSON.stringify([...frame].sort(([a], [b]) => a - b));
const leds = new Set(F75_LAYOUT.leds.map(led => led.id));

describe.each(Object.entries(ANIMATIONS))('%s engine parameters', (id, entry) => {
  it('gives every exposed control a visible effect and keeps extreme values valid', () => {
    expect(entry.parameters.some(parameter => parameter.id !== 'rate')).toBe(true);
    for (const parameter of entry.parameters) {
      const values = parameter.kind === 'range' ? [parameter.min, parameter.max] : parameter.options.map(option => option.value);
      let changed = false;
      for (const value of values) for (const time of times) {
        const frame = entry.fn(time, {[parameter.id]: value});
        if (serialize(frame) !== serialize(entry.fn(time))) changed = true;
        for (const [led, color] of frame) {
          if (!leds.has(led) || color.length !== 3 || color.some(channel => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
            throw new Error(`${id}.${parameter.id}=${value} at ${time}s emitted invalid RGB or LED ${led}: ${color}`);
          }
        }
      }
      expect(changed, `${id}.${parameter.id} has no visible effect`).toBe(true);
    }
  });
});

describe('engine hosts share parameter behavior', () => {
  it('applies edits at the current playback time without restarting the engine', () => {
    let now = 0;
    const engine = new EffectsEngine(F75_LAYOUT, () => now);
    expect(engine.startAnimation('campfire', {width: 8})).toBe(true);
    now = 3700;
    const before = serialize(engine.render());
    expect(engine.setAnimationParameters({width: 70})).toBe(true);
    expect(serialize(engine.render())).not.toBe(before);
    expect(serialize(engine.render())).toBe(serialize(engine.library.animations.campfire.fn(3.7, {width: 70})));
    expect(engine.animationParameters.width).toBe(70);
    const external = engine.animationParameters as Record<string, number>;
    external.width = 4;
    expect(engine.animationParameters.width).toBe(70);
  });
  it('normalizes untrusted values and forwards controls through recoloring', () => {
    expect(resolveAnimationParameters('rainbow', {direction: 3, bands: 999, bad: 4, rate: Infinity})).toEqual({direction: 1, bands: 4, rate: 1});
    const tinted = tintFn(ANIMATIONS.aurora.fn, [255, 0, 0]);
    expect(serialize(tinted(2.37, {width: 0.5}))).not.toBe(serialize(tinted(2.37, {width: 4})));
  });
  it('changes motion rate without jumping to another animation phase', () => {
    let now = 0;
    const engine = new EffectsEngine(F75_LAYOUT, () => now);
    engine.startAnimation('aurora');
    now = 3700;
    const before = serialize(engine.render());
    engine.setAnimationParameters({rate: 2});
    expect(serialize(engine.render())).toBe(before);
    now = 4700;
    expect(serialize(engine.render())).toBe(serialize(engine.library.animations.aurora.fn(5.7)));
  });
});
