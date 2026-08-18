"use client";

import { useEffect, useMemo, useState } from "react";
import keymap from "../data/f75-keymap.json";
import {
  BLOB_SIZE, LAYER_BASE, LAYER_FN, defaultBlob, defaultForKey, getSlot, setSlot,
  type F75Key, type Layer,
} from "../lib/keybind";
import { vkToOutput, type Output } from "../lib/vkmap";

const LS_KEY = "aula-f75.remap";

type Blobs = Record<number, Uint8Array>;

function initialBlobs(): Blobs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const o = JSON.parse(raw) as Record<string, number[]>;
      const pick = (l: Layer) =>
        new Uint8Array(o[String(l)] ?? Array.from(defaultBlob(l, keymap.keys)));
      return { [LAYER_BASE]: pick(LAYER_BASE), [LAYER_FN]: pick(LAYER_FN) };
    }
  } catch { /* corrupt seed -> defaults */ }
  return {
    [LAYER_BASE]: defaultBlob(LAYER_BASE, keymap.keys),
    [LAYER_FN]: defaultBlob(LAYER_FN, keymap.keys),
  };
}

export function RemapPanel({ onWriteKeybind }: {
  onWriteKeybind: (layer: Layer, blob: Uint8Array) => Promise<void>;
}) {
  const [layer, setLayer] = useState<Layer>(LAYER_BASE);
  const [sel, setSel] = useState<number | null>(null);
  const [blobs, setBlobs] = useState<Blobs>(initialBlobs);
  const [status, setStatus] = useState("");

  const byIndex = useMemo(() => {
    const m: Record<number, F75Key> = {};
    for (const k of keymap.keys) m[k.index] = k;
    return m;
  }, []);

  useEffect(() => {
    const o: Record<string, number[]> = {};
    o[String(LAYER_BASE)] = Array.from(blobs[LAYER_BASE]);
    o[String(LAYER_FN)] = Array.from(blobs[LAYER_FN]);
    localStorage.setItem(LS_KEY, JSON.stringify(o));
  }, [blobs]);

  useEffect(() => {
    if (sel === null) return;
    const slot = getSlot(blobs[layer], sel);
    setStatus(`Selected ${byIndex[sel]?.label ?? sel}: ${slot.page === 0 ? "key" : "media"} 0x${slot.usage.toString(16).padStart(2, "0")}`);
  }, [sel, layer, blobs, byIndex]);

  function pick(output: Output) {
    if (sel === null || keymap.keys.find((k) => k.index === sel)?.locked) return;
    const next = new Uint8Array(blobs[layer]);
    setSlot(next, sel, output);
    setBlobs((b) => ({ ...b, [layer]: next }));
  }

  async function apply() {
    try {
      await onWriteKeybind(layer, blobs[layer]);
      setStatus(`Sent ${BLOB_SIZE}-byte ${layer === LAYER_BASE ? "Default" : "FN1"} layer`);
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function resetLayer() {
    setBlobs((b) => ({ ...b, [layer]: defaultBlob(layer, keymap.keys) }));
    setStatus(`${layer === LAYER_BASE ? "Default" : "FN1"} local default restored — press Apply`);
  }

  function resetKey() {
    if (sel === null) return;
    const k = byIndex[sel];
    if (!k || k.locked) return;
    const next = new Uint8Array(blobs[layer]);
    setSlot(next, sel, defaultForKey(layer, k, vkToOutput));
    setBlobs((b) => ({ ...b, [layer]: next }));
  }

  const geo = keymap.keys.reduce(
    (a, k) => ({
      minX: Math.min(a.minX, k.x), minY: Math.min(a.minY, k.y),
      maxX: Math.max(a.maxX, k.x + k.w), maxY: Math.max(a.maxY, k.y + k.h),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
  const vw = geo.maxX - geo.minX;
  const vh = geo.maxY - geo.minY;

  const pickerKeys = keymap.keys
    .filter((k) => !k.locked)
    .map((k) => ({ label: k.label, output: defaultForKey(LAYER_BASE, k, vkToOutput) }));

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-300">Layer</label>
        <button
          onClick={() => setLayer(LAYER_BASE)}
          className={layer === LAYER_BASE
            ? "px-3 py-1 text-sm rounded-md bg-violet-600/20 border border-violet-500/40 text-violet-300"
            : "px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-400"}
        >Default</button>
        <button
          onClick={() => setLayer(LAYER_FN)}
          className={layer === LAYER_FN
            ? "px-3 py-1 text-sm rounded-md bg-violet-600/20 border border-violet-500/40 text-violet-300"
            : "px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-400"}
        >FN1</button>
        <span className="ml-auto text-xs text-zinc-500">Click a key, then choose its output. F1–F12 are reserved by the firmware.</span>
      </div>

      <svg viewBox={`${geo.minX} ${geo.minY} ${vw} ${vh}`} className="w-full" style={{ maxHeight: 320 }}>
        {keymap.keys.map((k) => {
          const locked = !!k.locked;
          const selected = sel === k.index && !locked;
          return (
            <rect
              key={k.index} x={k.x} y={k.y} width={k.w} height={k.h} rx={4}
              fill={locked ? "#27272a" : selected ? "#7c3aed" : "#3f3f46"}
              stroke={locked ? "#333" : selected ? "#a78bfa" : "#52525b"}
              className={locked ? "" : "cursor-pointer"}
              onClick={() => { if (!locked) setSel(k.index); }}
            />
          );
        })}
        {keymap.keys.map((k) => (
          <text key={"t" + k.index} x={k.x + k.w / 2} y={k.y + k.h / 2 + 3} textAnchor="middle" fontSize={11} fill="#e4e4e7">{k.label}</text>
        ))}
      </svg>

      {sel !== null && !byIndex[sel]?.locked && (
        <div className="grid gap-2">
          <h3 className="text-sm font-medium text-zinc-300">{byIndex[sel]?.label}:</h3>
          <div className="grid grid-cols-4 gap-1 max-h-56 overflow-auto border border-zinc-800 rounded-lg p-2">
            {pickerKeys.map((pk) => (
              <button key={pk.label} className="border border-zinc-700 text-xs px-1 py-1 rounded hover:bg-zinc-700" onClick={() => pick(pk.output)}>{pk.label}</button>
            ))}
            <button className="border border-zinc-700 text-xs px-1 py-1 rounded bg-red-900/40" onClick={() => pick({ page: 0x00, usage: 0x00 })}>Disable</button>
            <button className="border border-zinc-700 text-xs px-1 py-1 rounded" onClick={resetKey}>Reset key</button>
          </div>
          <div className="flex gap-2">
            <button onClick={apply} className="bg-violet-600 px-4 py-2 text-sm rounded-lg text-white">Apply {layer === LAYER_BASE ? "Default" : "FN1"} layer</button>
            <button onClick={resetLayer} className="border border-zinc-700 px-4 py-2 text-sm rounded-lg text-zinc-300">Reset layer</button>
          </div>
        </div>
      )}
      <p className="text-xs text-zinc-500">{status}</p>
    </div>
  );
}