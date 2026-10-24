'use client';
import { useMemo, useState } from 'react';
import { ArrowCounterClockwiseIcon, ArrowRightIcon, KeyboardIcon, LockSimpleIcon } from '@phosphor-icons/react';
import { F75_LAYOUT } from '@/lib/bridges/f75/layout';
import { defaultBlob, defaultForKey, getSlot, setSlot, type Layer } from '@/lib/keybind';
import { outputToName, vkToOutput, VK_MAP } from '@/lib/vkmap';
import { writeKeybindBlob } from '@/lib/webhid';
import { KEYS } from '@/lib/studio/workspaces';
import { defaultsFor } from '@/lib/studio/catalog';
import { KeyboardSurface } from './KeyboardSurface';
import { InspectorHeading } from './ModeLayout';
import { SelectField } from './ModeControls';
import { useWorkspaceData } from './useWorkspaceData';

const outputs = [...new Map([{ page: 0, usage: 0 }, ...Object.values(VK_MAP)].map(o => [`${o.page}:${o.usage}`, o])).values()];
export function MappingWorkspace({ device, log, notify }: { device: HIDDevice | null; log: (line: string) => void; notify: (line: string) => void }) {
  const [data, update] = useWorkspaceData(), [layer, setLayer] = useState<Layer>(0), [selected, select] = useState(0), [busy, setBusy] = useState(false);
  const blob = useMemo(() => new Uint8Array(data.mappings[layer]), [data.mappings, layer]);
  const defaults = useMemo(() => defaultBlob(layer, KEYS), [layer]);
  const key = KEYS.find(k => k.index === selected) ?? KEYS[0];
  const output = getSlot(blob, key.index), outputId = `${output.page}:${output.usage}`;
  const changed = KEYS.filter(k => !k.locked && JSON.stringify(getSlot(blob, k.index)) !== JSON.stringify(getSlot(defaults, k.index)));
  const frame = useMemo(() => new Map(F75_LAYOUT.leds.map(led => [led.id, (led.id === selected ? [216, 248, 121] : changed.some(k => k.index === led.id) ? [101, 177, 197] : [22, 37, 43]) as [number, number, number]])), [selected, changed]);
  function store(next: Uint8Array) { if (!update({ mappings: data.mappings.map((b, i) => i === layer ? Array.from(next) : b) })) notify('Mapping is kept for this session. Storage is unavailable.'); }
  async function apply() {
    if (!device || busy) return;
    setBusy(true);
    try { await writeKeybindBlob(device, layer, blob, log); notify(`${layer === 0 ? 'Default' : 'Fn'} layer saved to keyboard.`); }
    catch (error) { notify(error instanceof Error ? error.message : 'Mapping could not be saved.'); }
    finally { setBusy(false); }
  }
  return <div className="studio-workspace-split" data-page="mapping"><section className="studio-workspace-scroll">
    <div className="studio-page-toolbar"><div className="studio-segments" aria-label="Mapping layer">{([0, 1] as const).map(l => <button type="button" key={l} aria-pressed={l === layer} onClick={() => setLayer(l)}>{l ? 'Fn layer' : 'Default layer'}</button>)}</div><span>{changed.length} {changed.length === 1 ? 'assignment' : 'assignments'} changed</span></div>
    <div className="studio-editor-keyboard"><KeyboardSurface settings={defaultsFor()} playback="paused" epoch={0} frameSource={() => frame} selected={[selected]} onSelect={select} label="Key mapping keyboard" /></div>
    <div className="studio-section-heading"><h2>Changed assignments</h2><span>Click a key to edit</span></div>
    {changed.length ? <div className="studio-assignment-list">{changed.map(k => <button type="button" key={k.index} onClick={() => select(k.index)} aria-pressed={selected === k.index}><kbd>{k.label}</kbd><ArrowRightIcon size={16} /><strong>{outputToName(getSlot(blob, k.index))}</strong><span>{layer ? 'Fn' : 'Default'}</span></button>)}</div> : <div className="studio-empty-editor"><KeyboardIcon size={29} weight="light" /><h2>Your original layout</h2><p>Select a key above to assign a keyboard key or media action.</p></div>}
  </section><aside className="studio-inspector"><InspectorHeading title={key.label} description={key.locked ? 'This key is reserved by the keyboard firmware.' : `Choose what this key sends on the ${layer ? 'Fn' : 'default'} layer.`} />
    {key.locked ? <p className="studio-mode-note"><LockSimpleIcon size={17} /> Firmware assignment</p> : <><SelectField label="Assignment" value={outputId} options={[...outputs.map(o => ({ value: `${o.page}:${o.usage}`, label: outputToName(o) })), ...(!outputs.some(o => `${o.page}:${o.usage}` === outputId) ? [{ value: outputId, label: outputToName(output) }] : [])]} onChange={value => { const [page, usage] = value.split(':').map(Number); const next = blob.slice(); setSlot(next, key.index, { page, usage }); store(next); }} /><button type="button" className="studio-reset" onClick={() => { const next = blob.slice(); setSlot(next, key.index, defaultForKey(layer, key, vkToOutput)); store(next); }}><ArrowCounterClockwiseIcon size={15} />Reset this key</button></>}
    <div className="studio-inspector-divider" /><p className="studio-mode-note">Edits are saved locally. Apply sends this entire layer to the keyboard’s flash memory. F1–F12 remain firmware controlled.</p>
    <button type="button" className="studio-button studio-button-primary studio-full-button" disabled={!device || busy} onClick={apply}>{busy ? 'Saving layer…' : 'Apply to keyboard'}</button>
    {!device && <p className="studio-mode-note">Connect your keyboard in Settings to apply.</p>}
    <button type="button" className="studio-reset" onClick={() => store(defaults)}><ArrowCounterClockwiseIcon size={15} />Reset this layer</button>
  </aside></div>;
}
