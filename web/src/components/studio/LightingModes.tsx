'use client';

import type { LightingMode } from '@/lib/studio/catalog';
import type { ModePlayback } from './ModeLayout';
import { TypingMode } from './TypingMode';
import { AudioMode } from './AudioMode';
import { ScreenMode } from './ScreenMode';
import { PerKeyMode } from './PerKeyMode';
import { LayersMode } from './LayersMode';
import { ActivityMode } from './ActivityMode';

export function LightingModes({ mode, ...props }: ModePlayback & { mode: Exclude<LightingMode, 'automatic'> }) {
  switch (mode) {
    case 'typing': return <TypingMode key={`typing-${props.epoch}`} {...props} />;
    case 'audio': return <AudioMode {...props} />;
    case 'screen': return <ScreenMode {...props} />;
    case 'per-key': return <PerKeyMode {...props} />;
    case 'layers': return <LayersMode {...props} />;
    case 'system-activity': return <ActivityMode {...props} />;
  }
}
