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
import { breakout } from './breakout';
import { tron } from './tron';
import { invaders } from './invaders';
import { flappy } from './flappy';
import { dodger } from './dodger';

export * from './core';

export const GAMES: Record<string, GameDef> = {
  pong,
  snake,
  frogger,
  breakout,
  tron,
  invaders,
  flappy,
  dodger,
  whackamole: whackAMole,
  simon,
  typing,
};
