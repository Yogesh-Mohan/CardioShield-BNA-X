/**
 * ppseReferenceData.js
 *
 * Prototype reference dataset of stress- and phobia-related response patterns.
 * NOTE: PROTOTYPE / REFERENCE DATA ONLY. NOT CLINICALLY VALIDATED. NOT FOR MEDICAL DIAGNOSIS.
 *
 * Each pattern vector contains normalized reference anchors [0..1] across the physiological features
 * and subjective psychological scales (perceivedStress, fearIntensity, arousalRate).
 */

export const PPSE_REFERENCE_PATTERNS = [
  {
    id: 'ref_baseline_calm',
    name: 'Resting / Low Arousal Baseline',
    category: 'Eustress / Calm',
    description: 'Homeostatic parasympathetic state with minimal autonomic activation and low perceived threat.',
    vector: {
      heart_rate: 0.25,
      rr_interval: 0.70,
      hrv_sdnn: 0.65,
      st_level: 0.50,
      r_amplitude: 0.55,
      gsr: 0.20,
      temperature: 0.45,
      perceived_stress: 0.10,
      fear_intensity: 0.05,
    },
  },
  {
    id: 'ref_cognitive_workload',
    name: 'Acute Cognitive Workload & Focus',
    category: 'Task Stress',
    description: 'Moderate sympathetic response triggered by demanding mental tasks without emotional fear.',
    vector: {
      heart_rate: 0.48,
      rr_interval: 0.50,
      hrv_sdnn: 0.40,
      st_level: 0.52,
      r_amplitude: 0.52,
      gsr: 0.55,
      temperature: 0.48,
      perceived_stress: 0.45,
      fear_intensity: 0.15,
    },
  },
  {
    id: 'ref_moderate_anticipatory',
    name: 'Anticipatory Stress Response',
    category: 'Stress Pattern',
    description: 'Elevated electrodermal activity and moderate tachycardia preceding an impending stressor.',
    vector: {
      heart_rate: 0.60,
      rr_interval: 0.40,
      hrv_sdnn: 0.35,
      st_level: 0.55,
      r_amplitude: 0.58,
      gsr: 0.68,
      temperature: 0.52,
      perceived_stress: 0.65,
      fear_intensity: 0.40,
    },
  },
  {
    id: 'ref_phobia_situational',
    name: 'Specific Phobia Cue-Reactivity Pattern',
    category: 'Phobia-Related Pattern',
    description: 'Rapid, cue-elicited autonomic surge: sharp GSR drop/reactivity, tachycardia, and high reported fear intensity.',
    vector: {
      heart_rate: 0.82,
      rr_interval: 0.22,
      hrv_sdnn: 0.18,
      st_level: 0.62,
      r_amplitude: 0.68,
      gsr: 0.88,
      temperature: 0.60,
      perceived_stress: 0.85,
      fear_intensity: 0.90,
    },
  },
  {
    id: 'ref_sympathetic_panic_surge',
    name: 'Acute High-Arousal Panic-Like Surge',
    category: 'Arousal Surge',
    description: 'Extreme sympathetic hyperactivity, pronounced HRV suppression, and intense somatic distress feedback.',
    vector: {
      heart_rate: 0.92,
      rr_interval: 0.15,
      hrv_sdnn: 0.10,
      st_level: 0.68,
      r_amplitude: 0.75,
      gsr: 0.95,
      temperature: 0.70,
      perceived_stress: 0.95,
      fear_intensity: 0.95,
    },
  },
  {
    id: 'ref_social_evaluative_stress',
    name: 'Social-Evaluative Stress Pattern',
    category: 'Stress Pattern',
    description: 'Sustained electrodermal arousal and moderate cardiac acceleration in public or evaluative settings.',
    vector: {
      heart_rate: 0.68,
      rr_interval: 0.35,
      hrv_sdnn: 0.28,
      st_level: 0.54,
      r_amplitude: 0.60,
      gsr: 0.74,
      temperature: 0.55,
      perceived_stress: 0.75,
      fear_intensity: 0.60,
    },
  },
];

export const COMMON_PHOBIA_TRIGGERS = [
  'Heights (Acrophobia)',
  'Enclosed Spaces (Claustrophobia)',
  'Spiders / Insects (Arachnophobia)',
  'Needles / Injections (Trypanophobia)',
  'Public Speaking / Social Exposure',
  'Flying (Aerophobia)',
  'Crowds / Open Areas (Agoraphobia)',
  'Sudden Loud Noises / Alarms',
  'Medical / Dental Procedures',
  'Darkness / Unknown Environments',
  'Custom / Other Specific Trigger',
];

export const COMMON_SYMPTOMS_LIST = [
  'Palpitations / Rapid Heartbeat',
  'Sweating / Clammy Palms',
  'Shortness of Breath',
  'Trembling or Shaking',
  'Dizziness or Lightheadedness',
  'Chest Tightness',
  'Urge to Escape / Avoidance',
  'Dry Mouth',
];
