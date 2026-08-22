/**
 * sensorSchema.js — CANONICAL PHYSIOLOGICAL DATA SCHEMA (single source of truth)
 *
 * Every layer (simulation, feature pipeline, Digital DNA, Neural Schema,
 * AI engine, emergency monitoring) reads its definitions from this file.
 *
 * Canonical reading shape produced by any sensor provider (simulated now,
 * ESP32 hardware later — identical schema):
 *
 * {
 *   schemaVersion,      // number
 *   timestamp,          // ms epoch — one consistent timestamp per reading
 *   ecg,                // mV, instantaneous ECG sample
 *   heartRate,          // bpm (MAX30102-equivalent)
 *   gsr,                // kΩ skin resistance (GSR electrode)
 *   temperature,        // °C (LM35-equivalent)
 *   rrInterval,         // ms, last beat-to-beat interval (ECG-derived)
 *   hrvSdnn,            // ms, HRV estimate (ECG-derived)
 *   stLevel,            // mV, ECG morphology estimate (DEMO ONLY)
 *   rAmplitude,         // mV, R-peak amplitude estimate (DEMO ONLY)
 *   signalQuality,      // 0..1
 *   scenario,           // 'NORMAL' | 'STRESS' | 'ABNORMAL' | 'CRITICAL'
 *   running             // boolean
 * }
 *
 * DISCLAIMER: all values are SIMULATED DEMO SIGNALS. They are NOT clinically
 * accurate and MUST NOT be used for medical decisions.
 */

export const READING_SCHEMA_VERSION = 1;

export const SCENARIO_ORDER = ['NORMAL', 'STRESS', 'ABNORMAL', 'CRITICAL'];

/**
 * Scenario parameter sets for the simulation engine.
 * The engine interpolates these smoothly — no hard jumps, no pure randomness.
 * `seed` makes each scenario reproducible for demonstrations.
 */
export const SCENARIOS = {
  NORMAL: {
    id: 'NORMAL',
    label: 'Normal',
    blurb: 'Resting baseline · stable sinus-style rhythm',
    severity: 0,
    seed: 1337,
    hr: { base: 72, var: 3.0 },        // bpm
    respRate: 0.25,                    // Hz breathing-coupled modulation
    gsr: { base: 4.6, var: 0.35 },     // kΩ (relaxed → higher resistance)
    temp: { base: 36.8, var: 0.07 },   // °C
    rrJitter: 0.02,                    // beat-to-beat timing jitter
    ectopyChance: 0.0,                 // probability of irregular beat
    stShift: 0.0,                      // mV morphology offset (demo)
    tWaveAmp: 0.28,
    noiseLevel: 0.015,
    qrsWiden: 0.0,
  },
  STRESS: {
    id: 'STRESS',
    label: 'Stress / Elevated',
    blurb: 'Elevated HR · low skin resistance · sympathetic pattern',
    severity: 1,
    seed: 4242,
    hr: { base: 106, var: 8.0 },
    respRate: 0.36,
    gsr: { base: 2.1, var: 0.45 },
    temp: { base: 37.4, var: 0.11 },
    rrJitter: 0.05,
    ectopyChance: 0.0,
    stShift: 0.02,
    tWaveAmp: 0.26,
    noiseLevel: 0.03,
    qrsWiden: 0.0,
  },
  ABNORMAL: {
    id: 'ABNORMAL',
    label: 'Abnormal',
    blurb: 'Irregular beats · ectopy · ST depression (demo morphology)',
    severity: 2,
    seed: 909,
    hr: { base: 88, var: 14.0 },
    respRate: 0.28,
    gsr: { base: 3.2, var: 1.0 },
    temp: { base: 37.1, var: 0.14 },
    rrJitter: 0.12,
    ectopyChance: 0.18,
    stShift: -0.12,
    tWaveAmp: -0.10,                   // inverted T (demo)
    noiseLevel: 0.05,
    qrsWiden: 0.35,
  },
  CRITICAL: {
    id: 'CRITICAL',
    label: 'Critical Demo',
    blurb: 'Severe tachycardia · chaotic rhythm · ST elevation (demo)',
    severity: 3,
    seed: 66613,
    hr: { base: 152, var: 22.0 },
    respRate: 0.5,
    gsr: { base: 1.2, var: 0.7 },
    temp: { base: 38.6, var: 0.18 },
    rrJitter: 0.2,
    ectopyChance: 0.3,
    stShift: 0.32,
    tWaveAmp: 0.34,
    noiseLevel: 0.07,
    qrsWiden: 0.5,
  },
};

