import type { KeyboardLayout, LayoutLed } from '../../../../../packages/engine/src/layout';
import { KB_ROWS } from '../../protocol';
import { CODE_LABEL } from '../../layout-map';

const codesByLabel = new Map<string, string>();
for (const [code, label] of Object.entries(CODE_LABEL)) {
  if (!codesByLabel.has(label)) codesByLabel.set(label, code);
}
for (const [label, code] of Object.entries({
  LShift: 'ShiftLeft', RShift: 'ShiftRight', LCtrl: 'ControlLeft',
  RCtrl: 'ControlRight', LAlt: 'AltLeft', RAlt: 'AltRight',
})) codesByLabel.set(label, code);

const leds: LayoutLed[] = [];
for (let row = 0; row < KB_ROWS.length; row++) {
  let cursor = 0;
  for (const entry of KB_ROWS[row]) {
    if (typeof entry === 'number') { cursor += entry; continue; }
    const [label, id, width] = entry;
    leds.push({
      id, label, keyCode: codesByLabel.get(label), x: cursor + width / 2, y: row,
      width, row, column: Math.floor(id / 6),
    });
    cursor += width;
  }
}

export const F75_LAYOUT: KeyboardLayout = { id: 'aula-f75', name: 'AULA F75', leds };
