'use client';

import { useState } from 'react';
import { useKeyboard } from '@/hooks/useKeyboard';
import { ConnectionBar } from '@/components/ConnectionBar';
import { EffectsPanel } from '@/components/EffectsPanel';
import { PerKeyPanel } from '@/components/PerKeyPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AnimationsPanel } from '@/components/AnimationsPanel';
import { RemapPanel } from '@/components/RemapPanel';
import { MacrosPanel } from '@/components/MacrosPanel';
import { LogPanel } from '@/components/LogPanel';
import { LayoutMapperPanel } from '@/components/LayoutMapperPanel';
import { GamesPanel } from '@/components/GamesPanel';

type Tab = 'effects' | 'perkey' | 'animations' | 'settings' | 'remap' | 'macros' | 'layout' | 'games';

export default function Home() {
  const kb = useKeyboard();
  const [tab, setTab] = useState<Tab>('effects');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'effects', label: 'Effects' },
    { id: 'perkey', label: 'Per-Key' },
    { id: 'animations', label: 'Animations' },
    { id: 'remap', label: 'Remap' },
    { id: 'macros', label: 'Macros' },
    { id: 'games', label: 'Games' },
    { id: 'layout', label: 'Layout' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <main className="flex flex-col items-center px-4 py-8 min-h-screen">
      {/* Header */}
      <header className="w-full max-w-[920px] mb-6">
        <div className="flex items-baseline justify-between border-b border-zinc-800 pb-4">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            AULA F75 <span className="font-normal text-zinc-500">controller</span>
          </h1>
          <p className="font-mono text-[0.7rem] text-zinc-600">258A:010C · WebHID · local only</p>
        </div>
      </header>

      {/* Connection */}
      <ConnectionBar
        connected={kb.connected}
        status={kb.status}
        onConnect={kb.connect}
      />

      {/* Tab bar */}
      <nav className="w-full max-w-[920px] flex gap-1 mb-5 bg-zinc-900 rounded-lg p-1 border border-zinc-800" aria-label="Sections">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
              className={[
                'flex-1 py-1.5 text-sm rounded-md transition-colors duration-150',
                tab === t.id
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Panel content */}
      <div className="w-full max-w-[920px] mb-6">
        {tab === 'effects' && <EffectsPanel onApply={kb.doSetEffect} />}
        {tab === 'perkey' && <PerKeyPanel onApply={kb.doApplyPerKey} />}
        {tab === 'animations' && (
          <AnimationsPanel
            key={kb.device?.opened ? `${kb.device.vendorId}:${kb.device.productId}:${kb.device.productName}` : 'disconnected'}
            device={kb.device}
            log={kb.log}
          />
        )}
        {tab === 'settings' && (
          <SettingsPanel
            onSetSleep={kb.doSetSleep}
            onSetDebounce={kb.doSetDebounce}
            onFactoryReset={kb.doFactoryReset}
            device={kb.device}
            onReadConfig={kb.doReadConfig}
            onWriteKeybind={kb.doWriteKeybind}
            log={kb.log}
          />
        )}
        {tab === 'games' && <GamesPanel device={kb.device} log={kb.log} />}
        {tab === 'layout' && <LayoutMapperPanel device={kb.device} log={kb.log} />}
        {tab === 'remap' && <RemapPanel onWriteKeybind={kb.doWriteKeybind} />}
        {tab === 'macros' && (
            <MacrosPanel
                device={kb.device}
                log={kb.log}
                onDumpConfig={kb.doDumpConfig}
                onDumpColors={kb.doDumpColors}
                onCalibrate={kb.doCalibrate}
                onClearLayout={kb.doClearLayout}
                onProbeSelect={kb.doProbeSelect}
                onSnapshotDefaults={kb.doSnapshotDefaults}
                onRestoreDefaults={kb.doRestoreDefaults}
                onPerKeyLab={kb.doPerKeyLab}
            />
        )}
      </div>

      {/* Log */}
      <LogPanel logs={kb.logs} onSaveTrace={kb.doSaveTrace} />

      <footer className="mt-4 mb-2 text-center">
        <p className="text-[0.7rem] text-zinc-700">Runs entirely in your browser. Keyboard traffic never leaves this machine.</p>
      </footer>
    </main>
  );
}
