'use client';

import { PauseIcon, PlayIcon, StopIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultsFor, type Playback } from '@/lib/studio/catalog';
import type { Frame } from '@/lib/animations';
import { KeyboardCanvas } from './KeyboardCanvas';
import { KeyboardSurface } from './KeyboardSurface';

export interface ModePlayback { playback: Playback; epoch: number; fps: number; onToggle: () => void; onStop: () => void; notify: (message: string) => void }
export function ModeLayout({ mode, title, detail, brightness, render, controls, children, stageTools, selected, onSelect, onPress, onRelease, staticPreview = false, ...transport }: ModePlayback & {
  mode: string; title: string; detail: string; brightness: number; render: (time: number) => Frame;
  controls: ReactNode; children: ReactNode; stageTools?: ReactNode;
  selected?: readonly number[]; onSelect?: (id: number, extend: boolean) => void;
  onPress?: (code: string) => void; onRelease?: (code: string) => void; staticPreview?: boolean;
}) {
  const settings = useMemo(() => ({ ...defaultsFor(), brightness }), [brightness]);
  const onToggle = transport.onToggle;
  useEffect(() => {
    if (staticPreview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('input,textarea,select,button,a,[contenteditable="true"]')) return;
      if (event.code === 'Space') { event.preventDefault(); onToggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [staticPreview, onToggle]);
  return <>
    <div id="studio-extra-panel" role="tabpanel" aria-labelledby={`studio-tab-${mode}`} className="studio-lighting-layout studio-mode-layout" data-mode={mode}>
      <section className="studio-library studio-mode-content" aria-label={`${title} workspace`}>
        <div className="studio-preview-stage"><KeyboardSurface nativePreview settings={settings} frameSource={render} label={`${title} keyboard preview`} playback={staticPreview ? 'paused' : transport.playback} epoch={transport.epoch} fps={transport.fps} selected={selected} onSelect={onSelect} onPress={onPress} onRelease={onRelease} /></div>
        {stageTools}
        <div className="studio-mode-scroll">{children}</div>
      </section>
      <aside className="studio-inspector" aria-label={`${title} controls`}>{controls}</aside>
    </div>
    <footer className="studio-transport" aria-label={`${title} playback controls`}>
      <div className="studio-now-playing"><div><strong>{title}</strong><span>{detail}{!staticPreview && transport.playback !== 'playing' ? ` · ${transport.playback === 'paused' ? 'Paused' : 'Stopped'}` : ''}</span></div></div>
      {!staticPreview && <div className="studio-transport-controls"><button type="button" className="studio-transport-button" aria-label={transport.playback === 'playing' ? 'Pause preview' : 'Play preview'} title="Play or pause · Space" onClick={transport.onToggle}>{transport.playback === 'playing' ? <PauseIcon size={19} weight="fill" /> : <PlayIcon size={19} weight="fill" />}</button><button type="button" className="studio-transport-button" aria-label="Stop preview" disabled={transport.playback === 'stopped'} onClick={transport.onStop}><StopIcon size={17} weight="fill" /></button></div>}
    </footer>
  </>;
}
const tileSettings = { ...defaultsFor(), brightness: 90 };
export function ModeTile({ name, description, selected, preview, onPick }: { name: string; description: string; selected: boolean; preview: (time: number) => Frame; onPick: () => void }) {
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  return <article className={`studio-effect-card ${selected ? 'is-selected' : ''}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}><button type="button" className="studio-effect-pick" aria-label={`Preview ${name}`} aria-pressed={selected} onClick={onPick} onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setFocused(true); }} onBlur={() => setFocused(false)}><KeyboardCanvas miniature settings={tileSettings} frameSource={preview} label={`${name} thumbnail`} animate={hovered || focused} /><span className="studio-effect-label"><strong>{name}</strong><span>{description}</span></span></button></article>;
}
export function InspectorHeading({ title, description }: { title: string; description: string }) {
  return <><div className="studio-inspector-title"><h2>{title}</h2></div><p className="studio-effect-description">{description}</p><div className="studio-inspector-divider" /></>;
}
