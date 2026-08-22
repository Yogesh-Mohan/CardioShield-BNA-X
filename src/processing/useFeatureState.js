/**
 * useAnalysis.js — React bindings for the analysis chain (Steps 7–9).
 *
 * useFeatureState() → processed feature state (Step 7)
 * useSchemaResult() → Neural Schema result (Step 8)
 * useRiskResult()   → AI risk assessment (Step 9)
 *
 * All three subscribe to THE analysisStore — one chain run per reading,
 * identical data in every panel.
 */

import { useEffect, useState } from 'react';
import {
  subscribeAnalysis, getAnalysisSnapshot, resetAnalysisChain as _resetChain,
} from './analysisStore';

function useAnalysisSlice(selector) {
  const [slice, setSlice] = useState(() => selector(getAnalysisSnapshot()));
  useEffect(() => {
    const unsub = subscribeAnalysis((snap) => setSlice(selector(snap)));
    return unsub;
    // selector is a stable module-level function per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return slice;
}

export function useFeatureState() {
  return useAnalysisSlice((s) => s.featureState);
}

export function useSchemaResult() {
  return useAnalysisSlice((s) => s.schemaResult);
}

export function useRiskResult() {
  return useAnalysisSlice((s) => s.riskResult);
}

export function useEmergencyResult() {
  return useAnalysisSlice((s) => s.emergencyResult);
}

/** Reset every downstream layer (used by engine RESET). */
export function resetAnalysisChain() {
  _resetChain();
}
