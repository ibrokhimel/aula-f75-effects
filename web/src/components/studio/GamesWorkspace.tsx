'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowCounterClockwiseIcon, GameControllerIcon, PauseIcon, PlayIcon, StopIcon } from '@phosphor-icons/react';
import { GAMES, type GameView, type Input } from '@/lib/games';
import { defaultsFor } from '@/lib/studio/catalog';
import { KeyboardSurface } from './KeyboardSurface';
import { InspectorHeading, ModeTile } from './ModeLayout';
import { useWorkspaceData } from './useWorkspaceData';
import { publishGameFrame } from '@/lib/studio/output';

export function GamesWorkspace({ onStart }: { onStart: () => void }) {
  const [data, update] = useWorkspaceData(), [id, select] = useState('snake'), [playing, setPlaying] = useState(false), [version, setVersion] = useState(0), [speed, setSpeed] = useState(1);
  const game = useMemo(() => GAMES[id].create(75 + version), [id, version]), definition = GAMES[id];
  const arena = useRef<HTMLDivElement>(null), input = useRef<Input>({ held: new Set(), pressed: new Set() });
  const [view, setView] = useState<GameView>(() => game.view());
  const frame = useRef(game.render());
  const clearInput = useCallback(() => { input.current.held.clear(); input.current.pressed.clear(); }, []);
  useEffect(() => {
    let previous = 0;
    frame.current = game.render();
    const tick = () => {
      const now = performance.now(), dt = previous ? Math.min(0.1, (now - previous) / 1000) * speed : 0;
      previous = now;
      if (playing && document.visibilityState === 'visible') game.step(dt, input.current);
      input.current.pressed.clear(); frame.current = game.render();
      if (playing) publishGameFrame(frame.current);
      setView(game.view());
    };
    tick(); const timer = setInterval(tick, 1000 / 30);
    const blur = () => { clearInput(); setPlaying(false); };
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', blur);
    return () => { clearInterval(timer); clearInput(); publishGameFrame(null); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', blur); };
  }, [game, playing, speed, clearInput]);
  useEffect(() => {
    if (view.score > (data.scores[id] ?? 0)) update(current => ({ scores: { ...current.scores, [id]: view.score } }));
  }, [view.score, data.scores, id, update]);
  const previews = useMemo(() => Object.fromEntries(Object.entries(GAMES).map(([key, def]) => {
    const sample = def.create(75); let previous = 0;
    return [key, (time: number) => { if (time < previous) sample.reset(); sample.step(Math.min(0.08, Math.max(0, time - previous)), { held: new Set(), pressed: new Set() }); previous = time; return sample.render(); }];
  })), []);
  function press(code: string) { if (!input.current.held.has(code)) input.current.pressed.add(code); input.current.held.add(code); }
  function restart() { onStart(); clearInput(); setVersion(v => v + 1); setPlaying(true); setTimeout(() => arena.current?.focus(), 0); }
  return <div className="studio-workspace-split" data-page="games" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { clearInput(); setPlaying(false); } }}><section className="studio-workspace-scroll">
    <div className="studio-game-stage" ref={arena} tabIndex={0} role="group" aria-label="Game controls area" onKeyDown={e => { if (!playing || e.target instanceof Element && e.target.closest('button,select,input')) return; e.preventDefault(); if (!e.repeat) press(e.code); }} onKeyUp={e => { input.current.held.delete(e.code); }} onBlur={clearInput}>
      <div className="studio-game-score"><div><span>Score</span><strong>{view.score}</strong></div><div><span>Personal best</span><strong>{Math.max(view.score, data.scores[id] ?? 0)}</strong></div></div>
      <KeyboardSurface settings={defaultsFor()} playback="playing" frameSource={() => frame.current} label={`${definition.name} game keyboard`} onPress={code => { if (playing) press(code); }} onRelease={code => input.current.held.delete(code)} />
      <div className="studio-game-status"><GameControllerIcon size={19} weight="light" /><span>{view.state === 'over' ? view.status : playing ? view.status : 'Press Play, then use the controls below.'}</span><button type="button" className="studio-icon-button" aria-label="Restart game" onClick={restart}><ArrowCounterClockwiseIcon size={19} /></button></div>
    </div>
    <div className="studio-section-heading"><h2>Keyboard arcade</h2><span>{Object.keys(GAMES).length} games</span></div><div className="studio-effect-grid studio-mode-grid">{Object.entries(GAMES).map(([key, def]) => <ModeTile key={key} name={def.name} description={def.blurb} selected={id === key} preview={previews[key]} onPick={() => { setPlaying(false); clearInput(); select(key); }} />)}</div>
  </section><aside className="studio-inspector"><InspectorHeading title={definition.name} description={definition.blurb} /><div className="studio-game-instructions"><h3>How to play</h3><p>{definition.controls}</p></div><label className="studio-field">Game speed<select className="studio-toolbar-select" aria-label="Game speed" value={speed} onChange={e => { setSpeed(Number(e.target.value)); clearInput(); setPlaying(false); }}><option value={0.65}>Relaxed · 0.65×</option><option value={1}>Standard · 1×</option><option value={1.4}>Fast · 1.4×</option></select></label>
    <button type="button" className="studio-button studio-button-primary studio-full-button" onClick={() => { if (view.state === 'over') { restart(); return; } clearInput(); if (!playing) onStart(); setPlaying(p => !p); if (!playing) setTimeout(() => arena.current?.focus(), 0); }}>{playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}{playing ? 'Pause game' : view.state === 'over' ? 'Play again' : 'Play game'}</button><button type="button" className="studio-button studio-button-secondary studio-full-button" onClick={() => { setPlaying(false); clearInput(); setVersion(v => v + 1); }}><StopIcon size={15} />Stop and reset</button><p className="studio-mode-note">Games receive keys while the play area is focused. Leaving the page or switching windows pauses play and restores your lighting.</p>
  </aside></div>;
}
