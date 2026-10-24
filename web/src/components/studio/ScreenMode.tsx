'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUUpLeftIcon, MonitorIcon } from '@phosphor-icons/react';
import { renderScreen, sampleScreen, type PixelSource } from '../../../../packages/engine/src';
import { F75_LAYOUT } from '@/lib/bridges/f75/layout';
import { defaultModes } from '@/lib/studio/modes';
import { captureError, captureScreen } from '@/lib/studio/capture';
import { useModeSettings } from './useModeSettings';
import { InspectorHeading, ModeLayout, type ModePlayback } from './ModeLayout';
import { RangeField, SelectField } from './ModeControls';
import { isNative, nativeStudioInput } from '@/lib/native';

export function ScreenMode(props: ModePlayback) {
  const [store, update] = useModeSettings(), settings = store.screen;
  const pixels = useRef<PixelSource | null>(null), video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const stopCapture = useRef<() => void>(() => {}), generation = useRef(0), playback = useRef(props.playback);
  const [source, setSource] = useState<'sample' | 'capture'>('sample'), [phase, setPhase] = useState('idle'), [error, setError] = useState('');
  useEffect(() => { playback.current = props.playback; }, [props.playback]);
  useEffect(() => () => { generation.current++; stopCapture.current(); if (isNative()) void nativeStudioInput('screen', null); }, []);
  useEffect(() => {
    if (source !== 'sample') return;
    const started = performance.now();
    const draw = () => {
      if (playback.current !== 'playing') return;
      const next = sampleScreen((performance.now() - started) / 1000, settings.scene);
      pixels.current = next;
      const context = canvas.current?.getContext('2d');
      if (context) context.putImageData(new ImageData(new Uint8ClampedArray(next.data), next.width, next.height), 0, 0);
    };
    draw(); const timer = setInterval(draw, 100); return () => clearInterval(timer);
  }, [source, settings.scene]);
  const patch = (value: Partial<typeof settings>) => { if (!update('screen', value)) props.notify('Changes are kept for this session. Browser storage is unavailable.'); };
  function stop() { generation.current++; stopCapture.current(); stopCapture.current = () => {}; pixels.current = null; if (isNative()) void nativeStudioInput('screen', null); setPhase('idle'); setSource('sample'); setError(''); }
  async function start() {
    if (!video.current) return;
    stop(); const token = ++generation.current; setPhase('pending');
    try {
      const dispose = await captureScreen(video.current, next => { if (generation.current === token && playback.current === 'playing') { pixels.current = next; if (isNative()) void nativeStudioInput('screen', next); } }, () => { if (generation.current === token) { pixels.current = null; if (isNative()) void nativeStudioInput('screen', null); setPhase('idle'); setSource('sample'); setError('Screen sharing ended. The sample scene is selected.'); } });
      if (generation.current !== token) { dispose(); return; }
      stopCapture.current = dispose; setSource('capture'); setPhase('active');
    } catch (failure) { if (generation.current === token) { setPhase('idle'); setError(captureError(failure)); } }
  }
  const render = useCallback(() => renderScreen(F75_LAYOUT, pixels.current, settings), [settings]);
  return <ModeLayout {...props} mode="screen" title="Screen" detail={source === 'sample' ? 'Sample scene' : 'Shared display'} brightness={settings.brightness} render={render}
    controls={<><InspectorHeading title="Screen colors" description="Map the image colors to matching positions on your keyboard." /><SelectField label="Color mapping" value={settings.mapping} options={[{ value: 'spatial', label: 'Position on screen' }, { value: 'average', label: 'Whole-screen average' }, { value: 'edges', label: 'Screen edges' }]} onChange={value => patch({ mapping: value })} /><SelectField label="Capture area" value={settings.crop} options={[{ value: 'full', label: 'Full image' }, { value: 'center', label: 'Center region' }, { value: 'top', label: 'Upper half' }, { value: 'bottom', label: 'Lower half' }]} onChange={value => patch({ crop: value })} /><RangeField label="Saturation" value={settings.saturation} min={0} max={2} step={0.1} unit=" ×" onChange={value => patch({ saturation: value })} /><RangeField label="Exposure" value={settings.exposure} min={0.2} max={2} step={0.1} unit=" ×" onChange={value => patch({ exposure: value })} /><RangeField label="Brightness" value={settings.brightness} min={0} max={100} unit="%" onChange={value => patch({ brightness: value })} /><button type="button" className="studio-reset" onClick={() => patch(defaultModes().screen)}><ArrowUUpLeftIcon size={14} />Reset screen setup</button><p className="studio-mode-note">Screen capture starts from the share button. Frames are sampled locally and aren’t uploaded.</p></>}
  ><div className="studio-source-panel"><div className="studio-source-title"><MonitorIcon size={22} weight="light" /><div><h2>{source === 'sample' ? 'Sample scene' : 'Shared display'}</h2><p>{source === 'sample' ? 'Try the mapping with a moving color scene, or share your own display.' : 'Your keyboard follows the display selected in the share picker.'}</p></div></div><div className="studio-source-actions">{source === 'sample' && <SelectField label="Sample scene" value={settings.scene} options={[{ value: 'coast', label: 'Coast' }, { value: 'ember', label: 'Ember' }, { value: 'neon', label: 'Neon' }]} onChange={value => patch({ scene: value })} />}<button type="button" className={`studio-button ${source === 'capture' ? 'studio-button-secondary' : 'studio-button-primary'}`} disabled={phase === 'pending'} onClick={source === 'capture' ? stop : start}>{phase === 'pending' ? 'Choose a display…' : source === 'capture' ? 'Stop sharing' : 'Choose screen'}</button></div>{error && <p className="studio-inline-error" role="status">{error}</p>}</div><div className="studio-screen-source"><div className="studio-screen-image"><canvas ref={canvas} hidden={source !== 'sample'} width={96} height={54} role="img" aria-label="Sample screen colors" /><video ref={video} hidden={source !== 'capture'} muted playsInline aria-label="Shared screen" /><div className="studio-crop-guide" data-crop={settings.crop} aria-hidden="true" /></div></div><div className="studio-screen-mapping-caption"><span>{settings.mapping === 'spatial' ? 'Screen position → key position' : settings.mapping === 'edges' ? 'Screen perimeter → keyboard' : 'One average color → whole keyboard'}</span><span>{source === 'sample' ? 'Generated sample' : 'Selected display'}</span></div></ModeLayout>;
}
