/** Coordinates use key units, with x/y at each LED's centre. IDs are opaque. */
export interface LayoutLed {
  id: number;
  label: string;
  keyCode?: string;
  x: number;
  y: number;
  width?: number;
  /** Logical topology, independent of the device's LED numbering. */
  row: number;
  column: number;
}

export interface KeyboardLayout {
  id: string;
  name: string;
  leds: readonly LayoutLed[];
}

export interface LedGeo { x: number; y: number; ux: number; uy: number }
export interface LedPos { row: number; col: number }

// Effects use these stable names even when a device has localized key labels.
const KEY_LABELS: Record<string, string> = {
  Escape: 'Esc', Backquote: '`', Minus: '-', Equal: '=', Backspace: 'Bksp',
  Tab: 'Tab', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  CapsLock: 'Caps', Semicolon: ';', Quote: "'", Enter: 'Enter',
  ShiftLeft: 'LShift', ShiftRight: 'RShift', Comma: ',', Period: '.', Slash: '/',
  ControlLeft: 'LCtrl', ControlRight: 'RCtrl', AltLeft: 'LAlt', AltRight: 'RAlt',
  MetaLeft: 'Win', MetaRight: 'Win', Space: 'Space', Fn: 'Fn',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Insert: 'Ins', Delete: 'Del', Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn',
};

export function createGeometry(layout: KeyboardLayout) {
  if (!layout.leds.length) throw new Error('A keyboard layout needs at least one LED');
  const ids = new Set<number>();
  const positions = new Set<string>();
  const codes = new Set<string>();
  for (const led of layout.leds) {
    if (!Number.isSafeInteger(led.id) || led.id < 0 || ids.has(led.id)) {
      throw new Error(`Invalid or duplicate LED ID: ${led.id}`);
    }
    if (![led.x, led.y, led.row, led.column, led.width ?? 1].every(Number.isFinite)
      || !Number.isInteger(led.row) || !Number.isInteger(led.column)
      || (led.width ?? 1) <= 0) throw new Error(`Invalid geometry for LED ${led.id}`);
    const position = `${led.row}:${led.column}`;
    if (positions.has(position)) throw new Error(`Duplicate layout position: ${position}`);
    if (led.keyCode && codes.has(led.keyCode)) throw new Error(`Duplicate key code: ${led.keyCode}`);
    ids.add(led.id);
    positions.add(position);
    if (led.keyCode) codes.add(led.keyCode);
  }

  const leds = [...layout.leds].sort((a, b) => a.row - b.row || a.column - b.column);
  const left = Math.min(...leds.map((led) => led.x - (led.width ?? 1) / 2));
  const top = Math.min(...leds.map((led) => led.y));
  const BOARD_W = Math.max(...leds.map((led) => led.x + (led.width ?? 1) / 2)) - left;
  const BOARD_H = Math.max(...leds.map((led) => led.y)) - top + 1;
  const rowNumbers = [...new Set(leds.map((led) => led.row))];
  const ROWS = rowNumbers.map((row) => leds.filter((led) => led.row === row).map((led) => led.id));
  const ALL_LEDS = leds.map((led) => led.id);
  const LED_BY_NAME = new Map<string, number>();
  const LED_FOR_CODE = new Map<string, number>();
  const CODE_FOR_LED = new Map<number, string>();
  const LED_GEO = new Map<number, LedGeo>();
  const LED_POS = new Map<number, LedPos>();
  const ROW_OF = new Map<number, number[]>();
  const COL_OF = new Map<number, number[]>();
  const NEIGHBOURS = new Map<number, number[]>();
  const NEIGHBOURS8 = new Map<number, number[]>();
  const at = new Map(leds.map((led) => [`${led.row}:${led.column}`, led.id]));
  for (const led of leds) {
    if (!LED_BY_NAME.has(led.label)) LED_BY_NAME.set(led.label, led.id);
    if (led.keyCode) {
      LED_FOR_CODE.set(led.keyCode, led.id);
      CODE_FOR_LED.set(led.id, led.keyCode);
      const alias = KEY_LABELS[led.keyCode] ?? led.keyCode.replace(/^(Key|Digit)/, '');
      if (!LED_BY_NAME.has(alias)) LED_BY_NAME.set(alias, led.id);
    }
    const ux = led.x - left, uy = led.y - top;
    LED_GEO.set(led.id, { ux, uy, x: ux / BOARD_W, y: uy / Math.max(BOARD_H - 1, 1) });
    const rowIndex = rowNumbers.indexOf(led.row);
    LED_POS.set(led.id, {
      row: rowIndex / Math.max(ROWS.length - 1, 1),
      col: ROWS[rowIndex].indexOf(led.id) / Math.max(ROWS[rowIndex].length - 1, 1),
    });
    ROW_OF.set(led.id, leds.filter((other) => other.row === led.row).map((other) => other.id));
    COL_OF.set(led.id, leds.filter((other) => other.column === led.column).map((other) => other.id));
    const four: number[] = [], eight: number[] = [];
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
      if (dc === 0 && dr === 0) continue;
      const neighbour = at.get(`${led.row + dr}:${led.column + dc}`);
      if (neighbour === undefined) continue;
      eight.push(neighbour);
      if (dc === 0 || dr === 0) four.push(neighbour);
    }
    NEIGHBOURS.set(led.id, four);
    NEIGHBOURS8.set(led.id, eight);
  }
  const CX = BOARD_W / 2, CY = (BOARD_H - 1) / 2;
  const LEDS_BY_X = [...ALL_LEDS].sort((a, b) => {
    const pa = LED_GEO.get(a)!, pb = LED_GEO.get(b)!;
    return pa.ux - pb.ux || pa.uy - pb.uy;
  });
  const SNAKE_PATH = ROWS.flatMap((row, i) => i % 2 === 0 ? [...row].reverse() : row);
  return {
    ALL_LEDS, ROWS, LED_BY_NAME, LED_FOR_CODE, CODE_FOR_LED, LED_GEO, LED_POS,
    BOARD_W, BOARD_H, CX, CY, BOARD_R: Math.hypot(CX, CY), LEDS_BY_X, SNAKE_PATH,
    NEIGHBOURS, NEIGHBOURS8, ROW_OF, COL_OF,
  };
}
