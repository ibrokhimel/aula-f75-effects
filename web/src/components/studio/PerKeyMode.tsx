'use client';

import { useCallback, useRef, useState } from 'react';
import { ArrowCounterClockwiseIcon, ArrowClockwiseIcon, CursorIcon, DownloadSimpleIcon, EraserIcon, PaintBrushIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { hsv, renderKeyColors, sanitizeKeyColors, zoneKeys, type KeyColors, type KeyZone } from '../../../../packages/engine/src';
import { F75_LAYOUT } from '@/lib/bridges/f75/layout';
import { defaultModes } from '@/lib/studio/modes';
import { useModeSettings } from './useModeSettings';
import { InspectorHeading, ModeLayout, type ModePlayback } from './ModeLayout';
import { RangeField } from './ModeControls';

const swatches = ['#c8ee92', '#5bd8bd', '#65bde8', '#ad8de4', '#f79f7b', '#f1dcab', '#ffffff'];
export function PerKeyMode(props: ModePlayback) {
  const [store, update] = useModeSettings(), settings = store.perKey;
  const [selected, setSelected] = useState(() => zoneKeys(F75_LAYOUT, 'wasd'));
  const [brush, setBrush] = useState('#c8ee92'), [tool, setTool] = useState<'select' | 'paint' | 'erase'>('select');
  const undo = useRef<KeyColors[]>([]), redo = useRef<KeyColors[]>([]), input = useRef<HTMLInputElement>(null);
  const [, refreshHistory] = useState(0);
  const patch = (value: Partial<typeof settings>) => { if (!update('perKey', value)) props.notify('Changes are kept for this session. Browser storage is unavailable.'); };
  function commit(colors: KeyColors) { undo.current = [...undo.current.slice(-49), settings.colors]; redo.current = []; patch({ colors }); refreshHistory(n => n + 1); }
  function paint(ids: readonly number[], erase = false) { const colors = { ...settings.colors }; for (const id of ids) { if (erase) delete colors[id]; else colors[id] = brush; } commit(colors); }
  function select(id: number, extend: boolean) {
    if (tool !== 'select') { setSelected([id]); paint([id], tool === 'erase'); return; }
    setSelected(keys => extend ? keys.includes(id) ? keys.filter(key => key !== id) : [...keys, id] : [id]);
  }
  function history(direction: 'undo' | 'redo') {
    const from = direction === 'undo' ? undo.current : redo.current, to = direction === 'undo' ? redo.current : undo.current;
    const next = from.pop(); if (!next) return;
    to.push(settings.colors); patch({ colors: next }); refreshHistory(n => n + 1);
  }
  function exportColors() {
    const blob = new Blob([JSON.stringify({ format: 'aula-f75-per-key-v1', layout: F75_LAYOUT.id, colors: settings.colors }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'aula-f75-colors.json'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importColors(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error('Choose a color file smaller than 100 KB.');
      const raw = JSON.parse(await file.text());
      if (raw.format !== 'aula-f75-per-key-v1' || raw.layout !== F75_LAYOUT.id || !raw.colors || typeof raw.colors !== 'object' || Array.isArray(raw.colors)) throw new Error('Choose an AULA F75 per-key color export.');
      const colors = sanitizeKeyColors(F75_LAYOUT, raw.colors); commit(colors); props.notify('Per-key colors imported.');
    } catch (error) { props.notify(error instanceof SyntaxError ? 'The color file is not valid JSON.' : error instanceof Error ? error.message : 'The color file could not be opened.'); }
    if (input.current) input.current.value = '';
  }
  const render = useCallback(() => renderKeyColors(F75_LAYOUT, settings.colors), [settings.colors]);
  const labels = selected.map(id => F75_LAYOUT.leds.find(led => led.id === id)?.label ?? '').filter(Boolean);
  const zones: { id: KeyZone; label: string }[] = [{ id: 'all', label: 'All keys' }, { id: 'wasd', label: 'WASD' }, { id: 'arrows', label: 'Arrows' }, { id: 'letters', label: 'Letters' }, { id: 'function', label: 'Function row' }];
  return <ModeLayout {...props} mode="per-key" title="Per-key" detail={`${Object.values(settings.colors).filter(color => color.toLowerCase() !== '#000000').length} colored keys`} brightness={settings.brightness} render={render} selected={selected} onSelect={select} staticPreview
    stageTools={<div className="studio-key-toolbar"><div className="studio-tool-buttons" role="group" aria-label="Key tools">{[{ id: 'select', label: 'Select keys', icon: CursorIcon }, { id: 'paint', label: 'Paint keys', icon: PaintBrushIcon }, { id: 'erase', label: 'Erase keys', icon: EraserIcon }].map(item => <button type="button" key={item.id} title={item.label} aria-label={item.label} aria-pressed={tool === item.id} className={`studio-icon-button ${tool === item.id ? 'is-on' : ''}`} onClick={() => setTool(item.id as typeof tool)}><item.icon size={20} /></button>)}</div><span>{selected.length} selected</span><div className="studio-tool-buttons"><button type="button" className="studio-icon-button" aria-label="Undo key colors" title="Undo" disabled={!undo.current.length} onClick={() => history('undo')}><ArrowCounterClockwiseIcon size={20} /></button><button type="button" className="studio-icon-button" aria-label="Redo key colors" title="Redo" disabled={!redo.current.length} onClick={() => history('redo')}><ArrowClockwiseIcon size={20} /></button></div></div>}
    controls={<><InspectorHeading title="Paint your layout" description="Select a key or a zone. Shift-click adds or removes keys from the selection." /><div className="studio-section-heading"><h3>Selection</h3><span>{selected.length} keys</span></div><div className="studio-key-tags">{labels.slice(0, 9).map((label, i) => <span key={i}>{label}</span>)}{labels.length > 9 && <span>+{labels.length - 9}</span>}{!labels.length && <p>Choose keys on the keyboard.</p>}</div><div className="studio-field"><label htmlFor="studio-key-color">Brush color</label><div className="studio-color-control"><input id="studio-key-color" type="color" value={brush} onChange={event => setBrush(event.target.value)} /><span>{brush.toUpperCase()}</span></div></div><div className="studio-brush-swatches">{swatches.map(color => <button type="button" key={color} style={{ background: color }} title={color} aria-label={`Choose ${color}`} aria-pressed={brush === color} onClick={() => setBrush(color)} />)}</div><button type="button" className="studio-button studio-button-primary studio-full-button" disabled={!selected.length} onClick={() => paint(selected)}>Apply to selected keys<PaintBrushIcon size={16} /></button><button type="button" className="studio-reset" disabled={!selected.length} onClick={() => paint(selected, true)}><EraserIcon size={15} />Clear selected keys</button><div className="studio-inspector-divider" /><RangeField label="Brightness" value={settings.brightness} min={0} max={100} unit="%" onChange={value => patch({ brightness: value })} /><button type="button" className="studio-text-button" onClick={() => commit(defaultModes().perKey.colors)}>Restore default colors</button></>}
  ><div className="studio-section-heading"><h2>Select a zone</h2><button type="button" className="studio-text-button" onClick={() => setSelected([])}>Deselect</button></div><div className="studio-zone-buttons">{zones.map(zone => <button type="button" key={zone.id} className="studio-button studio-button-secondary" onClick={() => { setTool('select'); setSelected(zoneKeys(F75_LAYOUT, zone.id)); }}>{zone.label}</button>)}</div><div className="studio-section-heading"><h2>Starting palettes</h2><span>Replace all key colors</span></div><div className="studio-palette-templates">{[{ id: 'coast', name: 'Coast', colors: ['#205a70', '#5bd8bd', '#bfdde2'] }, { id: 'ember', name: 'Ember', colors: ['#572c28', '#eb825d', '#f1dcab'] }, { id: 'spectrum', name: 'Spectrum', colors: ['#77d1b2', '#78a8df', '#ad8de4'] }].map(template => <button type="button" key={template.id} onClick={() => { const colors: KeyColors = {}; for (const led of F75_LAYOUT.leds) { if (template.id === 'spectrum') { const rgb = hsv(led.x / 18, 0.65, 0.8); colors[led.id] = '#' + rgb.map(value => value.toString(16).padStart(2, '0')).join(''); } else colors[led.id] = template.colors[led.row < 2 ? 0 : led.row < 4 ? 1 : 2]; } commit(colors); }}><span>{template.colors.map(color => <i key={color} style={{ background: color }} />)}</span><strong>{template.name}</strong></button>)}</div><div className="studio-file-actions"><button type="button" className="studio-button studio-button-secondary" onClick={exportColors}><DownloadSimpleIcon size={17} />Export colors</button><button type="button" className="studio-button studio-button-secondary" onClick={() => input.current?.click()}><UploadSimpleIcon size={17} />Import colors</button><input ref={input} type="file" hidden accept="application/json,.json" aria-label="Import key color file" onChange={event => void importColors(event.target.files?.[0])} /></div></ModeLayout>;
}
