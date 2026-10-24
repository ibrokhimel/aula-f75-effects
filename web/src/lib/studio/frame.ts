import { rgbToHsv, type Frame, type RGB } from '../animations';
import { F75_LAYOUT } from '../bridges/f75/layout';
import type { StudioSettings } from './catalog';

function hexRgb(hex: string): RGB {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** Preserve the generator's spatial pattern and light envelope when recoloring. */
export function adjustFrame(frame: Frame, settings: StudioSettings): Frame {
  const palette = settings.palette?.map(hexRgb);
  const out: Frame = new Map();
  for (const led of F75_LAYOUT.leds) {
    const rgb = frame.get(led.id);
    if (!rgb) continue;
    let color = rgb;
    if (palette) {
      const [hue, saturation, value] = rgbToHsv(rgb);
      const n = hue * (palette.length - 1);
      const i = Math.floor(n), mix = n - i;
      const a = palette[i], b = palette[Math.min(i + 1, palette.length - 1)];
      color = a.map((channel, ch) => {
        const mapped = channel + (b[ch] - channel) * mix;
        // Bright, unsaturated highlights retain their white-hot appearance.
        return Math.round((mapped * saturation + 255 * (1 - saturation)) * value);
      }) as RGB;
    }
    out.set(led.id, color.map((channel) => Math.round(channel * settings.brightness / 100)) as RGB);
  }
  return out;
}
