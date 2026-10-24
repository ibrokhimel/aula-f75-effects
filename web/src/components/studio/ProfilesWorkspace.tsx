'use client';
import { useMemo, useRef, useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, CopyIcon, PlusIcon, StackIcon, TrashIcon } from '@phosphor-icons/react';
import { downloadJSON, parseSetup, readJSON, type Profile, type Setup } from '@/lib/studio/workspaces';
import { defaultsFor, LIGHTING_MODES } from '@/lib/studio/catalog';
import { StudioRuntime } from '@/lib/studio/runtime';
import { KeyboardCanvas } from './KeyboardCanvas';
import { InspectorHeading } from './ModeLayout';
import { useWorkspaceData } from './useWorkspaceData';

export function ProfilesWorkspace({ capture, apply, notify }: { capture: () => Setup; apply: (setup: Setup) => void; notify: (line: string) => void }) {
  const [data, update] = useWorkspaceData(), [selected, select] = useState<string | null>(null), [applied, setApplied] = useState<string | null>(null), [hover, setHover] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null), profile = data.profiles.find(p => p.id === selected);
  const [deleteArmed, setDeleteArmed] = useState<string | null>(null);
  const previews = useMemo(() => Object.fromEntries(data.profiles.map(p => {
    const runtime = new StudioRuntime();
    runtime.configure({ ...p.setup, enabled: true, playback: 'playing', epoch: 0, fps: 30, modes: { ...p.setup.modes, audio: { ...p.setup.modes.audio, source: 'sample' }, activity: { ...p.setup.modes.activity, source: 'sample' } } });
    let step = -1, previous = 0;
    return [p.id, (time: number) => {
      if (time < previous) runtime.configure({ ...runtime.config, epoch: runtime.config.epoch + 1 });
      previous = time;
      const next = Math.floor(time / .4);
      if (p.setup.mode === 'typing' && next !== step) { runtime.releaseAll(); runtime.keyDown(['KeyA', 'KeyF', 'KeyJ', 'KeyK'][next % 4]); step = next; }
      return runtime.render((time + .05) * 1000);
    }];
  })), [data.profiles]);
  function save(profiles: Profile[]) { if (!update({ profiles })) notify('Profiles kept for this session. Storage is unavailable.'); }
  function create(setup: Setup = capture(), name = 'New profile') {
    if (data.profiles.length >= 30) { notify('Your 30 profile slots are full.'); return; }
    const p = { id: crypto.randomUUID(), name, savedAt: new Date().toISOString(), setup: structuredClone(setup) };
    save([...data.profiles, p]); select(p.id);
  }
  function change(patch: Partial<Profile>) { if (profile) save(data.profiles.map(p => p.id === profile.id ? { ...p, ...patch } : p)); }
  return <div className="studio-workspace-split" data-page="profiles"><section className="studio-workspace-scroll">
    <div className="studio-page-toolbar"><span>{data.profiles.length} / 30 saved setups</span><div className="studio-inline-actions"><button type="button" className="studio-button studio-button-secondary" onClick={() => file.current?.click()}><ArrowDownIcon size={16} />Import</button><button type="button" className="studio-button studio-button-primary" onClick={() => create()}><PlusIcon size={16} />Save current setup</button></div></div>
    <input hidden ref={file} type="file" accept="application/json,.json" aria-label="Import profile file" onChange={async event => { const f = event.target.files?.[0]; event.target.value = ''; if (!f) return; try { const value = await readJSON(f, 'aula-f75-profile-v1'); create(parseSetup(value.setup), typeof value.name === 'string' ? value.name.slice(0, 48) : 'Imported profile'); notify('Profile imported. Select Apply profile to load it.'); } catch (e) { notify(e instanceof Error ? e.message : 'Profile could not be imported.'); } }} />
    {data.profiles.length ? <div className="studio-profile-grid">{data.profiles.map(p => <article key={p.id} className={`studio-effect-card ${p.id === selected ? 'is-selected' : ''}`}><button type="button" className="studio-effect-pick" aria-label={`Select profile ${p.name}`} aria-pressed={p.id === selected} onClick={() => { select(p.id); setDeleteArmed(null); }} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(p.id)} onBlur={() => setHover(null)}><KeyboardCanvas miniature settings={{ ...defaultsFor(), brightness: 100 }} frameSource={previews[p.id]} animate={hover === p.id} label={`${p.name} saved lighting preview`} /><span className="studio-effect-label"><strong>{p.name}</strong><span>{LIGHTING_MODES.find(m => m.id === p.setup.mode)?.label} · {p.setup.macros.length} macros{applied === p.id ? ' · Applied' : ''}</span></span></button></article>)}</div> : <div className="studio-empty-editor studio-empty-large"><StackIcon size={43} weight="light" /><h2>Keep the whole setup</h2><p>Save all seven lighting modes, both mapping layers, macros, and preferences in a profile.</p><button type="button" className="studio-button studio-button-primary" onClick={() => create(capture(), 'Daily driver')}>Save your first profile</button></div>}
  </section><aside className="studio-inspector"><InspectorHeading title={profile ? 'Profile details' : 'Your setups'} description={profile ? 'Apply a saved setup or update it with your current settings.' : 'Select a profile to rename, apply, duplicate, or export it.'} />{profile ? <>
    <label className="studio-field studio-text-field">Profile name<input aria-label="Profile name" maxLength={48} value={profile.name} onChange={e => change({ name: e.target.value })} onBlur={() => { if (!profile.name.trim()) change({ name: 'Untitled profile' }); }} /></label>
    <dl className="studio-detail-list"><div><dt>Lighting</dt><dd>{LIGHTING_MODES.find(m => m.id === profile.setup.mode)?.label}</dd></div><div><dt>Mapping</dt><dd>Default + Fn</dd></div><div><dt>Macros</dt><dd>{profile.setup.macros.length}</dd></div><div><dt>Saved</dt><dd>{Number.isNaN(Date.parse(profile.savedAt)) ? 'Imported' : new Date(profile.savedAt).toLocaleDateString()}</dd></div></dl>
    <button type="button" className="studio-button studio-button-primary studio-full-button" onClick={() => { apply(profile.setup); setApplied(profile.id); notify(`“${profile.name}” applied locally. Mapping writes remain in Key mapping.`); }}>Apply profile</button>
    <button type="button" className="studio-button studio-button-secondary studio-full-button" onClick={() => { change({ setup: structuredClone(capture()), savedAt: new Date().toISOString() }); notify('Profile updated with your current setup.'); }}>Update from current setup</button>
    <div className="studio-inspector-divider" /><div className="studio-file-actions"><button type="button" className="studio-button studio-button-secondary" onClick={() => create(profile.setup, `${profile.name.slice(0, 40)} copy`)}><CopyIcon size={15} />Duplicate</button><button type="button" className="studio-button studio-button-secondary" onClick={() => downloadJSON('aula-profile.json', { format: 'aula-f75-profile-v1', name: profile.name, setup: profile.setup })}><ArrowUpIcon size={15} />Export</button></div>
    <button type="button" className="studio-reset" onClick={() => { if (deleteArmed !== profile.id) { setDeleteArmed(profile.id); return; } save(data.profiles.filter(p => p.id !== profile.id)); select(null); setDeleteArmed(null); }}><TrashIcon size={15} />{deleteArmed === profile.id ? 'Confirm delete profile' : 'Delete profile'}</button>
  </> : <p className="studio-mode-note">Profiles stay on this computer. Export a JSON file to back up or move a setup.</p>}</aside></div>;
}
