/**
 * analysisStore.js — THE single data-flow spine of the app.
 *
 * Subscribes ONCE to the sensor engine and runs the full chain per reading:
 *
 *   canonical reading
 *     → FeaturePipeline.process        (Step 7)
 *     → NeuralSchemaEngine.update      (Step 8)
 *     → RiskEngine.assess              (Step 9)
 *     → notify listeners               (Steps 6–10 UIs)
 *
 * One subscription ⇒ no double-processing, identical data everywhere.
 */

import { getSensorEngine } from '../data/engineSingleton';
import { getFeaturePipeline } from './featurePipeline';
import { getNeuralSchema } from '../analysis/neuralSchema';
import { getRiskEngine } from '../analysis/riskEngine';
import { getEmergencyEngine } from '../analysis/emergencyEngine';

const listeners = new Set();
let initialized = false;

function runChain(reading) {
  const featureState = getFeaturePipeline().process(reading);
  const schemaResult = getNeuralSchema().update(featureState);
  const riskResult = getRiskEngine().assess(schemaResult);
  const emergencyResult = getEmergencyEngine().update(riskResult);
  for (const fn of listeners) fn({ featureState, schemaResult, riskResult, emergencyResult });
}

/** Idempotent — safe to call from any module before subscribing. */
export function ensureAnalysisStore() {
  if (initialized) return;
  initialized = true;
  getSensorEngine().onReading(runChain);
}

export function subscribeAnalysis(fn) {
  ensureAnalysisStore();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAnalysisSnapshot() {
  return {
    featureState: getFeaturePipeline().lastState,
    schemaResult: getNeuralSchema().lastResult,
    riskResult: getRiskEngine().lastResult,
    emergencyResult: getEmergencyEngine().lastResult,
  };
}

/** Reset every downstream layer (used by engine RESET). */
export function resetAnalysisChain() {
  getFeaturePipeline().reset();
  getNeuralSchema().reset();
  getRiskEngine().reset();
  getEmergencyEngine().reset();
}
