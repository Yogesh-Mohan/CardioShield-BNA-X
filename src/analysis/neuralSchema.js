/**
 * neuralSchema.js — NEURAL SCHEMA ENGINE (Step 8).
 *
 *   personal baseline → current state → feature deviation → pattern score
 *
 * The baseline is learned from the simulated NORMAL scenario (demo
 * "personal baseline"). Current processed features are compared against it:
 * per-feature z-like deviations, an overall deviation score, trends, and the
 * dominant contributing features.
 *
 * Neural Schema = software representation of physiological patterns.
 * It does NOT read brain activity or extract biological neural structure.
 * All statistics are DEMO/PROTOTYPE values.
 *
 * This module is UI-independent: the AI layer (Step 9) consumes its output.
 */

import { FEATURES, FEATURE_MAP } from '../data/sensorSchema';
import { clamp } from '../data/noise';

const BASELINE_MIN_SAMPLES = 8; // readings needed before baseline is usable

export class NeuralSchemaEngine {
  constructor() {
    this.baseline = null;      // { mean:{id}, std:{id}, samples }
    this._baselineAccum = [];  // recent NORMAL-scenario states for learning
    this.lastResult = null;
  }

  reset() {
    this.baseline = null;
    this._baselineAccum = [];
    this.lastResult = null;
  }

  /** Learn/refresh baseline from a processed feature state. */
  _learnBaseline(state) {
    this._baselineAccum.push(state);
    if (this._baselineAccum.length > 120) this._baselineAccum.shift();
    if (this._baselineAccum.length < BASELINE_MIN_SAMPLES) return;

    const n = this._baselineAccum.length;
    const mean = {};
    const std = {};
    for (const f of FEATURES) {
      const vals = this._baselineAccum.map((s) => s.features[f.id].normalized);
      const m = vals.reduce((a, b) => a + b, 0) / n;
      const v = vals.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
      mean[f.id] = m;
      std[f.id] = Math.max(Math.sqrt(v), FEATURE_MAP[f.id].floorSigmaNorm ?? 0.02);
    }
    this.baseline = { mean, std, samples: n };
  }

  /**
   * Ingest one processed feature state; returns the schema result:
   * {
   *   timestamp, scenario,
   *   baselineReady, baselineSamples,
   *   deviations: { [id]: { normalized, baselineMean, deviation, absDev,
   *                         direction, trend } },
   *   overallDeviation,   // 0..1 weighted mean |z| (capped)
   *   dominant: [ids sorted by |deviation| desc],
   *   trend: 'rising'|'falling'|'stable'  // overall deviation trend
   * }
   */
  update(state) {
    if (!state || !state.features) return this.lastResult;

    // Baseline learning: only while in the NORMAL scenario (personal baseline).
    if (state.scenario === 'NORMAL') {
      this._learnBaseline(state);
    }

    const deviations = {};
    let wSum = 0;
    let devSum = 0;

    for (const f of FEATURES) {
      const cur = state.features[f.id].normalized;
      let deviation = 0;
      let direction = 'none';
      if (this.baseline) {
        const m = this.baseline.mean[f.id];
        const s = this.baseline.std[f.id];
        deviation = clamp(Math.abs(cur - m) / s, 0, 3) / 3; // 0..1
        direction = cur > m ? 'above' : cur < m ? 'below' : 'none';
      }
      deviations[f.id] = {
        normalized: cur,
        baselineMean: this.baseline ? this.baseline.mean[f.id] : null,
        deviation,
        absDev: deviation,
        direction,
        weight: f.weight,
      };
      wSum += f.weight;
      devSum += f.weight * deviation;
    }

    const overallDeviation = this.baseline ? clamp(devSum / wSum, 0, 1) : 0;

    const dominant = [...FEATURES]
      .sort((a, b) => deviations[b.id].absDev - deviations[a.id].absDev)
      .slice(0, 3)
      .map((f) => f.id);

    // Overall trend from previous result.
    let trend = 'stable';
    if (this.lastResult && this.baseline) {
      const d = overallDeviation - this.lastResult.overallDeviation;
      if (d > 0.01) trend = 'rising';
      else if (d < -0.01) trend = 'falling';
    }

    const result = {
      timestamp: state.timestamp,
      scenario: state.scenario,
      baselineReady: !!this.baseline,
      baselineSamples: this.baseline?.samples ?? this._baselineAccum.length,
      deviations,
      overallDeviation,
      dominant,
      trend,
    };

    this.lastResult = result;
    return result;
  }
}

let singleton = null;
/** App-wide single instance (AI layer consumes the same object). */
export function getNeuralSchema() {
  if (!singleton) singleton = new NeuralSchemaEngine();
  return singleton;
}
