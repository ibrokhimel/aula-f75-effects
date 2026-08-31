/**
 * Tray icon drawn in code — a tiny RGB keyboard — so the repo needs no
 * binary assets and the icon can never go missing from a build.
 */
import { nativeImage } from 'electron';

const SIZE = 16;

/** Key colours: one hue per column, the point of the whole app in 12 dots. */
const KEY_COLORS: [number, number, number][] = [
  [255, 64, 96], [255, 170, 40], [80, 220, 100], [90, 150, 255],
];

export function buildTrayIcon(): Electron.NativeImage {
  const buf = Buffer.alloc(SIZE * SIZE * 4); // BGRA

  const setPx = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    const i = (y * SIZE + x) * 4;
    buf[i] = b; buf[i + 1] = g; buf[i + 2] = r; buf[i + 3] = a;
  };

  // Case: a dark rounded slab.
  for (let y = 2; y <= 13; y++) {
    for (let x = 0; x <= 15; x++) {
      const corner = (x === 0 || x === 15) && (y === 2 || y === 13);
      if (!corner) setPx(x, y, 24, 24, 28, 235);
    }
  }

  // Keys: 4 columns x 3 rows of 2x2 lit dots, hue per column.
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const [r, g, b] = KEY_COLORS[(col + row) % KEY_COLORS.length];
      const x0 = 2 + col * 3 + (col >= 2 ? 1 : 0);
      const y0 = 3 + row * 4;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) setPx(x0 + dx, y0 + dy, r, g, b);
      }
    }
  }

  return nativeImage.createFromBitmap(buf, { width: SIZE, height: SIZE });
}
