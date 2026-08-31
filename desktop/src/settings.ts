/**
 * Persisted desktop settings — the last running effect, colour override,
 * animation fps, and the autostart preference. One JSON file in userData;
 * a corrupt or missing file silently falls back to defaults.
 */
import { app } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface PersistedSettings {
  effect: { kind: 'reactive' | 'animation'; id: string } | null;
  /** '#rrggbb' single-colour override, or null for colorful. */
  color: string | null;
  fps: number;
  autostart: boolean;
}

const DEFAULTS: PersistedSettings = {
  effect: null,
  color: null,
  fps: 20,
  autostart: false,
};

const file = () => join(app.getPath('userData'), 'settings.json');

export function loadSettings(): PersistedSettings {
  try {
    const raw = JSON.parse(readFileSync(file(), 'utf8')) as Partial<PersistedSettings>;
    return {
      ...DEFAULTS,
      ...raw,
      effect: raw.effect && typeof raw.effect.id === 'string'
        && (raw.effect.kind === 'reactive' || raw.effect.kind === 'animation')
        ? { kind: raw.effect.kind, id: raw.effect.id }
        : null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: PersistedSettings): void {
  try {
    writeFileSync(file(), JSON.stringify(s, null, 2));
  } catch {
    // Losing a settings write is not worth crashing the engine over.
  }
}
