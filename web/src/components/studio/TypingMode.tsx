'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUUpLeftIcon, PlayIcon } from '@phosphor-icons/react';
import { ReactiveEngine } from '../../../../packages/engine/src/reactive/engine';
import { createEffectLibrary, hexColor, resolveReactiveParameters, sampleAudio, type Frame } from '../../../../packages/engine/src';
import { F75_LAYOUT } from '@/lib/bridges/f75/layout';
import { TYPING_FAMILIES, TYPING_GROUPS, defaultModes, requirementsFor, type TypingFamily } from '@/lib/studio/modes';
import { useModeSettings } from './useModeSettings';
import { useAudioFeed } from './useAudioFeed';
import { ModeLayout, ModeTile, InspectorHeading, type ModePlayback } from './ModeLayout';
import { ParameterFields, RangeField, SelectField } from './ModeControls';
import { isNative, nativeStudioKey, watchNativeFrames } from '@/lib/native';

function demoFrame(library: ReturnType<typeof createEffectLibrary>, effect: string, time: number, parameters?: Record<string, number>): Frame {
  const codes = ['KeyF', 'KeyJ', 'KeyD', 'KeyK', 'KeyS', 'KeyL', 'KeyA'];
  const presses = codes.map((code, i) => {
    const age = (time + i * 0.23) % 2.4;
    const led = library.reactiveCore.LED_FOR_CODE.get(code)!;
    const press = library.reactiveCore.makePress(led, time - age, i, code, 0);
    press.release = age > 0.7 ? time - age + 0.7 : null;
    return press;
  });
  return library.reactive[effect].fn(time, presses, parameters);
}

function inputLabel(family: TypingFamily): string {
  if (family.variants.length > 1) return `${family.variants.length} versions`;
  const needs = requirementsFor(family.variants[0]);
  return needs?.audio ? 'Typing + audio' : needs && !needs.typing && needs.hostEvents.length ? 'App events' : 'Keyboard input';
}

