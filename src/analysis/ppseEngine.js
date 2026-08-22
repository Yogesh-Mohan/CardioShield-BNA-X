/**
 * ppseEngine.js
 *
 * Psycho-Physiological Similarity Engine (PPSE)
 *
 * Integrates:
 *   - Processed physiological feature vector (FeaturePipeline & NeuralSchema)
 *   - Personal baseline deviations
 *   - Subjective self-reported context (trigger, situation, stress, fear intensity, symptoms)
 *
 * Performs normalized cosine / euclidean similarity analysis against reference patterns.
 *
 * SAFETY & COMPLIANCE:
 * - This engine is a SOFTWARE DEMONSTRATION & RESEARCH PROTOTYPE ONLY.
 * - Does NOT provide medical, clinical, or psychiatric diagnoses.
 * - Does NOT diagnose phobias, anxiety disorders, or mental illness.
 * - Does NOT prescribe or recommend medications.
 */

import { PPSE_REFERENCE_PATTERNS } from './ppseReferenceData';

function clamp(v, min = 0, max = 1) {
  return Math.min(Math.max(v, min), max);
}

// Normalized weights for combined psycho-physiological vector
const FEATURE_WEIGHTS = {
  heart_rate: 0.18,
  rr_interval: 0.10,
  hrv_sdnn: 0.14,
  st_level: 0.08,
  r_amplitude: 0.06,
  gsr: 0.16,
  temperature: 0.08,
  perceived_stress: 0.10,
  fear_intensity: 0.10,
};

/**
 * Calculates weighted similarity between two normalized feature vectors [0..1].
 * Returns similarity percentage [0..100].
 */
function calculateWeightedSimilarity(vecA, vecB) {
  let weightedDistSq = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(FEATURE_WEIGHTS)) {
    const valA = vecA[key] ?? 0.5;
    const valB = vecB[key] ?? 0.5;
    const diff = valA - valB;
    weightedDistSq += weight * (diff * diff);
    totalWeight += weight;
  }

  const normalizedDist = Math.sqrt(weightedDistSq / totalWeight);
  // Convert distance (0..1) to similarity percentage (0..100)
  const similarity = clamp(1 - normalizedDist, 0, 1) * 100;
  return Math.round(similarity * 10) / 10;
}

