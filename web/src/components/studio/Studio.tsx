'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowSquareOutIcon, ArrowUUpLeftIcon,
  CaretDownIcon, CheckIcon, GameControllerIcon, GearSixIcon,
  ActivityIcon, CursorClickIcon, GridFourIcon, LightningIcon, MusicNotesIcon,
  KeyboardIcon, MagnifyingGlassIcon, MonitorIcon,
  PaletteIcon, PauseIcon, PencilSimpleIcon, PlayIcon, PlusIcon,
  SlidersHorizontalIcon, StackIcon,
  StarIcon, StopIcon, SunIcon, TrashIcon, XIcon,
} from '@phosphor-icons/react';
import {
  EFFECT_FAMILIES, LIGHTING_MODES, RENDERER_COUNT, defaultsFor, familyFor, filterFamilies, parametersFor, selectVariation,
  type LightingMode, type Playback, type StudioSettings,
} from '@/lib/studio/catalog';
import { type StudioPreset } from '@/lib/studio/storage';
import { KeyboardCanvas } from './KeyboardCanvas';
import { useStudioLibrary } from './useStudioLibrary';
import { LightingModes } from './LightingModes';
import { MappingWorkspace } from './MappingWorkspace';
import { MacrosWorkspace } from './MacrosWorkspace';
import { ProfilesWorkspace } from './ProfilesWorkspace';
import { GamesWorkspace } from './GamesWorkspace';
import { DeviceWorkspace } from './DeviceWorkspace';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useModeSettings, replaceModeSettings } from './useModeSettings';
import { useWorkspaceData } from './useWorkspaceData';
import { useStudioOutput } from './useStudioOutput';
import { type Setup } from '@/lib/studio/workspaces';
import { parseStudioConfiguration, withDefaultOutput } from '@/lib/studio/runtime';
import { isNative, nativeGetStudio, onNativeStatus, nativeSetStudioPreferences } from '@/lib/native';

type Workspace = 'lighting' | 'mapping' | 'macros' | 'profiles' | 'games' | 'settings' | 'advanced';
type DialogName = 'palette' | 'preset' | 'preferences' | null;

const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

const MODE_ICONS = { automatic: LightningIcon, typing: CursorClickIcon, audio: MusicNotesIcon, screen: MonitorIcon, 'per-key': GridFourIcon, layers: StackIcon, 'system-activity': ActivityIcon };
const POSTER_SETTINGS = new Map(EFFECT_FAMILIES.map(family => [family.id, defaultsFor(family.id)]));

const WORKSPACES = [
  { id: 'lighting', label: 'Lighting', icon: SunIcon },
  { id: 'mapping', label: 'Key mapping', icon: KeyboardIcon },
  { id: 'macros', label: 'Macros', icon: PlayIcon },
  { id: 'profiles', label: 'Profiles', icon: StackIcon },
  { id: 'games', label: 'Games', icon: GameControllerIcon },
] as const;

const WORKSPACE_HEADERS = {
  mapping: { title: 'Key mapping', description: 'Make the layout work for you.' },
  macros: { title: 'Macros', description: 'Record a sequence. Fine-tune every step.' },
  profiles: { title: 'Profiles', description: 'Keep a setup for every kind of day.' },
  games: { title: 'Games', description: 'Your keyboard is the playing field.' },
  settings: { title: 'Settings', description: 'Set it once. Make it yours.' },
  advanced: { title: 'Advanced', description: 'Diagnostics and key testing.' },
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} className="studio-dialog" aria-labelledby="studio-dialog-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="studio-dialog-content">
        <div className="studio-dialog-heading"><h2 id="studio-dialog-title">{title}</h2><button type="button" className="studio-icon-button" onClick={onClose} aria-label="Close dialog"><XIcon size={19} /></button></div>
        {children}
      </div>
    </dialog>
  );
}