export function TypingMode(props: ModePlayback) {
  const [store, update] = useModeSettings(), settings = store.typing;
  const [library] = useState(() => createEffectLibrary(F75_LAYOUT));
  // Thumbnails run on their own library so a hovered tile never seeks the stage's stateful renderer.
  const [previewLibrary] = useState(() => createEffectLibrary(F75_LAYOUT));
  const clock = useRef(0);
  const [engine] = useState(() => new ReactiveEngine(library.reactiveCore, library.reactive, () => clock.current * 1000));
  const [demo, setDemo] = useState(false), [hits, setHits] = useState(0), [query, setQuery] = useState('');
  const demoStarted = useRef(0), demoAt = useRef(-1);
  const family = TYPING_FAMILIES.find(item => item.id === settings.family)!;
  const needs = requirementsFor(settings.effect), source = store.audio.source;
  const feed = useAudioFeed(source, needs?.audio === true, props.playback === 'playing', useCallback(sample => library.audio.pushAudioSample(sample), [library]));
  const definition = library.reactive[settings.effect];
  const params = settings.parameters;
  useEffect(() => { engine.start(settings.effect); library.expansion.reset(settings.effect); }, [engine, library, settings.effect]);
  useEffect(() => { engine.setParameters(params); }, [engine, params, settings.effect]);
  useEffect(() => {
    if (!isNative()) return;
    return watchNativeFrames((_frame, count) => setHits(count));
  }, []);
  useEffect(() => {
    if (!demo || isNative()) return;
    const timer = setInterval(() => {
      setHits(engine.hits);
      if (clock.current - demoStarted.current > 6.5) { engine.releaseAll(); setDemo(false); }
    }, 100);
    return () => clearInterval(timer);
  }, [demo, engine]);
  useEffect(() => {
    if (!demo || !isNative()) return;
    const codes = ['KeyF', 'KeyJ', 'KeyD', 'KeyK', 'KeyS', 'KeyL', 'KeyA'];
    let step = 0, held: string | null = null;
    const timer = setInterval(() => {
      if (props.playback !== 'playing') return;
      if (held) void nativeStudioKey(held, false);
      if (step >= 28) { held = null; setDemo(false); return; }
      held = codes[step % codes.length]; void nativeStudioKey(held, true); step++;
    }, 220);
    return () => { clearInterval(timer); if (held) void nativeStudioKey(held, false); };
  }, [demo, props.playback]);
  useEffect(() => {
    const release = () => engine.releaseAll();
    window.addEventListener('blur', release);
    const visibility = () => { if (document.visibilityState !== 'visible') release(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { engine.releaseAll(); window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', visibility); };
  }, [engine]);
  const patch = (value: Partial<typeof settings>) => { if (!update('typing', value)) props.notify('Changes are kept for this session. Browser storage is unavailable.'); };
  const down = useCallback((code: string) => { if (props.playback === 'playing' && engine.keyDown(code)) { setHits(engine.hits); if (isNative()) void nativeStudioKey(code, true); } }, [engine, props.playback]);
  const up = useCallback((code: string) => { engine.keyUp(code); if (isNative()) void nativeStudioKey(code, false); }, [engine]);
  const render = useCallback((time: number) => {
    clock.current = time;
    if (demo) {
      const step = Math.floor((time - demoStarted.current) / 0.22);
      if (step !== demoAt.current) {
        engine.releaseAll(); demoAt.current = step;
        if (step >= 0 && step < 28) engine.keyDown(['KeyF', 'KeyJ', 'KeyD', 'KeyK', 'KeyS', 'KeyL', 'KeyA'][step % 7]);
      }
    }
    return engine.render(settings.color ? hexColor(settings.color) : null);
  }, [engine, demo, settings.color]);
  const previews = useMemo(() => Object.fromEntries(TYPING_FAMILIES.map(item => [item.id, (time: number) => {
    if (requirementsFor(item.variants[0])?.audio) previewLibrary.audio.pushAudioSample(sampleAudio(time));
    return demoFrame(previewLibrary, item.variants[0], time);
  }])), [previewLibrary]);
  const entries = TYPING_FAMILIES.filter(item => `${item.name} ${item.description} ${item.group}`.toLowerCase().includes(query.toLowerCase()));
  function choose(effect: string, familyId = family.id) {
    engine.releaseAll(); patch({ family: familyId, effect, parameters: resolveReactiveParameters(effect) }); setDemo(false); setHits(0);
    // Selecting a scene with an audio layer is the click browsers need to open capture.
    if (requirementsFor(effect)?.audio) feed.request();
  }
  const sourceName = source === 'sample' ? 'Sample signal' : source === 'system' ? 'Shared system / tab audio' : 'Microphone';
  return <ModeLayout {...props} mode="typing" title="Typing" detail={definition.name} brightness={settings.brightness} render={render} onPress={down} onRelease={up}
    stageTools={<div className="studio-typing-pad"><div className="studio-section-heading"><label htmlFor="studio-type-test">Try it here</label><span>{hits} key presses</span></div><div className="studio-typing-input-row"><textarea id="studio-type-test" aria-label="Typing test pad" placeholder="Type a few words. Hold a key. Try a chord." rows={2} onKeyDown={event => { if (!event.repeat && !event.nativeEvent.isComposing) down(event.code); }} onKeyUp={event => up(event.code)} onBlur={() => engine.releaseAll()} /><button type="button" className="studio-button studio-button-secondary" aria-label="Run typing demo" onClick={() => { engine.start(settings.effect, params); demoStarted.current = clock.current; demoAt.current = -1; setDemo(true); }}><PlayIcon size={15} />Try sequence</button></div></div>}
    controls={<><InspectorHeading title={family.name} description={family.description} />{family.variants.length > 1 && <SelectField label="Version" value={settings.effect} options={family.variants.map(id => ({ value: id, label: library.reactive[id].name }))} onChange={value => choose(value)} />}<ParameterFields schema={definition.parameters ?? []} values={params} onChange={values => patch({ parameters: values })} />{needs?.audio && <div className="studio-field"><label>Audio input</label><p className="studio-mode-note">{source === 'sample' ? 'This scene also listens to sound. It uses the sample signal chosen in Audio.' : feed.active ? `Listening to ${sourceName.toLowerCase()}.` : `This scene also listens to sound from ${sourceName.toLowerCase()}. Change the input in Audio.`}</p>{source !== 'sample' && <button type="button" className={`studio-button ${feed.active ? 'studio-button-secondary' : 'studio-button-primary'}`} disabled={feed.pending} onClick={feed.active ? feed.stop : feed.start}>{feed.pending ? 'Choose an input…' : feed.active ? 'Stop capture' : 'Start capture'}</button>}{feed.error && <p className="studio-inline-error" role="status">{feed.error}</p>}</div>}{needs && needs.hostEvents.length > 0 && <p className="studio-mode-note">{needs.typing ? 'Also reacts to shortcut events sent by connected tools.' : 'Lights up when a connected tool sends an event to the Windows app, such as a build finishing. It stays dark until then.'}</p>}<div className="studio-field"><label htmlFor="typing-color">Color</label><div className="studio-color-control"><input id="typing-color" type="color" value={settings.color ?? '#9adeca'} onChange={event => patch({ color: event.target.value })} /><button type="button" className="studio-text-button" onClick={() => patch({ color: null })}>{settings.color ? 'Use effect colors' : 'Effect colors'}</button></div></div><RangeField label="Brightness" value={settings.brightness} min={0} max={100} unit="%" onChange={value => patch({ brightness: value })} /><button type="button" className="studio-reset" onClick={() => { engine.releaseAll(); patch(defaultModes().typing); setDemo(false); }}><ArrowUUpLeftIcon size={14} />Reset typing setup</button><p className="studio-mode-note">{isNative() ? 'With keyboard output enabled, typing effects respond across Windows. Use the test pad or click keys to try them here.' : 'Input stays inside this page. Click the keyboard above, or use the test pad. Presses in menus and search fields aren’t captured.'}</p></>}
  ><div className="studio-section-heading"><h2>Typing effects</h2><input className="studio-inline-search" aria-label="Search typing effects" placeholder="Search effects" value={query} onChange={event => setQuery(event.target.value)} /></div>{TYPING_GROUPS.map(group => { const items = entries.filter(item => item.group === group); return items.length > 0 && <section key={group} aria-label={group}>{group !== 'Classic' && <div className="studio-section-heading"><h2>{group}</h2><span>{items.length} effects</span></div>}<div className="studio-effect-grid studio-mode-grid">{items.map(item => <ModeTile key={item.id} name={item.name} description={inputLabel(item)} selected={item.id === family.id} preview={previews[item.id]} onPick={() => choose(item.variants[0], item.id)} />)}</div></section>; })}{!entries.length && <p className="studio-mode-note">No typing effects match that search.</p>}</ModeLayout>;
}
