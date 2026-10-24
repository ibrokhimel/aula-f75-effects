'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUUpLeftIcon, MusicNotesIcon } from '@phosphor-icons/react';
import { AUDIO_PARAMETERS, SILENCE, normalizeControls, renderAudio, sampleAudio, smoothAudio, type AudioInput } from '../../../../packages/engine/src';
import { F75_LAYOUT } from '@/lib/bridges/f75/layout';
import { AUDIO_STYLES, defaultModes } from '@/lib/studio/modes';
import { captureAudio, captureError } from '@/lib/studio/capture';
import { useModeSettings } from './useModeSettings';
import { InspectorHeading, ModeLayout, ModeTile, type ModePlayback } from './ModeLayout';
import { ParameterFields, RangeField, SelectField } from './ModeControls';
import { isNative, nativeStudioInput, nativeStudioAudioCapture, onNativeStudioAudio, onNativeStudioAudioState } from '@/lib/native';

export function AudioMode(props: ModePlayback) {
  const [store, update] = useModeSettings(), settings = store.audio;
  const sample = useRef<AudioInput>(SILENCE), stopCapture = useRef<() => void>(() => {}), generation = useRef(0);
  const current = useRef({ settings, playback: props.playback });
  useEffect(() => { current.current = { settings, playback: props.playback }; }, [settings, props.playback]);
  const [connection, setConnection] = useState({ source: '', phase: 'idle', error: '' });
  const [meter, setMeter] = useState<AudioInput>(SILENCE);
  const style = AUDIO_STYLES.find(item => item.id === settings.style)!;
  const active = connection.source === settings.source && connection.phase === 'active';
  const pending = connection.source === settings.source && connection.phase === 'pending';
  const patch = (value: Partial<typeof settings>) => { if (!update('audio', value)) props.notify('Changes are kept for this session. Browser storage is unavailable.'); };
  const disposeCapture = useCallback(() => {
    generation.current++; stopCapture.current(); stopCapture.current = () => {}; sample.current = SILENCE;
  }, []);
  useEffect(() => {
    const started = performance.now();
    const timer = setInterval(() => {
      if (current.current.playback !== 'playing') return;
      if (settings.source === 'sample') sample.current = smoothAudio(sample.current, sampleAudio((performance.now() - started) / 1000), current.current.settings.smoothing);
      setMeter(sample.current);
    }, 50);
    return () => { clearInterval(timer); disposeCapture(); };
  }, [settings.source, disposeCapture]);
  function stop() { generation.current++; stopCapture.current(); stopCapture.current = () => {}; sample.current = SILENCE; setMeter(SILENCE); setConnection({ source: settings.source, phase: 'idle', error: '' }); }
  async function start() {
    stop(); const token = ++generation.current;
    if (settings.source === 'sample') return;
    setConnection({ source: settings.source, phase: 'pending', error: '' });
    try {
      if (isNative() && settings.source === 'system') {
        const off = onNativeStudioAudio(next => { if (generation.current === token && current.current.playback === 'playing') sample.current = smoothAudio(sample.current, next, current.current.settings.smoothing); });
        const offState = onNativeStudioAudioState(state => { if (generation.current !== token) return; setConnection({ source: settings.source, phase: state.active ? 'active' : 'idle', error: state.error ?? '' }); if (!state.active) { sample.current = SILENCE; setMeter(SILENCE); } });
        stopCapture.current = () => { off(); offState(); void nativeStudioAudioCapture(false); };
        await nativeStudioAudioCapture(true);
        if (generation.current !== token) { off(); offState(); await nativeStudioAudioCapture(false); }
        return;
      }
      const dispose = await captureAudio(settings.source, next => {
        if (generation.current === token && current.current.playback === 'playing') { sample.current = smoothAudio(sample.current, next, current.current.settings.smoothing); if (isNative()) void nativeStudioInput('audio', next); }
      }, () => { if (generation.current === token) { sample.current = SILENCE; setConnection({ source: settings.source, phase: 'idle', error: 'The input was disconnected.' }); } });
      if (generation.current !== token) { dispose(); return; }
      stopCapture.current = dispose; setConnection({ source: settings.source, phase: 'active', error: '' });
    } catch (error) { if (generation.current === token) setConnection({ source: settings.source, phase: 'idle', error: captureError(error) }); }
  }
  const render = useCallback(() => renderAudio(F75_LAYOUT, sample.current, settings.style, settings.parameters, settings.gain, settings.floor), [settings]);
  const previews = useMemo(() => Object.fromEntries(AUDIO_STYLES.map(item => [item.id, (time: number) => renderAudio(F75_LAYOUT, sampleAudio(time + 0.1), item.id, {})])), []);
  return <ModeLayout {...props} mode="audio" title="Audio" detail={`${style.name} · ${settings.source === 'sample' ? 'Sample signal' : active ? settings.source === 'system' ? 'Shared audio' : 'Microphone' : 'No input connected'}`} brightness={settings.brightness} render={render}
    stageTools={<div className="studio-audio-strip" aria-label="Incoming audio levels"><div className="studio-audio-bars">{meter.spectrum.map((value, i) => <span key={i} style={{ height: `${4 + Math.min(1, value) * 30}px` }} />)}</div><span>{Math.round(Math.min(1, meter.level) * 100)}<small>% input</small></span></div>}
    controls={<><InspectorHeading title={style.name} description={style.description} /><ParameterFields schema={AUDIO_PARAMETERS[settings.style]} values={settings.parameters} onChange={values => patch({ parameters: values })} /><div className="studio-inspector-divider" /><RangeField label="Input gain" value={settings.gain} min={0.2} max={4} step={0.1} unit=" ×" onChange={value => patch({ gain: value })} /><RangeField label="Noise floor" value={settings.floor} min={0} max={0.3} step={0.01} onChange={value => patch({ floor: value })} /><RangeField label="Smoothing" value={settings.smoothing} min={0} max={0.95} step={0.05} onChange={value => patch({ smoothing: value })} /><RangeField label="Brightness" value={settings.brightness} min={0} max={100} unit="%" onChange={value => patch({ brightness: value })} /><button type="button" className="studio-reset" onClick={() => { stop(); patch(defaultModes().audio); }}><ArrowUUpLeftIcon size={14} />Reset audio setup</button></>}
  ><div className="studio-source-panel"><div className="studio-source-title"><MusicNotesIcon size={22} weight="light" /><div><h2>Audio input</h2><p>{settings.source === 'sample' ? 'A generated signal for trying effects. No sound is being recorded.' : settings.source === 'system' ? 'Choose a tab or screen, then enable audio in the share picker.' : 'Your microphone is used only after you start capture.'}</p></div></div><div className="studio-source-actions"><SelectField label="Audio input" value={settings.source} options={[{ value: 'sample', label: 'Sample signal' }, { value: 'system', label: 'Shared system / tab audio' }, { value: 'microphone', label: 'Microphone' }]} onChange={value => { stop(); patch({ source: value }); }} />{settings.source !== 'sample' && <button type="button" className={`studio-button ${active ? 'studio-button-secondary' : 'studio-button-primary'}`} disabled={pending} onClick={active ? stop : start}>{pending ? 'Choose an input…' : active ? 'Stop capture' : 'Start capture'}</button>}</div>{connection.error && <p className="studio-inline-error" role="status">{connection.error}</p>}</div><div className="studio-section-heading"><h2>Audio effects</h2><span>4 families</span></div><div className="studio-effect-grid studio-mode-grid studio-audio-grid">{AUDIO_STYLES.map(item => <ModeTile key={item.id} name={item.name} description="Audio input" selected={settings.style === item.id} preview={previews[item.id]} onPick={() => patch({ style: item.id, parameters: normalizeControls(AUDIO_PARAMETERS[item.id]) })} />)}</div></ModeLayout>;
}
