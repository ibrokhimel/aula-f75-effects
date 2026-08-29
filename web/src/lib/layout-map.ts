/**
 * Turning a captured `LED index -> KeyboardEvent.code` map into a KB_ROWS
 * literal.
 *
 * The board is a 6-row matrix and the LED index encodes the position directly
 * (index = column * 6 + row), so the grid falls out of the indices alone. Only
 * the labels and key widths need supplying, and both are derivable from the
 * event codes the mapper captured.
 */

/** KeyboardEvent.code to the label KB_ROWS uses. */
export const CODE_LABEL: Record<string, string> = {
  Escape: 'Esc', Backquote: '`', Minus: '-', Equal: '=', Backspace: 'Bksp',
  Tab: 'Tab', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  CapsLock: 'Caps', Semicolon: ';', Quote: "'", Enter: 'Enter',
  ShiftLeft: 'LShift', ShiftRight: 'RShift', Comma: ',', Period: '.', Slash: '/',
  ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt',
  MetaLeft: 'Win', MetaRight: 'Win', ContextMenu: 'App', Space: 'Space',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Insert: 'Ins', Delete: 'Del', Home: 'Home', End: 'End',
  PageUp: 'PgUp', PageDown: 'PgDn',
  PrintScreen: 'Prt', ScrollLock: 'Scr', Pause: 'Pse',
  NumLock: 'Num',
};

for (let i = 1; i <= 12; i++) CODE_LABEL[`F${i}`] = `F${i}`;
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') CODE_LABEL[`Key${c}`] = c;
for (let d = 0; d <= 9; d++) CODE_LABEL[`Digit${d}`] = String(d);

/** Standard 1u-relative widths. Anything unlisted is 1u. */
export const KEY_WIDTH: Record<string, number> = {
  Bksp: 2, Tab: 1.5, '\\': 1.5, Caps: 1.75, Enter: 2.25,
  LShift: 2.25, RShift: 2.75, Space: 6.25,
  Ctrl: 1.25, Win: 1.25, Alt: 1.25, Fn: 1.25, App: 1.25,
};

export function labelFor(code: string): string {
  return CODE_LABEL[code] ?? code.replace(/^(Key|Digit)/, '');
}

/**
 * Emit a KB_ROWS literal from the captured map. Columns are walked in order,
 * so keys land in their true physical sequence; a run of empty columns between
 * two keys becomes a numeric gap entry, which is exactly how KB_ROWS spells
 * the space between key clusters.
 */
export function generateKbRows(
  results: Record<number, string>,
  nRows = 6,
  nCols = 17,
): string {
  const lines: string[] = ['export const KB_ROWS: KeyEntry[][] = ['];

  for (let r = 0; r < nRows; r++) {
    const parts: string[] = [];
    let gap = 0;
    for (let c = 0; c < nCols; c++) {
      const idx = c * nRows + r;
      const code = results[idx];
      if (!code) { gap += 1; continue; }
      // Only emit a gap once a key follows it — trailing gaps are meaningless.
      if (gap > 0 && parts.length > 0) parts.push(String(gap));
      gap = 0;
      const label = labelFor(code);
      const width = KEY_WIDTH[label] ?? 1;
      const quoted = label === '\\' ? "'\\\\'" : label === "'" ? '"\'"' : `'${label}'`;
      parts.push(`[${quoted}, ${idx}, ${width}]`);
    }
    lines.push(`    [${parts.join(', ')}],`);
  }

  lines.push('];');
  return lines.join('\n');
}
