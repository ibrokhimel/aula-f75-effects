'use client';

/**
 * Colour mode for the generated-effect tabs (Animations, Reactive).
 *
 * Effects bake their own palettes in, so this does not ask a generator for a
 * different colour — it recolours the frame it produced. Colorful is the
 * default and means "leave it alone": every effect already ships a palette
 * chosen for it, and overriding all of them by default would throw that away.
 */
interface Props {
  /** True: each effect keeps its own palette. False: recolour onto `color`. */
  colorful: boolean;
  /** Hex, e.g. '#ff0040'. Only meaningful while `colorful` is false. */
  color: string;
  onChangeColorful: (colorful: boolean) => void;
  onChangeColor: (hex: string) => void;
}

export function ColorControl({ colorful, color, onChangeColorful, onChangeColor }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-zinc-400">Colour:</span>
      <button
        onClick={() => onChangeColorful(true)}
        title="Every effect keeps the palette it was written with"
        className={[
          'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
          colorful
            ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600',
        ].join(' ')}
      >
        Colorful
      </button>
      {/* Touching the swatch is itself the "use a custom colour" gesture — a
          separate mode button to arm it first would only be a step to forget. */}
      <input
        type="color"
        value={color}
        onChange={(e) => { onChangeColor(e.target.value); onChangeColorful(false); }}
        onClick={() => onChangeColorful(false)}
        title={`Custom colour ${color}`}
        aria-label="Custom effect colour"
        className={[
          'w-10 h-7 rounded-md bg-zinc-800 cursor-pointer border transition-colors',
          colorful
            ? 'border-zinc-700 opacity-60 hover:opacity-100'
            : 'border-violet-500 ring-1 ring-violet-500/40',
        ].join(' ')}
      />
    </div>
  );
}
