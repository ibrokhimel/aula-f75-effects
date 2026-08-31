import { describe, it, expect } from 'vitest';
import { ReactiveEngine, MAX_PRESSES } from './engine';
import { tintFrame } from '../animations';

/** Engine on a hand-cranked clock. */
function make() {
  const clock = { now: 0 };
  return { clock, engine: new ReactiveEngine(() => clock.now) };
}

describe('ReactiveEngine', () => {
  it('starts a known effect and rejects an unknown one', () => {
    const { engine } = make();
    expect(engine.start('nope')).toBe(false);
    expect(engine.active).toBeNull();
    expect(engine.start('fade')).toBe(true);
    expect(engine.active).toBe('fade');
    expect(engine.def?.name).toBe('Fade Out');
  });

  it('records presses only while an effect is armed and the code has an LED', () => {
    const { engine } = make();
    expect(engine.keyDown('KeyA')).toBe(false); // nothing armed
    engine.start('fade');
    expect(engine.keyDown('KeyA')).toBe(true);
    expect(engine.keyDown('NoSuchCode')).toBe(false);
    expect(engine.hits).toBe(1);
  });

  it('treats a second down without an up as a repeat', () => {
    const { engine } = make();
    engine.start('fade');
    expect(engine.keyDown('KeyA')).toBe(true);
    expect(engine.keyDown('KeyA')).toBe(false);
    engine.keyUp('KeyA');
    expect(engine.keyDown('KeyA')).toBe(true);
    expect(engine.hits).toBe(2);
  });

  it('renders a lit frame for a fresh press and clears on stop', () => {
    const { engine } = make();
    engine.start('held');
    engine.keyDown('KeyA');
    expect(engine.render().size).toBeGreaterThan(0);
    engine.stop();
    expect(engine.render().size).toBe(0);
    expect(engine.active).toBeNull();
  });

  it('tints toward a target colour when one is set', () => {
    const { engine } = make();
    engine.start('held');
    engine.keyDown('KeyA');
    // Frames are pure functions of (t, presses), so rendering twice at the
    // same instant is deterministic and the tinted frame must be exactly the
    // plain frame passed through tintFrame.
    const plain = engine.render(null);
    const tinted = engine.render([255, 0, 0]);
    expect(tinted).toEqual(tintFrame(plain, [255, 0, 0]));
    expect(tinted).not.toEqual(plain);
  });

  it('evicts released presses past the effect window but keeps held keys', () => {
    const { clock, engine } = make();
    engine.start('fade'); // default 6s window
    engine.keyDown('KeyA');
    engine.keyDown('KeyB');
    clock.now = 100;
    engine.keyUp('KeyA'); // released at t=0.1s; KeyB stays held
    clock.now = 10_000;   // 9.9s after release, far past the window
    engine.render();
    expect(engine.pressCount).toBe(1); // only the held KeyB survives
  });

  it('caps the buffer without dropping held keys', () => {
    const { clock, engine } = make();
    engine.start('patina'); // Memory family: 60s window, so nothing expires
    engine.keyDown('KeyA'); // held for the whole test
    for (let i = 0; i < MAX_PRESSES + 50; i++) {
      clock.now += 10;
      engine.keyDown('KeyB');
      engine.keyUp('KeyB');
    }
    engine.render();
    expect(engine.pressCount).toBeLessThanOrEqual(MAX_PRESSES + 1);
    expect(engine.pressCount).toBeGreaterThan(0);
  });

  it('releaseAll releases everything held', () => {
    const { clock, engine } = make();
    engine.start('fade');
    engine.keyDown('KeyA');
    engine.keyDown('KeyB');
    engine.releaseAll();
    clock.now = 10_000;
    engine.render();
    expect(engine.pressCount).toBe(0);
  });
});