export class PpseEngine {
  /**
   * Run similarity analysis combining live sensor + schema + user input.
   *
   * @param {Object} params
   * @param {Object} params.featureState - From useFeatureState()
   * @param {Object} params.schemaResult - From useSchemaResult()
   * @param {Object} params.userInput - { trigger, situation, perceivedStress (1..10), fearIntensity (1..10), duration, symptoms: [] }
   */
  static analyze({ featureState, schemaResult, userInput = {} }) {
    const features = featureState?.features || {};

    // 1. Build composite normalized vector (live physiological values + normalized user inputs)
    const normalizedStress = clamp((userInput.perceivedStress ?? 1) / 10, 0, 1);
    const normalizedFear = clamp((userInput.fearIntensity ?? 1) / 10, 0, 1);

    const liveVector = {
      heart_rate: features.heart_rate?.normalized ?? 0.3,
      rr_interval: features.rr_interval?.normalized ?? 0.6,
      hrv_sdnn: features.hrv_sdnn?.normalized ?? 0.6,
      st_level: features.st_level?.normalized ?? 0.5,
      r_amplitude: features.r_amplitude?.normalized ?? 0.5,
      gsr: features.gsr?.normalized ?? 0.2,
      temperature: features.temperature?.normalized ?? 0.5,
      perceived_stress: normalizedStress,
      fear_intensity: normalizedFear,
    };

    // 2. Personal baseline deviation from Neural Schema
    const baselineDeviationPct = schemaResult?.overallDeviation != null
      ? Math.round(schemaResult.overallDeviation * 100)
      : 0;

    // 3. Physiological Response Score (0..100) based on autonomic activation
    const hrNorm = liveVector.heart_rate;
    const gsrNorm = liveVector.gsr;
    const hrvInverted = 1 - liveVector.hrv_sdnn;
    const rawPhysioScore = (hrNorm * 0.4 + gsrNorm * 0.4 + hrvInverted * 0.2) * 100;
    const physiologicalResponseScore = Math.round(clamp(rawPhysioScore, 0, 100));

    // Stress Response Level categorization
    let stressResponseLevel = 'Low';
    if (physiologicalResponseScore > 75 || normalizedStress > 0.75) {
      stressResponseLevel = 'High';
    } else if (physiologicalResponseScore > 45 || normalizedStress > 0.45) {
      stressResponseLevel = 'Moderate';
    }

    // 4. Compare against all reference patterns
    const comparisons = PPSE_REFERENCE_PATTERNS.map((ref) => {
      const similarity = calculateWeightedSimilarity(liveVector, ref.vector);
      return {
        id: ref.id,
        name: ref.name,
        category: ref.category,
        description: ref.description,
        similarity,
      };
    }).sort((a, b) => b.similarity - a.similarity);

    const mostSimilar = comparisons[0] || null;
    const top3 = comparisons.slice(0, 3);

    // Specific phobia pattern similarity score
    const phobiaPatternRef = comparisons.find((c) => c.id === 'ref_phobia_situational');
    const phobiaSimilarityScore = phobiaPatternRef ? phobiaPatternRef.similarity : 0;

    // General stress pattern similarity score
    const generalStressRef = comparisons.find((c) => c.id === 'ref_moderate_anticipatory') || comparisons[0];
    const stressSimilarityScore = generalStressRef ? generalStressRef.similarity : 0;

    // 5. Determine Top Contributing Factors (Objective + Contextual)
    const contributingFactors = [];

    if (liveVector.heart_rate > 0.6) {
      contributingFactors.push('Heart-rate elevation (sympathetic autonomic arousal)');
    }
    if (liveVector.gsr > 0.55) {
      contributingFactors.push('GSR electrodermal reactivity (elevated sweat gland conductance)');
    }
    if (baselineDeviationPct > 30) {
      contributingFactors.push(`Deviation from personal baseline (${baselineDeviationPct}% shift)`);
    }
    if (liveVector.hrv_sdnn < 0.35) {
      contributingFactors.push('HRV vagal suppression (reduced beat-to-beat variability)');
    }
    if (userInput.trigger) {
      contributingFactors.push(`User-reported situational trigger: "${userInput.trigger}"`);
    }
    if (userInput.symptoms && userInput.symptoms.length > 0) {
      contributingFactors.push(`Reported somatic symptoms (${userInput.symptoms.length} items logged)`);
    }

    if (contributingFactors.length === 0) {
      contributingFactors.push('Physiological equilibrium near baseline (nominal parasympathetic tone)');
    }

    // 6. Generate Objective, Non-Diagnostic AI Explanation
    let aiExplanation = '';
    if (phobiaSimilarityScore >= 70 && normalizedFear >= 0.6) {
      aiExplanation = `High similarity (${phobiaSimilarityScore}%) observed with cue-elicited autonomic response patterns. The combination of reported trigger exposure ("${userInput.trigger || 'unspecified'}") with sympathetic cardiac and electrodermal shifts matches profile benchmarks for acute stimulus reactivity.`;
    } else if (stressResponseLevel === 'High' || stressSimilarityScore >= 65) {
      aiExplanation = `Elevated stress-response pattern detected (${stressSimilarityScore}% similarity to acute anticipatory stress reference). Significant electrodermal conductance and cardiac rate elevation observed relative to baseline.`;
    } else if (stressResponseLevel === 'Moderate') {
      aiExplanation = `Moderate physiological activation registered. Autonomic indicators demonstrate mild reactivity within normative workload response thresholds.`;
    } else {
      aiExplanation = `Physiological signals remain close to individual baseline norms with minimal autonomic stress indicators present.`;
    }

    return {
      timestamp: Date.now(),
      liveVector,
      stressResponseLevel,
      physiologicalResponseScore,
      stressSimilarityScore,
      phobiaSimilarityScore,
      baselineDeviationPct,
      mostSimilarPattern: mostSimilar,
      top3Patterns: top3,
      allComparisons: comparisons,
      contributingFactors,
      aiExplanation,
      trigger: userInput.trigger || 'None specified',
      situation: userInput.situation || 'Routine monitoring',
      perceivedStress: userInput.perceivedStress ?? 1,
      fearIntensity: userInput.fearIntensity ?? 1,
      symptoms: userInput.symptoms || [],
    };
  }
}
