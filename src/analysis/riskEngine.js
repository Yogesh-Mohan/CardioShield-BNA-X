/**
 * riskEngine.js — AI-ASSISTED ANOMALY / RISK ENGINE (Step 9).
 *
 *   processed features + Neural Schema deviation
 *     → configurable weights → weighted anomaly score
 *     → NORMAL / WARNING / CRITICAL classification
 *     → human-readable explanation
 *
 * Deterministic and explainable by design — no black-box model. A trained ML
 * model can later replace `scoreFromDeviations` without changing consumers.
 *
 * This is an "AI-assisted physiological anomaly/risk prototype".
 * It is NOT a medical diagnostic AI. All thresholds are DEMO/PROTOTYPE values.
 */

import { FEATURES } from '../data/sensorSchema';
import { clamp } from '../data/noise';

export const RISK_LEVELS = {
  NORMAL: { id: 'NORMAL', color: 'var(--ok)', rank: 0 },
  WARNING: { id: 'WARNING', color: 'var(--warn)', rank: 1 },
  CRITICAL: { id: 'CRITICAL', color: 'var(--bad)', rank: 2 },
};

const DEFAULT_WEIGHTS = Object.fromEntries(FEATURES.map((f) => [f.id, f.weight]));

/**
 * Core scoring function — isolated so a future trained model can be swapped in.
 * @param {{[id]: number}} deviations  per-feature deviation 0..1 (Neural Schema)
 * @param {{[id]: number}} weights      per-feature weights (Σ ≈ 1)
 * @returns {number} anomaly score 0..1
 */
export function scoreFromDeviations(deviations, weights = DEFAULT_WEIGHTS) {
  let wSum = 0;
  let acc = 0;
  for (const f of FEATURES) {
    const w = weights[f.id] ?? 0;
    const d = deviations[f.id] ?? 0;
    // Slight super-linear emphasis so several moderate deviations score
    // higher than one mild one (still fully deterministic).
    acc += w * d * (1 + d * 0.5);
    wSum += w;
  }
  return clamp(acc / Math.max(wSum, 1e-6), 0, 1);
}

export class RiskEngine {
  /**
   * @param {object} cfg thresholds are DEMO/PROTOTYPE values:
   *   warningThreshold / criticalThreshold in [0,1]
   */
  constructor(cfg = {}) {
    this.config = {
      warningThreshold: 0.25,
      criticalThreshold: 0.55,
      ...cfg,
    };
    this.lastResult = null;
    this._scoreHistory = [];
  }

  setThresholds({ warningThreshold, criticalThreshold }) {
    if (warningThreshold != null) this.config.warningThreshold = warningThreshold;
    if (criticalThreshold != null) this.config.criticalThreshold = criticalThreshold;
  }

  reset() {
    this.lastResult = null;
    this._scoreHistory = [];
  }

  classify(score) {
    if (score >= this.config.criticalThreshold) return 'CRITICAL';
    if (score >= this.config.warningThreshold) return 'WARNING';
    return 'NORMAL';
  }

  /** Confidence/strength of the prototype signal (distance into its band). */
  _confidence(score, level) {
    const { warningThreshold: wt, criticalThreshold: ct } = this.config;
    if (level === 'CRITICAL') return clamp((score - ct) / Math.max(1 - ct, 1e-6), 0, 1);
    if (level === 'WARNING') return clamp((score - wt) / Math.max(ct - wt, 1e-6), 0, 1);
    return clamp(1 - score / Math.max(wt, 1e-6), 0, 1);
  }

  /**
   * Ingest a Neural Schema result; returns the full explainable assessment.
   */
  assess(schemaResult) {
    if (!schemaResult || !schemaResult.deviations) return this.lastResult;

    const deviations = {};
    for (const f of FEATURES) deviations[f.id] = schemaResult.deviations[f.id]?.absDev ?? 0;

    const score = scoreFromDeviations(deviations);
    const level = this.classify(score);

    // Top triggering features with direction + magnitude.
    const triggers = [...FEATURES]
      .map((f) => ({
        id: f.id,
        label: f.label,
        short: f.short,
        deviation: deviations[f.id],
        weight: DEFAULT_WEIGHTS[f.id],
        contribution: deviations[f.id] * DEFAULT_WEIGHTS[f.id],
        direction: schemaResult.deviations[f.id]?.direction ?? 'none',
      }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 4);

    let trend = 'stable';
    if (this._scoreHistory.length >= 2) {
      const prev = this._scoreHistory[this._scoreHistory.length - 1];
      const d = score - prev;
      if (d > 0.01) trend = 'rising';
      else if (d < -0.01) trend = 'falling';
    }
    this._scoreHistory.push(score);
    if (this._scoreHistory.length > 120) this._scoreHistory.shift();

    const explanation = this._explain(level, score, triggers);

    const result = {
      timestamp: schemaResult.timestamp,
      scenario: schemaResult.scenario,
      baselineReady: schemaResult.baselineReady,
      score,
      level,
      confidence: this._confidence(score, level),
      triggers,
      trend,
      explanation,
      thresholds: { ...this.config },
      scoreHistory: [...this._scoreHistory],
    };

    this.lastResult = result;
    return result;
  }

  _explain(level, score, triggers) {
    const pct = `${Math.round(score * 100)}%`;
    const top = triggers.filter((t) => t.deviation > 0.05).slice(0, 3);
    const names = top.map((t) => t.label).join(', ');

    switch (level) {
      case 'CRITICAL':
        return `Anomaly score ${pct} crossed the CRITICAL demo threshold. `
          + `Dominant drivers: ${names || 'multiple combined deviations'}. `
          + `Pattern deviates strongly from the personal baseline across multiple channels.`;
      case 'WARNING':
        return `Anomaly score ${pct} is in the WARNING demo band. `
          + `Main contributors: ${names || 'mild multi-feature drift'}. `
          + `Deviation from personal baseline is moderate and being tracked.`;
      default:
        return `Anomaly score ${pct} is within the NORMAL demo band. `
          + `Current pattern matches the personal baseline within tolerance.`;
    }
  }
}

let singleton = null;
/** App-wide single instance (emergency layer consumes the same object). */
export function getRiskEngine() {
  if (!singleton) singleton = new RiskEngine();
  return singleton;
}
