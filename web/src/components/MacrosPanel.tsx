"use client";

import { useRef, useState } from "react";
import { MACRO_SUPPORTED, type Macro, type MacroStep } from "../lib/macros";
import { sendRaw } from "../lib/debug";
import type { LogFn } from "../lib/webhid";

type MacrosPanelProps = {
  device: HIDDevice | null;
  log: LogFn;
  onDumpConfig?: () => void;
  onDumpColors?: () => void;
  onCalibrate?: () => void;
  onClearLayout?: () => void;
  onProbeSelect?: () => void;
  onSnapshotDefaults?: () => void;
  onRestoreDefaults?: () => void;
};

export function MacrosPanel({ device, log, onDumpConfig, onDumpColors, onCalibrate, onClearLayout, onProbeSelect, onSnapshotDefaults, onRestoreDefaults }: MacrosPanelProps) {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<MacroStep[]>([]);
  const [macroName, setMacroName] = useState("");
  const [rawIn, setRawIn] = useState("13 04 0a 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00");
  const [rawOut, setRawOut] = useState("");
  const handlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  const timerRef = useRef<number | null>(null);

  function startRecord() {
    setSteps([]);
    setRecording(true);
    const capture = (e: KeyboardEvent) => {
      if (e.repeat) return;
      e.preventDefault();
      setSteps((s) => [...s, { type: "key", keyCode: e.code, ms: 0 }]);
    };
    handlerRef.current = capture;
    globalThis.addEventListener("keydown", capture);
    timerRef.current = window.setTimeout(stopRecord, 5000);
  }

  function stopRecord() {
    if (handlerRef.current) {
      globalThis.removeEventListener("keydown", handlerRef.current);
      handlerRef.current = null;
    }
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
    setRecording(false);
  }

  function saveMacro() {
    const n = macroName.trim() || `macro-${macros.length + 1}`;
    setMacros((m) => [...m, { id: `m${Date.now()}`, name: n, steps }]);
    setSteps([]);
    setMacroName("");
  }

  async function sendRawFrame() {
    if (!device?.opened) { setRawOut("Not connected"); return; }
    try { setRawOut(await sendRaw(device, rawIn, log)); }
    catch (e) { setRawOut(`Error: ${e instanceof Error ? e.message : String(e)}`); }
  }

  return (
    <div className="grid gap-4">
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Macros</h2>
        <p className="text-xs text-zinc-600">
          Writing macros to the keyboard is not yet possible (protocol pending) —
          {MACRO_SUPPORTED ? "supported" : " recorded macros are stored locally for now"}.
        </p>
        <div className="flex gap-2">
          <button onClick={startRecord} disabled={recording} className="px-3 py-1 text-sm rounded-md bg-red-600/20 border border-red-500/40 text-red-300 disabled:opacity-40">Record</button>
          <button onClick={stopRecord} disabled={!recording} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300 disabled:opacity-40">Stop</button>
          <input value={macroName} onChange={(e) => setMacroName(e.target.value)} placeholder="Macro name"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-zinc-300 focus:outline-none focus:border-violet-500" />
          <button onClick={saveMacro} disabled={steps.length === 0} className="px-3 py-1 text-sm rounded-md bg-violet-600/20 border border-violet-500/40 text-violet-300 disabled:opacity-40">Save macro</button>
        </div>
        {steps.length > 0 && (
          <ul className="max-h-40 overflow-auto border border-zinc-800 rounded-lg p-2 text-xs text-zinc-400">
            {steps.map((s, i) => <li key={i}>{i + 1}. {s.keyCode}</li>)}
          </ul>
        )}
        {macros.length > 0 && (
          <ul className="text-sm text-zinc-300 space-y-1">
            {macros.map((m) => <li key={m.id}>{m.name} ({m.steps.length} steps)</li>)}
          </ul>
        )}
      </section>

      <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Raw HID (debug)</h2>
        <textarea className="w-full h-14 rounded-lg bg-black border border-zinc-800 p-2 text-green-300 font-mono text-xs focus:outline-none" value={rawIn} onChange={(e) => setRawIn(e.target.value)} />
        <button onClick={sendRawFrame} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300">Send 20-byte frame</button>
        <button onClick={onDumpConfig} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300">Dump config region</button>
        <button onClick={onDumpColors} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300">Dump color table</button>
        <button onClick={onCalibrate} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300">Calibrate layout</button>
        <button onClick={onProbeSelect} className="px-3 py-1 text-sm rounded-md border border-violet-500/40 text-violet-300">Probe select (read-only)</button>
        <button onClick={onSnapshotDefaults} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300">Snapshot defaults</button>
        <button onClick={onRestoreDefaults} className="px-3 py-1 text-sm rounded-md border border-green-500/40 text-green-300">Restore defaults</button>
        <button onClick={onClearLayout} className="px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300">Clear layout map</button>
        <p className="font-mono text-xs text-zinc-500">{rawOut}</p>
      </section>
    </div>
  );
}