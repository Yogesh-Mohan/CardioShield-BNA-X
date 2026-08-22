/**
 * featurePipeline.js — THE ONE feature-processing pipeline (Steps 4→7 bridge).
 *
 *   canonical reading → clean → normalize → feature vector → Digital DNA mapping
 *
 * Guarantees:
 *  - Original raw values are preserved alongside normalized values.
 *  - Deterministic: same input ⇒ same output.
 *  - The exact vector returned here drives the 3D Digital DNA, the Neural
 *    Schema and the AI engine (no parallel processing paths).
 *  - Timestamped feature states for time-based comparison.
 *
 * Terminology: "Digital DNA = data-driven representation of multidimensional
 * physiological signals." Nothing here identifies human genetic DNA.
 */

import { FEATURES, FEATURE_MAP } from '../data/sensorSchema';
import { clamp } from '../data/noise';

/** Map a raw value into [0,1] using the feature's declared range. */
export function normalizeValue(featureId, raw) {
  const f = FEATURE_MAP[featureId];
  if (!f) return 0;
  const [lo, hi] = f.range;
  return clamp((raw - lo) / (hi - lo), 0, 1);
}

/** Extract the raw value for a feature id from a canonical reading. */
function extractRaw(reading, featureId) {
  switch (featureId) {
    case 'heart_rate': return reading.heartRate;
    case 'rr_interval': return reading.rrInterval;
    case 'hrv_sdnn': return reading.hrvSdnn;
    case 'st_level': return reading.stLevel;
    case 'r_amplitude': return reading.rAmplitude;
    case 'gsr': return reading.gsr;
    case 'temperature': return reading.temperature;
    default: return 0;
  }
}

/** Simple outlier guard: reject non-finite / absurd samples ("cleaning"). */
function isPlausible(featureId, raw) {
  if (!Number.isFinite(raw)) return false;
  const f = FEATURE_MAP[featureId];
  const [lo, hi] = f.range;
  const pad = (hi - lo) * 0.25; // tolerate brief excursions beyond range
  return raw >= lo - pad && raw <= hi + pad;
}

/** Short exponential moving average for smoothing jittery channels. */
class Ema {
  constructor(alpha) { this.alpha = alpha; this.value = null; }
  push(x) {
    this.value = this.value == null ? x : this.value + this.alpha * (x - this.value);
    return this.value;
  }
  reset() { this.value = null; }
}

/**
 * FeaturePipeline — stateful (holds EMAs), deterministic.
 * Create ONE instance app-wide via the singleton below.
 */
export class FeaturePipeline {
  constructor() {
    this._emas = Object.fromEntries(FEATURES.map((f) => [f.id, new Ema(0.35)]));
    this.lastState = null;
    this.stateHistory = []; // newest last, capped
  }

  reset() {
    for (const ema of Object.values(this._emas)) ema.reset();
    this.lastState = null;
    this.stateHistory = [];
  }

  /**
   * Process one canonical reading into a timestamped feature state:
   * {
   *   timestamp, scenario,
   *   features: { [id]: { id,label,source,unit,weight, raw, normalized,
   *                       smoothed, contribution, status } },
   *   vector: Float array in FEATURES order (drives Digital DNA),
   *   dominant: feature ids sorted by |contribution| desc
   * }
   */
  process(reading) {
    if (!reading) return null;

    const features = {};
    const vector = [];

    for (const f of FEATURES) {
      const raw = extractRaw(reading, f.id);
      // Cleaning: implausible samples keep the previous smoothed value.
      const cleaned = isPlausible(f.id, raw)
        ? this._emas[f.id].push(raw)
        : (this._emas[f.id].value ?? f.range[0]);

      const normalized = normalizeValue(f.id, cleaned);

      // Contribution = weight × distance from the center of the nominal band,
      // signed by direction (above/below band). Range ≈ [-1, 1].
      const [nLo, nHi] = f.nominal;
      const nomLo = normalizeValue(f.id, nLo);
      const nomHi = normalizeValue(f.id, nHi);
      const mid = (nomLo + nomHi) / 2;
      const halfWidth = Math.max(nomHi - nomLo, 0.02) / 2;
      const offset = clamp((normalized - mid) / halfWidth, -1, 1);
      const contribution = f.weight * offset;

      const status =
        normalized >= nomLo && normalized <= nomHi ? 'NOMINAL'
          : Math.abs(offset) < 1 ? 'ELEVATED' : 'OUTLIER';

      features[f.id] = {
        id: f.id,
        label: f.label,
        short: f.short,
        source: f.source,
        unit: f.unit,
        decimals: f.decimals,
        weight: f.weight,
        description: f.description,
        raw,
        cleaned: Math.round(cleaned * 1000) / 1000,
        normalized: Math.round(normalized * 1000) / 1000,
        contribution: Math.round(contribution * 1000) / 1000,
        status,
      };
      vector.push(normalized);
    }

    const dominant = [...FEATURES]
      .sort((a, b) => Math.abs(features[b.id].contribution) - Math.abs(features[a.id].contribution))
      .map((f) => f.id);

    const state = {
      timestamp: reading.timestamp,
      scenario: reading.scenario,
      running: reading.running,
      features,
      vector,
      dominant,
    };

    this.lastState = state;
    this.stateHistory.push(state);
    if (this.stateHistory.length > 300) this.stateHistory.shift();
    return state;
  }
}

let singleton = null;
/** App-wide single pipeline instance (same processed data everywhere). */
export function getFeaturePipeline() {
  if (!singleton) singleton = new FeaturePipeline();
  return singleton;
}