export function Studio() {
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const [workspace, setWorkspace] = useState<Workspace>('lighting');
  const [mode, setMode] = useState<LightingMode>('automatic');
  const [settings, setSettings] = useState<StudioSettings>(() => defaultsFor());
  const [playback, setPlayback] = useState<Playback>('playing');
  const [epoch, setEpoch] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All families');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [library, updateLibrary] = useStudioLibrary();
  const [dialog, setDialog] = useState<DialogName>(null);
  const [paletteDraft, setPaletteDraft] = useState<string[]>([]);
  const [presetName, setPresetName] = useState('');
  const [activePreset, setActivePreset] = useState('daily-driver');
  const [toast, setToast] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const keyboard = useKeyboard();
  const [modes] = useModeSettings();
  const [workspaceData, updateWorkspaceData] = useWorkspaceData();
  const [output, setOutput] = useState(false), [outputChosen, setOutputChosen] = useState(false), [sessionLoaded, setSessionLoaded] = useState(false);
  const chooseOutput = useCallback((on: boolean) => { setOutput(on); setOutputChosen(true); }, []);
  useEffect(() => {
    let alive = true;
    async function restore() {
      let saved: unknown = null;
      try { saved = isNative() ? await nativeGetStudio() : JSON.parse(localStorage.getItem('aula-f75.studio.session.v1') ?? 'null'); } catch { /* Start with defaults. */ }
      if (!alive) return;
      if (saved) {
        const c = parseStudioConfiguration(saved);
        setSettings(c.automatic); setMode(c.mode); setPlayback(c.playback); setEpoch(c.epoch);
        if (isNative()) { replaceModeSettings(c.modes); setOutput(withDefaultOutput(c).enabled); setOutputChosen(c.outputChosen); }
      } else if (isNative()) setOutput(true); // The Windows app lights the keyboard unless told not to.
      setSessionLoaded(true);
    }
    void restore(); return () => { alive = false; };
  }, []);
  const fps = workspaceData.preferences.fps;
  useEffect(() => {
    if (!sessionLoaded || !isNative()) return;
    return onNativeStatus(status => {
      setOutput(status.studio?.enabled === true);
      if (status.studio) setPlayback(status.studio.playback);
    });
  }, [sessionLoaded]);
  useEffect(() => { if (sessionLoaded && isNative()) void nativeSetStudioPreferences(workspaceData.preferences); }, [sessionLoaded, workspaceData.preferences]);
  const configuration = useMemo(() => ({ automatic: settings, modes, mode, playback: mode === 'per-key' ? 'playing' as const : playback, epoch, fps, enabled: output, outputChosen }), [settings, modes, mode, playback, epoch, fps, output, outputChosen]);
  useStudioOutput(configuration, keyboard.device, sessionLoaded, setToast);
  useEffect(() => {
    if (!sessionLoaded) return;
    try { localStorage.setItem('aula-f75.studio.session.v1', JSON.stringify(configuration)); } catch { /* Edits remain available in memory. */ }
  }, [configuration, sessionLoaded]);
  const search = useRef<HTMLInputElement>(null);

  const family = familyFor(settings.familyId);
  const entries = useMemo(() => filterFamilies(query, category, favoritesOnly, library.favorites), [query, category, favoritesOnly, library.favorites]);
  const categories = ['All families', ...new Set(EFFECT_FAMILIES.map((f) => f.category))];
  const isAutomatic = workspace === 'lighting' && mode === 'automatic';
  const parameters = parametersFor(settings);
  const favorite = library.favorites.includes(family.id);
  const currentPreset = library.presets.find((preset) => preset.id === activePreset);
  const edited = JSON.stringify(settings) !== JSON.stringify(currentPreset?.settings ?? defaultsFor());

  const togglePlayback = useCallback(() => {
    if (playback === 'stopped') setEpoch((value) => value + 1);
    setPlayback(playback === 'playing' ? 'paused' : 'playing');
  }, [playback]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (dialog) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && isAutomatic) {
        event.preventDefault(); search.current?.focus(); return;
      }
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
      if (isAutomatic && event.code === 'Space') { event.preventDefault(); togglePlayback(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, isAutomatic, togglePlayback]);

  function patchSettings(patch: Partial<StudioSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function pickFamily(id: string) {
    if (id !== settings.familyId) { setSettings(defaultsFor(id)); setEpoch((n) => n + 1); }
    else if (playback === 'stopped') setEpoch((n) => n + 1);
    setPlayback('playing');
  }

  function toggleFavorite(id: string) {
    const next = library.favorites.includes(id) ? library.favorites.filter((key) => key !== id) : [...library.favorites, id];
    if (!updateLibrary({ ...library, favorites: next })) setToast('Favorite kept for this session. Browser storage is unavailable.');
  }

  function openSavePreset() {
    setPresetName(currentPreset?.name ?? `${family.name} custom`);
    setDialog('preset');
  }

  function savePreset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = presetName.trim();
    if (!name) return;
    const existing = library.presets.find((preset) => preset.name.toLowerCase() === name.toLowerCase());
    if (!existing && library.presets.length >= 30) { setToast('Your 30 preset slots are full. Remove one before adding another.'); return; }
    const preset: StudioPreset = { id: existing?.id ?? crypto.randomUUID(), name, settings: { ...settings, palette: settings.palette ? [...settings.palette] : null } };
    const persisted = updateLibrary({ ...library, presets: [...library.presets.filter((p) => p.id !== preset.id), preset] });
    setActivePreset(preset.id); setDialog(null);
    setToast(persisted ? `“${name}” saved in this browser.` : 'Preset kept for this session. Browser storage is unavailable.');
  }

  function loadPreset(id: string) {
    const preset = library.presets.find((p) => p.id === id);
    setSettings(preset ? { ...preset.settings } : defaultsFor());
    setActivePreset(preset ? id : 'daily-driver'); setEpoch((n) => n + 1); setPlayback('playing');
  }

  function captureSetup(): Setup { return structuredClone({ mode, automatic: settings, modes, mappings: workspaceData.mappings, macros: workspaceData.macros, preferences: workspaceData.preferences }); }
  function applySetup(setup: Setup) {
    setSettings(setup.automatic); setMode(setup.mode); replaceModeSettings(setup.modes);
    updateWorkspaceData({ mappings: setup.mappings, macros: setup.macros, preferences: setup.preferences });
    setEpoch(value => value + 1); setPlayback('playing');
  }

  const header = workspace === 'lighting'
    ? { title: 'Lighting', description: 'Find a rhythm for your desk.' } : WORKSPACE_HEADERS[workspace];
  const modeInfo = LIGHTING_MODES.find((item) => item.id === mode)!;

  return (
    <div className={`studio ${workspaceData.preferences.compact ? 'studio-compact' : ''}`} data-workspace={workspace} data-ready={ready && sessionLoaded} inert={!ready || !sessionLoaded} aria-busy={!ready || !sessionLoaded}>
      <a className="studio-skip" href="#studio-main">Skip to workspace</a>
      <aside className="studio-sidebar" aria-label="Application sidebar">
        <Link href="/studio" className="studio-brand" aria-label="AULA F75 studio home"><span className="studio-brand-mark"><KeyboardIcon size={25} weight="light" /></span></Link>
        <nav className="studio-navigation" aria-label="Workspaces">
          {WORKSPACES.map((item) => <button key={item.id} type="button" aria-label={item.label} title={item.label} aria-current={workspace === item.id ? 'page' : undefined} className={`studio-nav-item ${workspace === item.id ? 'is-current' : ''}`} onClick={() => setWorkspace(item.id)}><item.icon size={23} weight="light" /></button>)}
        </nav>
        <div className="studio-sidebar-bottom">
          <Link className="studio-legacy-link" href="/" title="Open the existing controller" aria-label="Open current controller"><ArrowSquareOutIcon size={20} /></Link>
          <div className="studio-nav-divider" />
          <button type="button" aria-label="Settings" title="Settings" className={`studio-nav-item ${workspace === 'settings' ? 'is-current' : ''}`} aria-current={workspace === 'settings' ? 'page' : undefined} onClick={() => setWorkspace('settings')}><GearSixIcon size={23} weight="light" /></button>
          <button type="button" aria-label="Advanced" title="Advanced" className={`studio-nav-item ${workspace === 'advanced' ? 'is-current' : ''}`} aria-current={workspace === 'advanced' ? 'page' : undefined} onClick={() => setWorkspace('advanced')}><SlidersHorizontalIcon size={23} weight="light" /></button>
        </div>
      </aside>

      <main id="studio-main" className="studio-main">
        <header className="studio-header">
          <div><h1>{header.title}</h1><p>{workspace === 'lighting' ? modeInfo.label : header.description}</p></div>
          <div className="studio-header-actions">
            {(workspace === 'lighting' && mode === 'automatic') && <div className="studio-preset-select"><label htmlFor="studio-preset" className="studio-sr-only">Lighting preset</label><select id="studio-preset" value={currentPreset ? activePreset : 'daily-driver'} onChange={(event) => loadPreset(event.target.value)}><option value="daily-driver">Daily driver{!currentPreset && edited ? ' · Edited' : ''}</option>{library.presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}{activePreset === preset.id && edited ? ' · Edited' : ''}</option>)}</select><CaretDownIcon size={14} /></div>}
            {workspace === 'lighting' && <button type="button" className={`studio-output-toggle ${output ? 'is-on' : ''}`} aria-pressed={output} disabled={!keyboard.connected && !output}
              title={output ? (keyboard.connected ? 'Lighting is playing on your keyboard. Click to stop.' : 'Lighting will play once your keyboard is connected.') : keyboard.connected ? 'Play this lighting on your keyboard' : 'Connect your keyboard to play lighting on it'}
              onClick={() => chooseOutput(!output)}><KeyboardIcon size={17} weight={output ? 'fill' : 'light'} />{output ? 'Keyboard on' : 'Keyboard off'}</button>}
            <button type="button" className="studio-icon-button studio-preferences-button" aria-label="Preview settings" onClick={() => setDialog('preferences')}><SlidersHorizontalIcon size={19} /></button>
          </div>
        </header>

        {workspace === 'lighting' && <div className="studio-mode-tabs" role="tablist" aria-label="Lighting modes">{LIGHTING_MODES.map((item, index) => <button type="button" key={item.id} id={`studio-tab-${item.id}`} role="tab" aria-label={item.label} title={item.label} tabIndex={mode === item.id ? 0 : -1} aria-selected={mode === item.id} aria-controls={item.id === 'automatic' ? 'studio-mode-panel' : 'studio-extra-panel'} className={mode === item.id ? 'is-active' : ''} onClick={() => { setMode(item.id); setPlayback('playing'); setEpoch(value => value + 1); }} onKeyDown={(event) => {
          const next = event.key === 'ArrowRight' ? (index + 1) % LIGHTING_MODES.length : event.key === 'ArrowLeft' ? (index + LIGHTING_MODES.length - 1) % LIGHTING_MODES.length : event.key === 'Home' ? 0 : event.key === 'End' ? LIGHTING_MODES.length - 1 : null;
          if (next === null) return;
          event.preventDefault(); setMode(LIGHTING_MODES[next].id); setPlayback('playing'); setEpoch(value => value + 1); document.getElementById(`studio-tab-${LIGHTING_MODES[next].id}`)?.focus();
        }}>{(() => { const Icon = MODE_ICONS[item.id]; return <Icon size={21} weight="light" />; })()}</button>)}</div>}

        <div id="studio-mode-panel" hidden={!isAutomatic} role="tabpanel" aria-labelledby="studio-tab-automatic" className="studio-lighting-layout">
          <section className="studio-library" aria-label="Automatic effect families">
            <div className="studio-preview-stage">
              <KeyboardCanvas nativePreview settings={settings} playback={playback} epoch={epoch} fps={fps} />
            </div>

            <div className="studio-library-toolbar">
              <div className="studio-search"><MagnifyingGlassIcon size={18} /><input ref={search} aria-label="Search effect families" placeholder="Search effect families" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setQuery(''); event.currentTarget.blur(); } }} />{query ? <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); search.current?.focus(); }}><XIcon size={15} /></button> : <kbd>Ctrl K</kbd>}</div>
              <div className="studio-category-select"><label htmlFor="studio-category" className="studio-sr-only">Filter by category</label><select id="studio-category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><CaretDownIcon size={13} /></div>
              <button type="button" aria-label="Favorites" className={`studio-favorites-filter ${favoritesOnly ? 'is-on' : ''}`} aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}><StarIcon size={19} weight={favoritesOnly ? 'fill' : 'regular'} /><span>Favorites</span></button>
            </div>

            <div className="studio-catalog-heading"><span>Effect library <span className="studio-catalog-count">{entries.length} / {EFFECT_FAMILIES.length}</span></span><span>Hover to preview</span></div>
            <div className="studio-catalog-scroll" tabIndex={0} role="region" aria-label="Scrollable effect library">
            {entries.length ? <div className="studio-effect-grid">{entries.map((entry) => {
              const selected = entry.id === family.id;
              const starred = library.favorites.includes(entry.id);
              return <article key={entry.id} className={`studio-effect-card ${selected ? 'is-selected' : ''}`} onMouseEnter={() => setHovered(entry.id)} onMouseLeave={() => setHovered(null)}>
                <button type="button" className="studio-effect-pick" aria-label={`Preview ${entry.name}`} aria-pressed={selected} onClick={() => pickFamily(entry.id)} onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setFocused(entry.id); }} onBlur={() => setFocused(null)}>
                  <KeyboardCanvas miniature animate={hovered === entry.id || focused === entry.id} settings={selected ? settings : POSTER_SETTINGS.get(entry.id)!} />
                  <span className="studio-effect-label"><strong>{entry.name}</strong><span>{entry.category}{entry.variations.length > 1 ? ` · ${entry.variations.length} versions` : ''}</span></span>
                  {selected && <span className="studio-selected-corner"><CheckIcon size={13} weight="bold" /></span>}
                </button>
                <button type="button" className={`studio-card-favorite ${starred ? 'is-on' : ''}`} aria-label={`${starred ? 'Remove' : 'Add'} ${entry.name} ${starred ? 'from' : 'to'} favorites`} aria-pressed={starred} onClick={() => toggleFavorite(entry.id)}><StarIcon size={18} weight={starred ? 'fill' : 'regular'} /></button>
              </article>;
            })}</div> : <div className="studio-empty-search"><MagnifyingGlassIcon size={28} weight="light" /><h2>{favoritesOnly && !query ? 'Your favorites start here' : 'No matching families'}</h2><p>{favoritesOnly && !query ? 'Star a family to keep it close.' : 'Try another name, variation, or category.'}</p><button className="studio-button studio-button-secondary" type="button" onClick={() => { setQuery(''); setCategory('All families'); setFavoritesOnly(false); }}>Show all families</button></div>}
            </div>
            <div className="studio-collection-caption"><span>{EFFECT_FAMILIES.length} families · {RENDERER_COUNT} renderers</span><span>Scroll to explore the full library</span></div>
          </section>

          <aside className="studio-inspector" aria-label="Effect controls">
            <div className="studio-inspector-title"><h2>{family.name}</h2><button type="button" className={`studio-icon-button ${favorite ? 'is-on' : ''}`} aria-label={`${favorite ? 'Remove' : 'Add'} ${family.name} ${favorite ? 'from' : 'to'} favorites`} aria-pressed={favorite} onClick={() => toggleFavorite(family.id)}><StarIcon size={22} weight={favorite ? 'fill' : 'regular'} /></button></div>
            <p className="studio-effect-description">{family.description}</p>
            <div className="studio-inspector-divider" />
            {family.variations.length > 1 && <div className="studio-field"><label htmlFor="studio-variation">Version</label><div className="studio-select"><select id="studio-variation" value={settings.variationId} onChange={(event) => { setSettings(selectVariation(settings, event.target.value)); setEpoch((n) => n + 1); }}>
              {family.variations.map((variation) => <option key={variation.id} value={variation.id}>{variation.name}</option>)}
            </select><CaretDownIcon size={14} /></div></div>}
            <div className="studio-field"><span className="studio-field-label">Palette <span className="studio-field-hint">{settings.palette ? 'Custom' : 'Original'}</span></span><div className="studio-palette-row"><div className="studio-swatches" aria-label="Current palette">{(settings.palette ?? family.palette).map((color, index) => <span key={index} style={{ backgroundColor: color }} title={color} />)}</div><button type="button" className="studio-palette-edit" onClick={() => { setPaletteDraft([...(settings.palette ?? family.palette)]); setDialog('palette'); }}><PencilSimpleIcon size={15} /><span>Edit</span></button></div></div>
            <div className="studio-inspector-divider" />
            {parameters.map(parameter => <div className="studio-field studio-slider-field" key={settings.variationId + parameter.id}>
              <label htmlFor={`studio-param-${parameter.id}`}>{parameter.label}{parameter.kind === 'range' && <output htmlFor={`studio-param-${parameter.id}`}>{settings.parameters[parameter.id]}{parameter.unit ? ` ${parameter.unit}` : ''}</output>}</label>
              {parameter.kind === 'range' ? <input id={`studio-param-${parameter.id}`} aria-label={parameter.label} type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={settings.parameters[parameter.id]} style={{ '--range-fill': `${(settings.parameters[parameter.id] - parameter.min) / (parameter.max - parameter.min) * 100}%` } as React.CSSProperties} onChange={event => patchSettings({parameters: {...settings.parameters, [parameter.id]: Number(event.target.value)}})} /> : <div className="studio-select"><select id={`studio-param-${parameter.id}`} value={settings.parameters[parameter.id]} onChange={event => patchSettings({parameters: {...settings.parameters, [parameter.id]: Number(event.target.value)}})}>{parameter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><CaretDownIcon size={14}/></div>}
            </div>)}
            <div className="studio-field studio-slider-field"><label htmlFor="studio-brightness">Brightness<output htmlFor="studio-brightness">{settings.brightness}%</output></label><input id="studio-brightness" aria-label="Brightness" aria-valuetext={`${settings.brightness}%`} type="range" min="0" max="100" value={settings.brightness} style={{ '--range-fill': `${settings.brightness}%` } as React.CSSProperties} onChange={(event) => patchSettings({ brightness: Number(event.target.value) })} /></div>
            <div className="studio-inspector-actions"><button type="button" className="studio-button studio-button-primary" onClick={openSavePreset}>Save preset<PlusIcon size={15} /></button><button type="button" className="studio-reset" onClick={() => { setSettings(selectVariation(defaultsFor(family.id), settings.variationId)); setToast('Original settings restored.'); }}><ArrowUUpLeftIcon size={14} />Reset adjustments</button></div>
          </aside>
        </div>
        {workspace === 'lighting' && mode !== 'automatic' && <LightingModes mode={mode} playback={playback} epoch={epoch} fps={fps} onToggle={togglePlayback} onStop={() => setPlayback('stopped')} notify={setToast} />}
        {workspace === 'mapping' && <MappingWorkspace device={keyboard.device} log={keyboard.log} notify={setToast} />}
        {workspace === 'macros' && <MacrosWorkspace notify={setToast} />}
        {workspace === 'profiles' && <ProfilesWorkspace capture={captureSetup} apply={applySetup} notify={setToast} />}
        {workspace === 'games' && <GamesWorkspace onStart={() => setPlayback('playing')} />}
        {(workspace === 'settings' || workspace === 'advanced') && <DeviceWorkspace key={workspace} keyboard={keyboard} advanced={workspace === 'advanced'} capture={captureSetup} notify={setToast} output={output} onOutput={chooseOutput} />}
      </main>

      {isAutomatic && <footer className="studio-transport" aria-label="Playback controls">
        <div className="studio-now-playing"><div className="studio-transport-thumbnail"><KeyboardCanvas miniature settings={settings} playback={playback === 'stopped' ? 'stopped' : 'paused'} /></div><div><strong>{family.name}</strong><span>{family.variations.find(item => item.id === settings.variationId)?.name}{playback !== 'playing' ? ` · ${playback === 'paused' ? 'Paused' : 'Stopped'}` : ''}</span></div></div>
        <div className="studio-transport-controls"><button type="button" className="studio-transport-button" aria-label={playback === 'playing' ? 'Pause preview' : 'Play preview'} title={`${playback === 'playing' ? 'Pause' : 'Play'} · Space`} onClick={togglePlayback}>{playback === 'playing' ? <PauseIcon size={19} weight="fill" /> : <PlayIcon size={19} weight="fill" />}</button><button type="button" className="studio-transport-button" aria-label="Stop preview" title="Stop preview" disabled={playback === 'stopped'} onClick={() => setPlayback('stopped')}><StopIcon size={17} weight="fill" /></button></div>
      </footer>}

      {toast && <div className="studio-toast" role="status"><CheckIcon size={17} /><span>{toast}</span><button type="button" aria-label="Dismiss message" onClick={() => setToast(null)}><XIcon size={15} /></button></div>}

      {dialog === 'palette' && <Modal title="Edit palette" onClose={() => setDialog(null)}><p className="studio-dialog-description">Keep the motion. Make the colors yours.</p><div className="studio-palette-editor">{paletteDraft.map((color, index) => <label key={index}><span>Color {index + 1}</span><input aria-label={`Palette color ${index + 1}`} type="color" value={color} onChange={(event) => setPaletteDraft((colors) => colors.map((c, i) => i === index ? event.target.value : c))} /><span className="studio-color-hex">{color.toUpperCase()}</span></label>)}</div><div className="studio-dialog-actions"><button type="button" className="studio-button studio-button-secondary" onClick={() => { patchSettings({ palette: null }); setDialog(null); }}>Use original</button><button type="button" className="studio-button studio-button-primary" onClick={() => { patchSettings({ palette: [...paletteDraft] }); setDialog(null); }}>Apply palette</button></div></Modal>}

      {dialog === 'preset' && <Modal title="Save lighting preset" onClose={() => setDialog(null)}><form onSubmit={savePreset}><p className="studio-dialog-description">Your effect, colors, and adjustments, saved together in this browser.</p><label className="studio-preset-name" htmlFor="studio-preset-name">Preset name<input id="studio-preset-name" autoFocus required maxLength={48} value={presetName} onChange={(event) => setPresetName(event.target.value)} /></label><div className="studio-preset-summary"><PaletteIcon size={22} weight="light" /><div><strong>{family.name}</strong><span>{family.variations.find((variation) => variation.id === settings.variationId)?.name} · {settings.brightness}% brightness</span></div></div><div className="studio-dialog-actions"><button type="button" className="studio-button studio-button-secondary" onClick={() => setDialog(null)}>Cancel</button><button type="submit" className="studio-button studio-button-primary" disabled={!presetName.trim()}>Save preset</button></div></form></Modal>}

      {dialog === 'preferences' && <Modal title="Preview settings" onClose={() => setDialog(null)}><p className="studio-dialog-description">This studio runs locally in your browser. It isn’t connected to your keyboard.</p><div className="studio-preference-row"><label htmlFor="studio-fps">Animation quality<span>Choose how often the preview updates.</span></label><div className="studio-select"><select id="studio-fps" value={fps} onChange={(event) => updateWorkspaceData({ preferences: { ...workspaceData.preferences, fps: Number(event.target.value) } })}><option value={30}>Balanced · 30 fps</option><option value={60}>Smooth · 60 fps</option></select><CaretDownIcon size={14} /></div></div><div className="studio-shortcuts"><h3>Keyboard shortcuts</h3><div><span>Play or pause preview</span><kbd>Space</kbd></div><div><span>Search effect families</span><kbd>Ctrl K</kbd></div><div><span>Close a dialog</span><kbd>Esc</kbd></div></div>{currentPreset && <button type="button" className="studio-delete-preset" onClick={() => { const persisted = updateLibrary({ ...library, presets: library.presets.filter((p) => p.id !== currentPreset.id) }); setActivePreset('daily-driver'); setDialog(null); setToast(persisted ? 'Saved preset removed. Your current preview is unchanged.' : 'Preset removed for this session. Browser storage is unavailable.'); }}><TrashIcon size={16} />Remove “{currentPreset.name}” preset</button>}<div className="studio-dialog-actions"><button type="button" className="studio-button studio-button-primary" onClick={() => setDialog(null)}>Done<CheckIcon size={16} /></button></div></Modal>}
    </div>
  );
}
