/**
 * Global keyboard hook via uiohook-napi (WH_KEYBOARD_LL on Windows).
 *
 * Observe-only: nothing is swallowed or remapped; keystrokes reach every
 * application untouched. Keycodes are translated to KeyboardEvent.code
 * strings through the shared table so the reactive engine sees exactly what
 * the browser panel would have fed it.
 */
import { uIOhook, UiohookKey } from 'uiohook-napi';
import { buildUiohookToCode } from '../../web/src/lib/uiohook-map';
import { MOD_SHIFT, MOD_CTRL, MOD_ALT } from '../../web/src/lib/reactive';

export interface KeySink {
  down(code: string, mods: number): void;
  up(code: string): void;
}

export class KeyHook {
  ok = false;
  error: string | null = null;

  start(sink: KeySink, log: (line: string) => void): void {
    const { map, missing } = buildUiohookToCode(
      UiohookKey as unknown as Record<string, number | string>,
    );
    if (missing.length > 0) {
      log(`Key hook: no uiohook keycode for ${missing.join(', ')} — those keys will not react`);
    }

    uIOhook.on('keydown', (e) => {
      const code = map.get(e.keycode);
      if (!code) return;
      const mods = (e.shiftKey ? MOD_SHIFT : 0)
        | (e.ctrlKey || e.metaKey ? MOD_CTRL : 0)
        | (e.altKey ? MOD_ALT : 0);
      sink.down(code, mods);
    });
    uIOhook.on('keyup', (e) => {
      const code = map.get(e.keycode);
      if (code) sink.up(code);
    });

    try {
      uIOhook.start();
      this.ok = true;
      log('Global key hook active — reactive effects work in every application');
    } catch (err) {
      this.ok = false;
      this.error = err instanceof Error ? err.message : String(err);
      log(`Global key hook failed to start (${this.error}) — animations still work; reactive effects need the hook`);
    }
  }

  stop(): void {
    if (!this.ok) return;
    try { uIOhook.stop(); } catch { /* process is exiting anyway */ }
    this.ok = false;
  }
}
