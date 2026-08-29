/**
 * Rhythm. Four lanes on the home row — notes fall down the columns above
 * F G H J and you hit the key as they land on it.
 *
 * The lanes sit where your fingers already rest, which is the whole reason
 * this works on a keyboard: no hand position to learn.
 */

import {
  LED_BY_NAME, LED_GEO, type Frame, type Game, type GameDef,
  blend, makeRng, splat,
} from './core';

const LANE_LABELS = ['F', 'G', 'H', 'J'];
const LANES = LANE_LABELS.flatMap((label) => {
  const led = LED_BY_NAME.get(label);
  const geo = led === undefined ? undefined : LED_GEO.get(led);
  return led === undefined || geo === undefined
    ? []
    : [{ label, led, code: `Key${label}`, ux: geo.ux, uy: geo.uy }];
});

const BPM = 100;
const BEAT = 60 / BPM;
const APPROACH = 1.6;     // seconds from spawn to the hit line
const GOOD = 0.11;
const OK = 0.2;
const CHART_BEATS = 240;

interface Note { t: number; lane: number; hit: 0 | 1 | 2; missed: boolean }

export const rhythm: GameDef = {
  name: 'Rhythm',
  controls: 'F  G  H  J',
  blurb: 'Notes fall to the home row. Hit them on the beat.',
  create(seed) {
    const rng = makeRng(seed);
    let chart: Note[] = [];
    let now = 0, score = 0, combo = 0, best = 0, hits = 0, misses = 0;
    let laneFlash = LANES.map(() => 0);

    const g: Game = {
      reset() {
        chart = [];
        for (let b = 4; b < CHART_BEATS; b++) {
          // Downbeats are near-certain, offbeats occasional — enough structure
          // to feel like a rhythm rather than noise.
          const onBeat = b % 2 === 0;
          if (rng() < (onBeat ? 0.7 : 0.25)) {
            chart.push({ t: b * BEAT, lane: Math.floor(rng() * LANES.length), hit: 0, missed: false });
          }
        }
        now = 0; score = 0; combo = 0; best = 0; hits = 0; misses = 0;
        laneFlash = LANES.map(() => 0);
      },

      step(dt, input) {
        now += dt;
        for (let i = 0; i < laneFlash.length; i++) {
          if (laneFlash[i] > 0) laneFlash[i] = Math.max(0, laneFlash[i] - dt);
        }

        for (let i = 0; i < LANES.length; i++) {
          if (!input.pressed.has(LANES[i].code)) continue;
          laneFlash[i] = 0.12;
          // Judge the nearest unjudged note in this lane.
          let target: Note | null = null, bestD = Infinity;
          for (const n of chart) {
            if (n.lane !== i || n.hit || n.missed) continue;
            const d = Math.abs(n.t - now);
            if (d < bestD) { bestD = d; target = n; }
          }
          if (!target || bestD > OK) continue;
          target.hit = bestD <= GOOD ? 2 : 1;
          combo++;
          best = Math.max(best, combo);
          hits++;
          score += target.hit * (1 + Math.floor(combo / 10));
        }

        for (const n of chart) {
          if (!n.hit && !n.missed && now - n.t > OK) {
            n.missed = true; misses++; combo = 0;
          }
        }
      },

      render() {
        const f: Frame = new Map();
        LANES.forEach((l, i) => {
          const lit = laneFlash[i] > 0;
          blend(f, l.led, lit ? [255, 255, 255] : [26, 20, 46]);
        });
        for (const n of chart) {
          if (n.hit || n.missed) continue;
          const remain = n.t - now;
          if (remain > APPROACH || remain < -OK) continue;
          const l = LANES[n.lane];
          // Travel from a row above the board down onto the lane key.
          const uy = l.uy - (remain / APPROACH) * (l.uy + 1.5);
          const near = 1 - Math.min(1, Math.abs(remain) / APPROACH);
          const v = 0.35 + 0.65 * near;
          splat(f, l.ux, uy,
            [Math.round(80 * v), Math.round(200 * v), Math.round(255 * v)], 0.5, 0.32);
        }
        return f;
      },

      view: () => {
        const judged = hits + misses;
        const acc = judged ? Math.round((hits / judged) * 100) : 100;
        const done = now > CHART_BEATS * BEAT + APPROACH;
        return {
          score,
          status: done
            ? `Finished — ${score} pts · ${acc}% · best combo ${best}`
            : `${score} pts   combo ${combo}   ${acc}%`,
          state: done ? 'over' : 'playing',
        };
      },
    };
    g.reset();
    return g;
  },
};
