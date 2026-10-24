'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowDownIcon, ArrowUpIcon, CopyIcon, PlusIcon, RecordIcon, StopIcon, TrashIcon } from '@phosphor-icons/react';
import { F75_LAYOUT } from '@/lib/bridges/f75/layout';
import { defaultsFor } from '@/lib/studio/catalog';
import { downloadJSON, parseMacros, readJSON, type MacroStep, type StudioMacro } from '@/lib/studio/workspaces';
import { KeyboardSurface } from './KeyboardSurface';
import { InspectorHeading } from './ModeLayout';
import { useWorkspaceData } from './useWorkspaceData';

const codes = [...new Set(F75_LAYOUT.leds.flatMap(l => l.keyCode ? [l.keyCode] : []))];
export function MacrosWorkspace({ notify }: { notify: (line: string) => void }) {
  const [data, update] = useWorkspaceData(), [selected, select] = useState<string | null>(null), [recording, setRecording] = useState(false), [playing, setPlaying] = useState(false), [lit, setLit] = useState<string[]>([]);
  const file = useRef<HTMLInputElement>(null), pad = useRef<HTMLTextAreaElement>(null), held = useRef(new Set<string>()), recorded = useRef<MacroStep[]>([]), last = useRef(0), timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const macro = data.macros.find(m => m.id === selected) ?? data.macros[0];
  const selection = useRef(macro?.id);
  useEffect(() => { selection.current = macro?.id; }, [macro?.id]);
  function save(macros: StudioMacro[]) { if (!update({ macros })) notify('Macros kept for this session. Storage is unavailable.'); }
  function patch(patch: Partial<StudioMacro>) { if (macro) save(data.macros.map(m => m.id === macro.id ? { ...m, ...patch } : m)); }
  function create(copy?: StudioMacro) {
    if (data.macros.length >= 50) { notify('Your 50 macro slots are full.'); return; }
    const m: StudioMacro = { id: crypto.randomUUID(), name: copy ? `${copy.name.slice(0, 40)} copy` : 'New macro', steps: copy ? copy.steps.map(s => ({ ...s, id: crypto.randomUUID() })) : [] };
    save([...data.macros, m]); select(m.id);
  }
  function stopPlayback() { timers.current.forEach(clearTimeout); timers.current = []; setPlaying(false); setLit([]); }
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  function finish() {
    for (const code of held.current) recorded.current.push({ id: crypto.randomUUID(), action: 'up', code, ms: 0 });
    held.current.clear(); setLit([]); setRecording(false);
    const steps = recorded.current.slice(0, 500);
    update(current => ({ macros: current.macros.map(m => m.id === selection.current ? { ...m, steps } : m) }));
  }
  function record(event: KeyboardEvent<HTMLTextAreaElement>, down: boolean) {
    if (!recording) return;
    event.preventDefault();
    if (event.code === 'Escape') { if (down) finish(); return; }
    if (event.repeat || !codes.includes(event.code) || (!down && !held.current.has(event.code))) return;
    const now = performance.now(), delay = last.current ? Math.min(10000, Math.round(now - last.current)) : 0;
    if (recorded.current.length >= 490) { finish(); notify('Recording reached the 500 step limit.'); return; }
    if (delay > 0) recorded.current.push({ id: crypto.randomUUID(), action: 'delay', code: 'KeyA', ms: delay });
    recorded.current.push({ id: crypto.randomUUID(), action: down ? 'down' : 'up', code: event.code, ms: 0 });
    last.current = now; if (down) held.current.add(event.code); else held.current.delete(event.code);
    setLit([...held.current]);
  }
  function play() {
    if (!macro || !macro.steps.length) return;
    stopPlayback(); setPlaying(true); let time = 0;
    for (const step of macro.steps) {
      if (step.action === 'delay') { time += step.ms; continue; }
      timers.current.push(setTimeout(() => setLit(current => step.action === 'down' ? [...new Set([...current, step.code])] : current.filter(c => c !== step.code)), time));
    }
    timers.current.push(setTimeout(() => { setLit([]); setPlaying(false); timers.current = []; }, time + 180));
  }
  const frame = new Map(F75_LAYOUT.leds.map(led => [led.id, (lit.includes(led.keyCode ?? '') ? [216, 248, 121] : [17, 30, 36]) as [number, number, number]]));
  const disabled = recording || playing;
  return <div className="studio-workspace-split studio-macro-workspace" data-page="macros"><section className="studio-workspace-scroll">
    <div className="studio-page-toolbar"><div className="studio-inline-actions"><select aria-label="Choose macro" className="studio-toolbar-select" disabled={disabled} value={macro?.id ?? ''} onChange={e => { select(e.target.value); stopPlayback(); }}><option value="" disabled>Select a macro</option>{data.macros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><button type="button" className="studio-icon-button" aria-label="New macro" disabled={disabled} onClick={() => create()}><PlusIcon size={18} /></button></div><button type="button" className="studio-button studio-button-secondary" disabled={disabled} onClick={() => file.current?.click()}><ArrowDownIcon size={15} />Import</button></div>
    <input hidden ref={file} type="file" accept=".json,application/json" aria-label="Import macro file" onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { const raw = await readJSON(f, 'aula-f75-macro-v1'); const parsed = parseMacros([{ ...Object(raw.macro), id: crypto.randomUUID() }])[0]; if (!parsed) throw new Error('No valid macro was found.'); if (data.macros.length >= 50) throw new Error('Your 50 macro slots are full.'); save([...data.macros, parsed]); select(parsed.id); } catch (err) { notify(err instanceof Error ? err.message : 'Macro import failed.'); } }} />
    {macro ? <><div className="studio-macro-recording"><div className="studio-section-heading"><h2>{recording ? 'Recording your keys' : 'Record a sequence'}</h2><button type="button" className={`studio-button ${recording ? 'studio-button-secondary' : 'studio-button-primary'}`} disabled={playing} onClick={() => { if (recording) { finish(); return; } recorded.current = []; held.current.clear(); last.current = 0; setRecording(true); pad.current?.focus(); }}>{recording ? <StopIcon size={15} /> : <RecordIcon size={15} />}{recording ? 'Finish recording' : macro.steps.length ? 'Record again' : 'Start recording'}</button></div><textarea ref={pad} aria-label="Macro recording pad" placeholder="Start recording, then press keys here. Escape finishes. Recording replaces this macro’s steps." readOnly onKeyDown={e => record(e, true)} onKeyUp={e => record(e, false)} onBlur={() => { if (recording) finish(); }} /></div>
      <div className="studio-macro-preview"><KeyboardSurface settings={defaultsFor()} playback="paused" frameSource={() => frame} label="Macro simulator keyboard" /></div>
      <div className="studio-section-heading"><h2>Event timeline</h2><span>{macro.steps.length} / 500 steps</span></div>
      {macro.steps.length ? <ol className="studio-macro-timeline">{macro.steps.map((step, index) => <li key={step.id}><span className="studio-step-number">{String(index + 1).padStart(2, '0')}</span><select aria-label={`Step ${index + 1} action`} value={step.action} disabled={disabled} onChange={e => patch({ steps: macro.steps.map(s => s.id === step.id ? { ...s, action: e.target.value as MacroStep['action'] } : s) })}><option value="down">Key down</option><option value="up">Key up</option><option value="delay">Delay</option></select>{step.action === 'delay' ? <label className="studio-delay-input"><input type="number" aria-label={`Step ${index + 1} delay`} min={0} max={10000} disabled={disabled} value={step.ms} onChange={e => patch({ steps: macro.steps.map(s => s.id === step.id ? { ...s, ms: Math.max(0, Math.min(10000, Number(e.target.value))) } : s) })} /><span>ms</span></label> : <select aria-label={`Step ${index + 1} key`} disabled={disabled} value={step.code} onChange={e => patch({ steps: macro.steps.map(s => s.id === step.id ? { ...s, code: e.target.value } : s) })}>{[...new Set([...codes, step.code])].map(c => <option key={c}>{c}</option>)}</select>}<div className="studio-inline-actions"><button type="button" className="studio-icon-button" aria-label={`Move step ${index + 1} up`} disabled={disabled || index === 0} onClick={() => { const steps = [...macro.steps]; [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]]; patch({ steps }); }}><ArrowUpIcon size={15} /></button><button type="button" className="studio-icon-button" aria-label={`Delete step ${index + 1}`} disabled={disabled} onClick={() => patch({ steps: macro.steps.filter(s => s.id !== step.id) })}><TrashIcon size={15} /></button></div></li>)}</ol> : <p className="studio-mode-note">Record your keys or add a step below.</p>}
      <div className="studio-file-actions"><button type="button" className="studio-button studio-button-secondary" disabled={disabled || macro.steps.length >= 500} onClick={() => patch({ steps: [...macro.steps, { id: crypto.randomUUID(), action: 'down', code: 'KeyA', ms: 100 }] })}><PlusIcon size={15} />Add key event</button><button type="button" className="studio-button studio-button-secondary" disabled={disabled || macro.steps.length >= 500} onClick={() => patch({ steps: [...macro.steps, { id: crypto.randomUUID(), action: 'delay', code: 'KeyA', ms: 100 }] })}>Add delay</button></div>
    </> : <div className="studio-empty-editor studio-empty-large"><RecordIcon size={38} weight="light" /><h2>One sequence, every step</h2><p>Record key presses and releases, adjust their timing, and test the sequence on a visual keyboard.</p><button type="button" className="studio-button studio-button-primary" onClick={() => create()}>Create your first macro</button></div>}
  </section><aside className="studio-inspector"><InspectorHeading title={macro ? 'Sequence details' : 'Macro editor'} description="Record in the focused pad. Edit individual events and delays in the timeline." />{macro && <><label className="studio-field studio-text-field">Macro name<input aria-label="Macro name" disabled={disabled} maxLength={48} value={macro.name} onChange={e => patch({ name: e.target.value })} /></label><dl className="studio-detail-list"><div><dt>Events</dt><dd>{macro.steps.filter(s => s.action !== 'delay').length}</dd></div><div><dt>Duration</dt><dd>{(macro.steps.reduce((n, s) => n + (s.action === 'delay' ? s.ms : 0), 0) / 1000).toFixed(2)} s</dd></div></dl><button type="button" className="studio-button studio-button-primary studio-full-button" disabled={recording || !macro.steps.length} onClick={playing ? stopPlayback : play}>{playing ? 'Stop simulation' : 'Test sequence'}</button><div className="studio-inspector-divider" /><div className="studio-file-actions"><button type="button" className="studio-button studio-button-secondary" disabled={disabled} onClick={() => create(macro)}><CopyIcon size={15} />Duplicate</button><button type="button" className="studio-button studio-button-secondary" disabled={disabled} onClick={() => downloadJSON('aula-macro.json', { format: 'aula-f75-macro-v1', macro })}><ArrowUpIcon size={15} />Export</button></div><button type="button" className="studio-reset" disabled={disabled} onClick={() => { save(data.macros.filter(m => m.id !== macro.id)); select(null); }}><TrashIcon size={15} />Delete macro</button></>}<p className="studio-mode-note">Macros are stored locally and tested in the visual simulator. Firmware macro upload is unavailable until its device protocol is verified.</p></aside></div>;
}
