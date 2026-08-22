/**
 * ecgSynth.js — synthetic ECG waveform generator (DEMO SIGNALS ONLY).
 *
 * Builds a PQRST-style complex from summed Gaussians, scheduled per beat.
 * Morphology is driven entirely by scenario parameters — no random geometry.
 * NOT clinically accurate; for visualization/demonstration only.
 */

import { createSeededRandom, clamp } from './noise';

/**
 * One heartbeat = sum of Gaussians: P wave, Q dip, R spike, S dip, T wave.
 * Each component: { center (s relative to R peak), width (s), amp (mV) }
 */
const BASE_COMPLEX = [
  { name: 'P', center: -0.19, width: 0.030, amp: 0.14 },
  { name: 'Q', center: -0.028, width: 0.010, amp: -0.12 },
  { name: 'R', center: 0.0, width: 0.013, amp: 1.05 },
  { name: 'S', center: 0.032, width: 0.012, amp: -0.22 },
  { name: 'T', center: 0.24, width: 0.055, amp: 0.28 },
];

/** Premature ventricular contraction shape (wide, no P, inverted T). */
const PVC_COMPLEX = [
  { name: 'R', center: 0.0, width: 0.035, amp: 1.25 },
  { name: 'S', center: 0.06, width: 0.04, amp: -0.55 },
  { name: 'T', center: 0.16, width: 0.075, amp: -0.38 },
];

function gaussian(x, center, width) {
  const d = x - center;
  return Math.exp(-(d * d) / (2 * width * width));
}

/** Evaluate a complex at time t (seconds relative to the beat's R peak). */
export function evaluateComplex(complex, tSec, opts = {}) {
  const { stShift = 0, qrsWiden = 0 } = opts;
  let v = stShift; // baseline offset acts as ST segment shift
  for (const c of complex) {
    const widen = c.name === 'R' || c.name === 'Q' || c.name === 'S' ? 1 + qrsWiden : 1;
    v += c.amp * gaussian(tSec, c.center, c.width * widen);
  }
  return v;
}

/**
 * Beat scheduler: decides when each beat fires and which complex it uses.
 * Deterministic given seed + elapsed time.
 */
export class BeatScheduler {
  constructor(seed) {
    this.rand = createSeededRandom(seed);
    this.nextBeatAt = 0; // engine time (s)
    this.lastRR = 800;
    this.rrHistory = [];
    this.beatCount = 0;
  }

  reset() {
    this.nextBeatAt = 0;
    this.lastRR = 800;
    this.rrHistory = [];
    this.beatCount = 0;
  }

  /**
   * Advance to `timeNow` (engine seconds). Returns beats that fired in
   * (lastProcessed, timeNow], each with { at, rrInterval, isPVC }.
   */
  advance(timeNow, params) {
    const fired = [];
    while (this.nextBeatAt <= timeNow) {
      // HR target with slow physiological wander (respiration-coupled).
      const wander =
        params.hr.var *
        Math.sin(timeNow * 2 * Math.PI * params.respRate * 0.25) *
        0.6 +
        params.hr.var * 0.4 * Math.sin(timeNow * 0.11 + 2.1);
      const bpm = clamp(params.hr.base + wander, 35, 200);
      let rr = 60000 / bpm; // ms

      // Beat-to-beat jitter (HRV-like).
      rr *= 1 + (this.rand() * 2 - 1) * params.rrJitter;

      // Ectopy: PVC replaces this beat and adds a compensatory pause.
      const isPVC = this.rand() < params.ectopyChance && this.beatCount > 3;
      if (isPVC) {
        rr *= 0.72; // premature
      }

      const intervalSec = rr / 1000; // convert ms to seconds
      if (isPVC) {
        this.nextBeatAt += intervalSec + intervalSec * 0.45; // compensatory pause
      } else {
        this.nextBeatAt += intervalSec;
      }

      this.lastRR = rr;
      this.rrHistory.push(rr);
      if (this.rrHistory.length > 40) this.rrHistory.shift();
      this.beatCount += 1;

      fired.push({
        at: this.nextBeatAt - (isPVC ? intervalSec * 0.45 : 0),
        rrInterval: rr,
        isPVC,
      });
    }
    return fired;
  }

  /** SDNN over recent RR history (ms). */
  getSDNN() {
    const h = this.rrHistory;
    if (h.length < 4) return null;
    const mean = h.reduce((a, b) => a + b, 0) / h.length;
    const variance = h.reduce((a, b) => a + (b - mean) ** 2, 0) / (h.length - 1);
    return Math.sqrt(variance);
  }
}

export { BASE_COMPLEX, PVC_COMPLEX };