/**
 * Feature definitions — the shared vocabulary of the whole system.
 * range   → normalization bounds (pipeline)
 * nominal → comfortable demo band (status coloring)
 * floorσ  → minimum std used in deviation math (avoids divide-by-tiny)
 * weight  → contribution weight (Digital DNA + AI engine), Σ = 1.0
 */
export const FEATURES = [
  {
    id: 'heart_rate', label: 'Heart Rate', short: 'HR',
    source: 'MAX30102', unit: 'bpm', decimals: 0,
    range: [40, 180], nominal: [55, 95], floorSigma: 3.0, weight: 0.22,
    description: 'Beat rate derived from the optical pulse channel.',
  },
  {
    id: 'rr_interval', label: 'RR Interval', short: 'RR',
    source: 'ECG-derived', unit: 'ms', decimals: 0,
    range: [300, 1200], nominal: [600, 1000], floorSigma: 25, weight: 0.10,
    description: 'Time between consecutive R peaks.',
  },
  {
    id: 'hrv_sdnn', label: 'HRV (SDNN)', short: 'HRV',
    source: 'ECG-derived', unit: 'ms', decimals: 1,
    range: [5, 120], nominal: [30, 90], floorSigma: 5, weight: 0.16,
    description: 'Beat-to-beat variability over the recent window.',
  },
  {
    id: 'st_level', label: 'ST Level', short: 'ST',
    source: 'ECG-derived', unit: 'mV', decimals: 3,
    range: [-0.3, 0.45], nominal: [-0.05, 0.05], floorSigma: 0.015, weight: 0.20,
    description: 'Segment-level morphology estimate (demo only).',
  },
  {
    id: 'r_amplitude', label: 'R Amplitude', short: 'R-AMP',
    source: 'ECG-derived', unit: 'mV', decimals: 2,
    range: [0.2, 1.6], nominal: [0.7, 1.3], floorSigma: 0.05, weight: 0.08,
    description: 'R-peak height estimate from the ECG stream.',
  },
  {
    id: 'gsr', label: 'Skin Resistance', short: 'GSR',
    source: 'GSR electrodes', unit: 'kΩ', decimals: 2,
    range: [0.5, 12], nominal: [3.0, 8.0], floorSigma: 0.3, weight: 0.14,
    description: 'Electrodermal resistance — drops with arousal/stress.',
  },
  {
    id: 'temperature', label: 'Body Temp', short: 'TEMP',
    source: 'LM35', unit: '°C', decimals: 2,
    range: [35, 39.5], nominal: [36.2, 37.4], floorSigma: 0.1, weight: 0.10,
    description: 'Skin-proximal temperature proxy.',
  },
];

export const FEATURE_MAP = Object.fromEntries(FEATURES.map((f) => [f.id, f]));

/** Default AI-engine configuration (all thresholds are DEMO/PROTOTYPE values). */
export const DEFAULT_RISK_CONFIG = {
  warningThreshold: 0.25,
  criticalThreshold: 0.55,
  sigmaScale: 3.0, // |z| = sigmaScale ⇒ deviation contribution = 1.0
};

export function createEmptyReading() {
  return {
    schemaVersion: READING_SCHEMA_VERSION,
    timestamp: 0,
    ecg: 0,
    heartRate: 0,
    gsr: 0,
    temperature: 0,
    rrInterval: 0,
    hrvSdnn: 0,
    stLevel: 0,
    rAmplitude: 0,
    signalQuality: 0,
    scenario: 'NORMAL',
    running: false,
  };
}

export const TERMINOLOGY = {
  digitalDna:
    'Digital BNA = data-driven representation of multidimensional physiological signals.',
  neuralSchema:
    'Neural Schema = software representation of personal physiological patterns (not brain-activity recording).',
  aiEngine:
    'AI-assisted physiological anomaly/risk prototype — not a medical diagnostic AI.',
};
