'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CpuIcon, MemoryIcon } from '@phosphor-icons/react';
import { renderActivity, type SystemSample } from '../../../../packages/engine/src';
import { F75_LAYOUT } from '@/lib/bridges/f75/layout';
import { useModeSettings } from './useModeSettings';
import { InspectorHeading, ModeLayout, type ModePlayback } from './ModeLayout';
import { RangeField, SelectField } from './ModeControls';
import { isNative, nativeTelemetry } from '@/lib/native';

export function ActivityMode(props: ModePlayback) {
  const [store, update] = useModeSettings(), settings = store.activity;
  const sampleRef = useRef<SystemSample | null>(null);
  const [sample, setSample] = useState<SystemSample | null>(null), [history, setHistory] = useState<SystemSample[]>([]), [error, setError] = useState('');
  const patch = (value: Partial<typeof settings>) => { if (!update('activity', value)) props.notify('Changes are kept for this session. Browser storage is unavailable.'); };
  useEffect(() => {
    let disposed = false, busy = false;
    let request: AbortController | null = null;
    async function poll() {
      if (busy || disposed || props.playback !== 'playing' || document.visibilityState !== 'visible') return;
      busy = true; request = new AbortController();
      const timeout = setTimeout(() => request?.abort(), 2500);
      try {
        let next: SystemSample;
        if (settings.source === 'sample') {
          next = await Promise.resolve({ cpu: settings.sampleCPU, memory: settings.sampleMemory, usedBytes: settings.sampleMemory / 100 * 16 * 1024 ** 3, totalBytes: 16 * 1024 ** 3, uptime: 7200, timestamp: Date.now() });
        } else if (isNative()) {
          next = await nativeTelemetry();
        } else {
          const response = await fetch(process.env.NEXT_PUBLIC_STUDIO_TELEMETRY_URL || 'http://127.0.0.1:3001/telemetry', { signal: request.signal, cache: 'no-store' });
          if (!response.ok) throw new Error('Telemetry helper unavailable');
          next = await response.json();
          if (![next.cpu, next.memory, next.usedBytes, next.totalBytes, next.uptime, next.timestamp].every(Number.isFinite) || next.cpu < 0 || next.cpu > 100 || next.memory < 0 || next.memory > 100) throw new Error('Invalid telemetry sample');
        }
        if (disposed) return;
        sampleRef.current = next; setSample(next); setHistory(values => [...values.slice(-59), next]); setError('');
      } catch {
        if (!disposed) { sampleRef.current = null; setSample(null); setError('The local telemetry helper is unavailable. Start the studio with dev:studio, or choose Sample data to test the lighting.'); }
      } finally { clearTimeout(timeout); busy = false; }
    }
    void poll(); const timer = setInterval(() => void poll(), 1000);
    const visible = () => { if (document.visibilityState === 'visible') void poll(); };
    document.addEventListener('visibilitychange', visible);
    return () => { disposed = true; request?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [settings.source, settings.sampleCPU, settings.sampleMemory, props.playback]);
  const render = useCallback(() => renderActivity(F75_LAYOUT, sampleRef.current, settings), [settings]);
  function changeSource(value: 'computer' | 'sample') { sampleRef.current = null; setSample(null); setHistory([]); setError(''); patch({ source: value }); }
  const path = (key: 'cpu' | 'memory') => history.map((item, index) => `${index ? 'L' : 'M'}${(index / 59 * 580 + 10).toFixed(1)},${(115 - Math.max(0, Math.min(100, item[key]))).toFixed(1)}`).join(' ');
  return <ModeLayout {...props} mode="system-activity" title="System activity" detail={`${settings.metric === 'cpu' ? 'CPU' : 'Memory'} · ${settings.source === 'computer' ? 'Local computer' : 'Sample data'}`} brightness={settings.brightness} render={render}
    controls={<><InspectorHeading title="Activity lighting" description="Turn utilization into a useful signal, with your own colors and warning point." />{settings.view !== 'zones' && <SelectField label="Metric" value={settings.metric} options={[{ value: 'cpu', label: 'CPU utilization' }, { value: 'memory', label: 'Memory usage' }]} onChange={value => patch({ metric: value })} />}<SelectField label="Visualization" value={settings.view} options={[{ value: 'bar', label: 'Horizontal meter' }, { value: 'heat', label: 'Whole-board heat' }, { value: 'zones', label: 'CPU + memory zones' }]} onChange={value => patch({ view: value })} /><RangeField label="Warning point" value={settings.warning} min={10} max={100} unit="%" onChange={value => patch({ warning: value })} /><div className="studio-metric-colors"><label>Low usage<input type="color" value={settings.low} onChange={event => patch({ low: event.target.value })} /></label><label>High usage<input type="color" value={settings.high} onChange={event => patch({ high: event.target.value })} /></label></div><RangeField label="Brightness" value={settings.brightness} min={0} max={100} unit="%" onChange={value => patch({ brightness: value })} /><p className="studio-mode-note">{settings.view === 'zones' ? 'CPU fills the left half; memory fills the right. The warning point controls when the high-usage color takes over.' : 'The warning point controls when the high-usage color takes over.'}</p></>}
  ><div className="studio-source-panel"><div><h2>Data source</h2><p>{settings.source === 'computer' ? 'CPU and physical memory from this computer, sampled once per second.' : 'Manual sample values for testing. These aren’t readings from your computer.'}</p></div><SelectField label="Activity data source" value={settings.source} options={[{ value: 'computer', label: 'Local computer' }, { value: 'sample', label: 'Sample data' }]} onChange={changeSource} />{error && <p className="studio-inline-error" role="status">{error}</p>}</div><div className="studio-metric-grid">{[{ id: 'cpu', name: 'CPU utilization', icon: CpuIcon }, { id: 'memory', name: 'Memory usage', icon: MemoryIcon }].map(metric => <button type="button" key={metric.id} className={`studio-metric-card ${settings.metric === metric.id ? 'is-selected' : ''}`} aria-pressed={settings.view === 'zones' || settings.metric === metric.id} onClick={() => patch({ metric: metric.id as 'cpu' | 'memory', view: settings.view === 'zones' ? 'bar' : settings.view })}><metric.icon size={22} weight="light" /><span>{metric.name}</span><strong>{sample ? Math.round(sample[metric.id as 'cpu' | 'memory']) : '—'}<small>%</small></strong><span>{metric.id === 'memory' ? sample ? `${(sample.usedBytes / 1024 ** 3).toFixed(1)} / ${(sample.totalBytes / 1024 ** 3).toFixed(1)} GB` : 'Physical memory' : settings.source === 'sample' ? 'Manual test value' : 'Across all logical processors'}</span></button>)}</div>{settings.source === 'sample' && <div className="studio-sample-controls"><RangeField label="Sample CPU" value={settings.sampleCPU} min={0} max={100} unit="%" onChange={value => patch({ sampleCPU: value })} /><RangeField label="Sample memory" value={settings.sampleMemory} min={0} max={100} unit="%" onChange={value => patch({ sampleMemory: value })} /></div>}<div className="studio-history-panel"><div className="studio-section-heading"><h2>Recent activity</h2><span>{settings.source === 'sample' ? 'Sample data' : 'Last 60 readings'}</span></div><div className="studio-history-chart"><svg viewBox="0 0 600 130" role="img" aria-label="CPU and memory utilization history">{[15, 65, 115].map(y => <line key={y} x1="10" x2="590" y1={y} y2={y} stroke="#343d3d" strokeWidth="1" />)}{history.length > 1 && <><path d={path('cpu')} fill="none" stroke="#c8ee92" strokeWidth="2" vectorEffect="non-scaling-stroke" /><path d={path('memory')} fill="none" stroke="#92b8c9" strokeWidth="2" vectorEffect="non-scaling-stroke" /></>}</svg>{history.length < 2 && <span>Collecting readings…</span>}</div><div className="studio-chart-legend"><span>CPU</span><span>Memory</span><span>{sample ? `Uptime ${Math.floor(sample.uptime / 3600)}h ${Math.floor(sample.uptime % 3600 / 60)}m` : 'Waiting for a source'}</span></div></div></ModeLayout>;
}
