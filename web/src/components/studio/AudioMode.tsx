'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUUpLeftIcon, MusicNotesIcon } from '@phosphor-icons/react';
import { AUDIO_PARAMETERS, SILENCE, createEffectLibrary, normalizeControls, renderAudio, resolveReactiveParameters, sampleAudio, smoothAudio, type AudioInput, type Frame } from '../../../../packages/engine/src';
import { F75_LAYOUT } from '@/lib/bridges/f75/layout';
import { AUDIO_STYLES, EXPANSION_AUDIO_EFFECTS, defaultModes, requirementsFor } from '@/lib/studio/modes';
import { useModeSettings } from './useModeSettings';
import { useAudioFeed } from './useAudioFeed';
import { InspectorHeading, ModeLayout, ModeTile, type ModePlayback } from './ModeLayout';
import { ParameterFields, RangeField, SelectField } from './ModeControls';

// Thumbnails only: a synthetic stereo pair and note so stereo/pitch tiles are not blank.
function previewSample(time: number): AudioInput {
  const base = sampleAudio(time + 0.1);
  return { ...base, left: base.level * (0.6 + 0.4 * Math.sin(time * 1.3)), right: base.level * (0.6 - 0.4 * Math.sin(time * 1.3)), pitch: { hz: 220 * 2 ** (Math.floor(time / 2) % 12 / 12), confidence: 0.9, pitchClass: (9 + Math.floor(time / 2)) % 12 } };
}

