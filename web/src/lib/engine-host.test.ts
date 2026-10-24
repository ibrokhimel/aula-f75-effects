import { afterEach, describe, expect, it, vi } from 'vitest';
import { EngineHost } from '../../../desktop/src/engine-host';
import { VirtualKeyboardBridge, type KeyboardLayout } from '../../../packages/engine/src';
import { defaultStudioConfiguration } from './studio/runtime';
import { F75_LAYOUT } from './bridges/f75/layout';

const layout: KeyboardLayout = {
  id: 'host-test', name: 'Host test board',
  leds: [{ id: 500, label: 'A', keyCode: 'KeyA', x: 0.5, y: 0, row: 0, column: 0 }],
};

afterEach(() => vi.useRealTimers());

describe('desktop bridge host', () => {
  it('reports studio typing presses through status and streamed frames, including pause', async () => {
    vi.useFakeTimers();
    const bridge = new VirtualKeyboardBridge(F75_LAYOUT);
    const host = new EngineHost({ layout: F75_LAYOUT, getBridge: () => bridge, log() {}, onStateChange() {} });
    const counts: number[] = [];
    host.setFrameListener((_frame, hits) => counts.push(hits));
    try {
      await host.configureStudio({ ...defaultStudioConfiguration(), enabled: true, mode: 'typing' });
      host.keyDown('KeyA', 0); host.keyDown('KeyA', 0); host.keyUp('KeyA');
      await vi.advanceTimersByTimeAsync(100);
      expect(host.hits).toBe(1); expect(counts.at(-1)).toBe(1);
      await host.setPaused(true); host.keyDown('KeyB', 0); expect(host.hits).toBe(1);
      await host.configureStudio({ ...host.studioConfiguration!, playback: 'paused', modes: { ...host.studioConfiguration!.modes, typing: { ...host.studioConfiguration!.modes.typing, brightness: 20 } } });
      expect(counts.at(-1)).toBe(1);
      await host.setPaused(false); host.keyDown('KeyB', 0); host.keyUp('KeyB');
      await vi.advanceTimersByTimeAsync(100); expect(counts.at(-1)).toBe(2);
    } finally { await host.shutdown(); }
  });
  it('renders through the bridge, restores on pause, and re-arms on resume', async () => {
    vi.useFakeTimers();
    const bridge = new VirtualKeyboardBridge(layout);
    const host = new EngineHost({ layout, getBridge: () => bridge, log() {}, onStateChange() {} });
    try {
      await host.startReactive('held');
      host.keyDown('KeyA', 0);
      await vi.advanceTimersByTimeAsync(100);
      expect(bridge.frame.get(500)).not.toEqual([0, 0, 0]);
      await host.setPaused(true);
      expect(bridge.connected).toBe(false);
      await vi.advanceTimersByTimeAsync(100);
      expect(bridge.frame.size).toBe(0);
      await host.setPaused(false);
      expect(bridge.connected).toBe(true);
      host.keyDown('KeyA', 0);
      await vi.advanceTimersByTimeAsync(100);
      expect(bridge.frame.get(500)).not.toEqual([0, 0, 0]);
    } finally { await host.shutdown(); }
    expect(bridge.connected).toBe(false);
  });

  it('keeps the effect running while unplugged and resumes through a replacement bridge', async () => {
    vi.useFakeTimers();
    let bridge: VirtualKeyboardBridge | null = new VirtualKeyboardBridge(layout);
    const host = new EngineHost({ layout, getBridge: () => bridge, log() {}, onStateChange() {} });
    try {
      await host.startAnimation('rainbow');
      const old = bridge;
      bridge = null;
      await host.onDeviceDisconnected();
      expect(old.connected).toBe(false);
      expect(host.animation).toBe('rainbow');
      await vi.advanceTimersByTimeAsync(100);
      bridge = new VirtualKeyboardBridge(layout);
      await host.onDeviceConnected();
      await vi.advanceTimersByTimeAsync(100);
      expect(bridge.connected).toBe(true);
      expect(bridge.frame.size).toBe(1);
      await host.startReactive('does-not-exist');
      expect(host.animation).toBe('rainbow');
    } finally { await host.shutdown(); }
  });

  it('serializes rapid effect changes and never re-arms a paused session', async () => {
    vi.useFakeTimers();
    const bridge = new VirtualKeyboardBridge(layout);
    const host = new EngineHost({ layout, getBridge: () => bridge, log() {}, onStateChange() {} });
    try {
      await Promise.all([host.startAnimation('rainbow'), host.startReactive('held'), host.setPaused(true)]);
      expect(host.animation).toBeNull();
      expect(host.reactive).toBe('held');
      expect(bridge.connected).toBe(false);
      await host.onDeviceConnected();
      await host.startAnimation('rainbow');
      expect(host.paused).toBe(true);
      expect(bridge.connected).toBe(false);
      await host.setPaused(false);
      expect(bridge.connected).toBe(true);
    } finally { await host.shutdown(); }
  });
});
