/**
 * PpsePanel.jsx — PSYCHO-PHYSIOLOGICAL ANALYSIS (PPSE) MODULE
 *
 * Combines live physiological features, Neural Schema personal baseline,
 * and user-reported psychological trigger/context to calculate
 * normalized pattern similarities.
 *
 * STRICT SAFETY & COMPLIANCE:
 * - NO medical/psychiatric diagnosis ("You have phobia/anxiety").
 * - NO drug/prescription recommendation.
 * - Software demonstration & research modeling only.
 */

import React, { useState, useMemo } from 'react';
import { useFeatureState, useSchemaResult } from '../../processing/useFeatureState';
import { PpseEngine } from '../../analysis/ppseEngine';
import { COMMON_PHOBIA_TRIGGERS, COMMON_SYMPTOMS_LIST } from '../../analysis/ppseReferenceData';
import { saveSimulationEvent } from '../../services/healthDataService';
import './PpsePanel.css';

export default function PpsePanel() {
  const featureState = useFeatureState();
  const schemaResult = useSchemaResult();

  // User input states
  const [trigger, setTrigger] = useState('Heights (Acrophobia)');
  const [customTrigger, setCustomTrigger] = useState('');
  const [situation, setSituation] = useState('Standing on a 15th-floor glass balcony');
  const [perceivedStress, setPerceivedStress] = useState(7);
  const [fearIntensity, setFearIntensity] = useState(8);
  const [duration, setDuration] = useState('Past 10 minutes');
  const [selectedSymptoms, setSelectedSymptoms] = useState([
    'Palpitations / Rapid Heartbeat',
    'Sweating / Clammy Palms',
    'Urge to Escape / Avoidance',
  ]);

  // Saving / Firebase state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showMedicationNotice, setShowMedicationNotice] = useState(false);

  const activeTrigger = trigger === 'Custom / Other Specific Trigger' ? customTrigger : trigger;

  const toggleSymptom = (sym) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  // Run live PPSE calculation
  const analysis = useMemo(() => {
    return PpseEngine.analyze({
      featureState,
      schemaResult,
      userInput: {
        trigger: activeTrigger,
        situation,
        perceivedStress,
        fearIntensity,
        duration,
        symptoms: selectedSymptoms,
      },
    });
  }, [featureState, schemaResult, activeTrigger, situation, perceivedStress, fearIntensity, duration, selectedSymptoms]);

  const handleSaveToCloud = async () => {
    setSaving(true);
    try {
      await saveSimulationEvent('PPSE_ANALYSIS', {
        trigger: activeTrigger,
        situation,
        perceivedStress,
        fearIntensity,
        physiologicalResponseScore: analysis.physiologicalResponseScore,
        stressResponseLevel: analysis.stressResponseLevel,
        phobiaSimilarityScore: analysis.phobiaSimilarityScore,
        mostSimilarPatternName: analysis.mostSimilarPattern?.name,
        baselineDeviationPct: analysis.baselineDeviationPct,
        timestamp: Date.now(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to store PPSE event:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ppse-module">
      {/* Disclaimer Banner */}
      <div className="ppse-banner">
        <div className="banner-icon">ℹ</div>
        <div className="banner-text">
          <strong>Research & Mathematical Modeling Only — Not for Clinical Diagnostic Use</strong>
          <p>
            The Psycho-Physiological Similarity Engine evaluates mathematical correlation between autonomic bio-signals and reference profiles. It does not diagnose anxiety, phobias, or medical disorders, and does not prescribe treatments.
          </p>
        </div>
      </div>

      <div className="ppse-layout">
        {/* Left Column: Context / User Input Form */}
        <div className="glass-panel ppse-form-panel">
          <div className="panel-header">
            <h3>USER CONTEXT & TRIGGER LOG</h3>
            <span className="panel-badge">[ INPUT VECTOR ]</span>
          </div>

          <div className="form-group">
            <label>Observed / Potential Trigger</label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="ppse-select"
            >
              {COMMON_PHOBIA_TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {trigger === 'Custom / Other Specific Trigger' && (
              <input
                type="text"
                placeholder="Specify custom trigger context..."
                value={customTrigger}
                onChange={(e) => setCustomTrigger(e.target.value)}
                className="ppse-input mt-2"
              />
            )}
          </div>

          <div className="form-group">
            <label>Contextual Situation / Environment</label>
            <input
              type="text"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              className="ppse-input"
              placeholder="e.g., In elevator, public presentation..."
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <div className="label-with-val">
                <label>Perceived Stress</label>
                <span className="val-badge">{perceivedStress} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={perceivedStress}
                onChange={(e) => setPerceivedStress(Number(e.target.value))}
                className="ppse-slider"
              />
            </div>

            <div className="form-group">
              <div className="label-with-val">
                <label>Subjective Fear Intensity</label>
                <span className="val-badge val-fear">{fearIntensity} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={fearIntensity}
                onChange={(e) => setFearIntensity(Number(e.target.value))}
                className="ppse-slider slider-fear"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Episode Duration / Frequency</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="ppse-select"
            >
              <option value="Just initiated (< 2 mins)">Just initiated (&lt; 2 mins)</option>
              <option value="Past 10 minutes">Past 10 minutes</option>
              <option value="Sustained (> 30 mins)">Sustained (&gt; 30 mins)</option>
              <option value="Recurrent episodic">Recurrent episodic</option>
            </select>
          </div>

          <div className="form-group">
            <label>Self-Reported Somatic Sensations</label>
            <div className="symptoms-chip-grid">
              {COMMON_SYMPTOMS_LIST.map((sym) => {
                const active = selectedSymptoms.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    className={`symptom-chip ${active ? 'active' : ''}`}
                    onClick={() => toggleSymptom(sym)}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick presets for hackathon testing */}
          <div className="demo-presets-wrap">
            <span className="preset-label">Quick Test Presets:</span>
            <div className="preset-btns">
              <button
                type="button"
                className="preset-btn"
                onClick={() => {
                  setTrigger('Heights (Acrophobia)');
                  setSituation('Standing on high platform overlooking edge');
                  setPerceivedStress(8);
                  setFearIntensity(9);
                  setSelectedSymptoms([
                    'Palpitations / Rapid Heartbeat',
                    'Sweating / Clammy Palms',
                    'Dizziness or Lightheadedness',
                    'Urge to Escape / Avoidance',
                  ]);
                }}
              >
                Heights Trigger
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => {
                  setTrigger('Public Speaking / Social Exposure');
                  setSituation('Giving live presentation to evaluation panel');
                  setPerceivedStress(6);
                  setFearIntensity(5);
                  setSelectedSymptoms(['Palpitations / Rapid Heartbeat', 'Dry Mouth']);
                }}
              >
                Social Stress
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => {
                  setTrigger('Darkness / Unknown Environments');
                  setSituation('Sitting calmly in resting control state');
                  setPerceivedStress(2);
                  setFearIntensity(1);
                  setSelectedSymptoms([]);
                }}
              >
                Resting Baseline
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Similarity Analysis Results */}
        <div className="glass-panel ppse-results-panel">
          <div className="panel-header">
            <h3>PSYCHO-PHYSIOLOGICAL ANALYSIS</h3>
            <span className="panel-badge">[ SIMILARITY ENGINE ]</span>
          </div>

          {/* Primary Top Metric Cards */}
          <div className="ppse-metrics-grid">
            <div className="metric-box">
              <span className="m-label">Most Similar Pattern</span>
              <span className="m-val-text">{analysis.mostSimilarPattern?.name || 'Evaluating...'}</span>
              <span className="m-sub">{analysis.mostSimilarPattern?.category}</span>
            </div>

            <div className="metric-box">
              <span className="m-label">Phobia-Related Pattern Similarity</span>
              <span className={`m-val ${analysis.phobiaSimilarityScore > 70 ? 'val-high' : 'val-norm'}`}>
                {analysis.phobiaSimilarityScore}%
              </span>
              <span className="m-sub">Cue-reactivity vector correlation</span>
            </div>

            <div className="metric-box">
              <span className="m-label">Stress Response Level</span>
              <span className={`level-tag lvl-${analysis.stressResponseLevel.toLowerCase()}`}>
                {analysis.stressResponseLevel}
              </span>
              <span className="m-sub">Score: {analysis.physiologicalResponseScore}/100</span>
            </div>

            <div className="metric-box">
              <span className="m-label">Personal Baseline Deviation</span>
              <span className={`m-val ${analysis.baselineDeviationPct > 35 ? 'val-warn' : 'val-norm'}`}>
                +{analysis.baselineDeviationPct}%
              </span>
              <span className="m-sub">Neural Schema deviation index</span>
            </div>
          </div>

          {/* AI Explanation Section */}
          <div className="ppse-explanation-box">
            <h4>Synthesis & Pattern Correlation</h4>
            <p>{analysis.aiExplanation}</p>
            <p className="clinical-guidance">
              * Consider professional evaluation if this pattern is persistent, disruptive, or concerning.
            </p>
          </div>

          {/* Contributing Factors */}
          <div className="contributing-factors-section">
            <h4>Top Contributing Factors</h4>
            <ul className="factors-list">
              {analysis.contributingFactors.map((factor, i) => (
                <li key={i}>
                  <span className="factor-bullet">▸</span> {factor}
                </li>
              ))}
            </ul>
          </div>

          {/* Reference Pattern Comparison Table */}
          <div className="reference-comparison-section">
            <h4>Reference Pattern Comparison</h4>
            <div className="ref-table-wrap">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>Reference Benchmark</th>
                    <th>Category</th>
                    <th>Similarity</th>
                    <th>Correlation Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.top3Patterns.map((pat) => (
                    <tr key={pat.id} className={pat.id === analysis.mostSimilarPattern?.id ? 'row-highlight' : ''}>
                      <td className="pat-name">{pat.name}</td>
                      <td><span className="cat-badge">{pat.category}</span></td>
                      <td className="pat-score">{pat.similarity}%</td>
                      <td className="pat-bar-cell">
                        <div className="mini-bar-bg">
                          <div
                            className="mini-bar-fill"
                            style={{
                              width: `${pat.similarity}%`,
                              backgroundColor: pat.similarity > 75 ? '#ff4444' : pat.similarity > 50 ? '#ffaa00' : '#00e5ff',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions & Question Guide */}
          <div className="ppse-actions-row">
            <button
              type="button"
              className="ctl-btn start"
              onClick={handleSaveToCloud}
              disabled={saving}
            >
              {saving ? 'STORING...' : saveSuccess ? '✓ SNAPSHOT SAVED' : '☁ SAVE ANALYSIS SNAPSHOT'}
            </button>

            <button
              type="button"
              className="ctl-btn reset"
              onClick={() => setShowMedicationNotice((prev) => !prev)}
            >
              {showMedicationNotice ? 'HIDE GUIDELINES' : 'MEDICATION & INTERVENTION INQUIRY'}
            </button>
          </div>

          {showMedicationNotice && (
            <div className="medication-notice-box">
              <strong>Clinical & Medication Information Notice:</strong>
              <p>
                Medication decisions, pharmacological treatments, and clinical therapies should always be evaluated and managed by a qualified healthcare professional. CardioShield BNA-X is a computational simulation and does not prescribe or dispense medical guidance.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