export function AudioMode(props: ModePlayback) {
  const [store, update] = useModeSettings(), settings = store.audio;
  const [library] = useState(() => createEffectLibrary(F75_LAYOUT));
  const [previewLibrary] = useState(() => createEffectLibrary(F75_LAYOUT));
  const sample = useRef<AudioInput>(SILENCE), sampleAt = useRef(-Infinity), smoothing = useRef(settings.smoothing);
  useEffect(() => { smoothing.current = settings.smoothing; }, [settings.smoothing]);
  const [meter, setMeter] = useState<AudioInput>(SILENCE);
  const style = AUDIO_STYLES.find(item => item.id === settings.style)!;
  const effect = EXPANSION_AUDIO_EFFECTS.find(item => item.id === settings.effect) ?? null;
  const needs = requirementsFor(effect?.id ?? null);
  const onSample = useCallback((next: AudioInput) => {
    sample.current = smoothAudio(sample.current, next, smoothing.current); sampleAt.current = performance.now();
    library.audio.pushAudioSample(next);
  }, [library]);
  const feed = useAudioFeed(settings.source, true, props.playback === 'playing', onSample);
  // A source that stopped delivering reads as silence, never as its last value.
  const live = useCallback(() => performance.now() - sampleAt.current < 500 ? sample.current : SILENCE, []);
  useEffect(() => {
    const timer = setInterval(() => { if (props.playback === 'playing') setMeter(live()); }, 50);
    return () => clearInterval(timer);
  }, [props.playback, live]);
  useEffect(() => { library.expansion.reset(settings.effect ?? undefined); }, [library, settings.effect]);
  const patch = (value: Partial<typeof settings>) => { if (!update('audio', value)) props.notify('Changes are kept for this session. Browser storage is unavailable.'); };
  const render = useCallback((time: number): Frame => settings.effect && library.reactive[settings.effect]
    ? library.reactive[settings.effect].fn(time, [], settings.parameters)
    : renderAudio(F75_LAYOUT, live(), settings.style, settings.parameters, settings.gain, settings.floor), [library, live, settings]);
  const previews = useMemo(() => Object.fromEntries([
    ...AUDIO_STYLES.map(item => [item.id, (time: number) => renderAudio(F75_LAYOUT, sampleAudio(time + 0.1), item.id, {})]),
    ...EXPANSION_AUDIO_EFFECTS.map(item => [item.id, (time: number) => { previewLibrary.audio.pushAudioSample(previewSample(time)); return previewLibrary.reactive[item.id].fn(time, []); }]),
  ]), [previewLibrary]);
  function pick(value: Partial<typeof settings>) {
    patch(value);
    // A click is the gesture browsers need before opening a capture picker.
    feed.request();
  }
  const sourceLabel = settings.source === 'sample' ? 'Sample signal' : feed.active ? settings.source === 'system' ? 'Shared audio' : 'Microphone' : 'No input connected';
  const heading = effect ?? style;
  return <ModeLayout {...props} mode="audio" title="Audio" detail={`${heading.name} · ${sourceLabel}`} brightness={settings.brightness} render={render}
    stageTools={<div className="studio-audio-strip" aria-label="Incoming audio levels"><div className="studio-audio-bars">{meter.spectrum.map((value, i) => <span key={i} style={{ height: `${4 + Math.min(1, value) * 30}px` }} />)}</div><span>{Math.round(Math.min(1, meter.level) * 100)}<small>% input</small></span></div>}
    controls={<><InspectorHeading title={heading.name} description={heading.description} />
      {needs?.stereo && <p className="studio-mode-note">Needs a stereo input. It stays dark on mono sources and the sample signal.</p>}
      {needs?.pitch && <p className="studio-mode-note">Follows the note being played. It stays dark until a clear pitch is heard.</p>}
      <ParameterFields schema={effect ? library.reactive[effect.id].parameters ?? [] : AUDIO_PARAMETERS[settings.style]} values={settings.parameters} onChange={values => patch({ parameters: values })} /><div className="studio-inspector-divider" />
      {!effect && <><RangeField label="Input gain" value={settings.gain} min={0.2} max={4} step={0.1} unit=" ×" onChange={value => patch({ gain: value })} /><RangeField label="Noise floor" value={settings.floor} min={0} max={0.3} step={0.01} onChange={value => patch({ floor: value })} /><RangeField label="Smoothing" value={settings.smoothing} min={0} max={0.95} step={0.05} onChange={value => patch({ smoothing: value })} /></>}
      <RangeField label="Brightness" value={settings.brightness} min={0} max={100} unit="%" onChange={value => patch({ brightness: value })} /><button type="button" className="studio-reset" onClick={() => { feed.stop(); patch(defaultModes().audio); }}><ArrowUUpLeftIcon size={14} />Reset audio setup</button></>}
  ><div className="studio-source-panel"><div className="studio-source-title"><MusicNotesIcon size={22} weight="light" /><div><h2>Audio input</h2><p>{settings.source === 'sample' ? 'A generated signal for trying effects. No sound is being recorded.' : settings.source === 'system' ? 'Choose a tab or screen, then enable audio in the share picker.' : 'Your microphone is used only after you start capture.'}</p></div></div><div className="studio-source-actions"><SelectField label="Audio input" value={settings.source} options={[{ value: 'sample', label: 'Sample signal' }, { value: 'system', label: 'Shared system / tab audio' }, { value: 'microphone', label: 'Microphone' }]} onChange={value => { feed.stop(); patch({ source: value }); }} />{settings.source !== 'sample' && <button type="button" className={`studio-button ${feed.active ? 'studio-button-secondary' : 'studio-button-primary'}`} disabled={feed.pending} onClick={feed.active ? feed.stop : feed.start}>{feed.pending ? 'Choose an input…' : feed.active ? 'Stop capture' : 'Start capture'}</button>}</div>{feed.error && <p className="studio-inline-error" role="status">{feed.error}</p>}</div>
    <div className="studio-section-heading"><h2>Audio effects</h2><span>{AUDIO_STYLES.length} styles</span></div><div className="studio-effect-grid studio-mode-grid studio-audio-grid">{AUDIO_STYLES.map(item => <ModeTile key={item.id} name={item.name} description="Audio input" selected={!effect && settings.style === item.id} preview={previews[item.id]} onPick={() => pick({ style: item.id, effect: null, parameters: normalizeControls(AUDIO_PARAMETERS[item.id]) })} />)}</div>
    <div className="studio-section-heading"><h2>Music and sound</h2><span>{EXPANSION_AUDIO_EFFECTS.length} effects</span></div><div className="studio-effect-grid studio-mode-grid studio-audio-grid">{EXPANSION_AUDIO_EFFECTS.map(item => { const n = requirementsFor(item.id); return <ModeTile key={item.id} name={item.name} description={n?.stereo ? 'Stereo input' : n?.pitch ? 'Pitched input' : 'Audio input'} selected={effect?.id === item.id} preview={previews[item.id]} onPick={() => pick({ effect: item.id, parameters: resolveReactiveParameters(item.id) })} />; })}</div></ModeLayout>;
}
