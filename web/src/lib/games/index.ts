/**
 * Game registry. Keys are stable identifiers used by the UI.
 */

import type { GameDef } from './core';
import { pong } from './pong';
import { snake } from './snake';
import { whackAMole } from './whackamole';
import { simon } from './simon';
import { frogger } from './frogger';
import { typing } from './typing';

export * from './core';

export const GAMES: Record<string, GameDef> = {
  pong,
  snake,
  frogger,
  whackamole: whackAMole,
  simon,
  typing,
};
