// Local-first macro support. The wire protocol for writing macros to the
// AULA F75 is not yet documented; these helpers capture/record macros and
// serialize them for profiles, but do NOT (yet) write to the device.
export interface MacroStep { type: "key" | "delay"; keyCode: string; ms: number; }
export interface Macro { id: string; name: string; steps: MacroStep[]; }

export const MACRO_SUPPORTED = false as const;

const CODE_TO_KEYCODE: Record<string, string> = {
  KeyA: "hida", KeyB: "hidb", KeyC: "hidc", KeyD: "hidd", KeyE: "hide",
  KeyF: "hidf", KeyG: "hidg", KeyH: "hidh", KeyI: "hidi", KeyJ: "hidj",
  KeyK: "hidk", KeyL: "hidl", KeyM: "hidm", KeyN: "hidn", KeyO: "hido",
  KeyP: "hidp", KeyQ: "hidq", KeyR: "hidr", KeyS: "hids", KeyT: "hidt",
  KeyU: "hidu", KeyV: "hidv", KeyW: "hidw", KeyX: "hidx", KeyY: "hidy",
  KeyZ: "hidz", Space: "space", Enter: "enter", Tab: "tab", Backspace: "bksp",
  ShiftLeft: "lshift", ShiftRight: "rshift", ControlLeft: "lctrl",
  ControlRight: "rctrl", AltLeft: "lalt", AltRight: "ralt", MetaLeft: "lwin",
  MetaRight: "rwin", ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left",
  ArrowRight: "right", Escape: "esc", Home: "home", End: "end", Insert: "ins",
  Delete: "del", PageUp: "pgup", PageDown: "pgdn",
};

export function captureKeyPress(ev: KeyboardEvent): MacroStep {
  const keyCode = CODE_TO_KEYCODE[ev.code] ?? (ev.key.length === 1 ? `char${ev.key}` : ev.code.toLowerCase());
  return { type: "key", keyCode, ms: 0 };
}

export function macroBlob(m: Macro): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(m));
}