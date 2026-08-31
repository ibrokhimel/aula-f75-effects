/**
 * KeyboardEvent.code → uiohook key, for the desktop app's global hook.
 *
 * The desktop main process receives keystrokes from uiohook-napi, whose
 * keycodes are libuiohook VC_* values, not browser codes. Each entry's value
 * is either the name of the corresponding `UiohookKey` enum member (resolved
 * to its numeric keycode at runtime, so the numbers live in one place — the
 * library) or, for the few keys the enum does not name, the raw libuiohook
 * keycode.
 *
 * Lives in the web tree so the coverage test below it can assert every code
 * in LED_FOR_CODE is reachable from the hook. Pure data — no imports from
 * uiohook-napi here, or the browser build would drag in a native module.
 */

export const UIOHOOK_CODE: Record<string, string | number> = {
  Escape: 'Escape',
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
  F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',

  Backquote: 'Backquote',
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
  Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',
  Minus: 'Minus', Equal: 'Equal', Backspace: 'Backspace',

  Tab: 'Tab',
  KeyQ: 'Q', KeyW: 'W', KeyE: 'E', KeyR: 'R', KeyT: 'T', KeyY: 'Y',
  KeyU: 'U', KeyI: 'I', KeyO: 'O', KeyP: 'P',
  BracketLeft: 'BracketLeft', BracketRight: 'BracketRight', Backslash: 'Backslash',

  CapsLock: 'CapsLock',
  KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyF: 'F', KeyG: 'G', KeyH: 'H',
  KeyJ: 'J', KeyK: 'K', KeyL: 'L',
  Semicolon: 'Semicolon', Quote: 'Quote', Enter: 'Enter',

  ShiftLeft: 'Shift', ShiftRight: 'ShiftRight',
  KeyZ: 'Z', KeyX: 'X', KeyC: 'C', KeyV: 'V', KeyB: 'B', KeyN: 'N', KeyM: 'M',
  Comma: 'Comma', Period: 'Period', Slash: 'Slash',

  ControlLeft: 'Ctrl', ControlRight: 'CtrlRight',
  AltLeft: 'Alt', AltRight: 'AltRight',
  MetaLeft: 'Meta', MetaRight: 'MetaRight',
  Space: 'Space',

  ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
  Insert: 'Insert', Delete: 'Delete', Home: 'Home', End: 'End',
  PageUp: 'PageUp', PageDown: 'PageDown',

  PrintScreen: 'PrintScreen', ScrollLock: 'ScrollLock', NumLock: 'NumLock',
  // Not named by the UiohookKey enum — raw libuiohook keycodes.
  Pause: 0x0e45,        // VC_PAUSE
  ContextMenu: 0x0e5d,  // VC_CONTEXT_MENU
};

/**
 * Invert the table into keycode → KeyboardEvent.code, given the UiohookKey
 * enum object from uiohook-napi. Entries whose name the enum does not know
 * are reported in `missing` rather than silently dropped.
 */
export function buildUiohookToCode(
  uiohookKey: Record<string, number | string>,
): { map: Map<number, string>; missing: string[] } {
  const map = new Map<number, string>();
  const missing: string[] = [];
  for (const [code, ref] of Object.entries(UIOHOOK_CODE)) {
    const keycode = typeof ref === 'number' ? ref : uiohookKey[ref];
    if (typeof keycode === 'number') map.set(keycode, code);
    else missing.push(code);
  }
  return { map, missing };
}
