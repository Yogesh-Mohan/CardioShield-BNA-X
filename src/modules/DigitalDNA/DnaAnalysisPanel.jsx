/**
 * DnaAnalysisPanel.jsx — DIGITAL DNA ANALYSIS (Step 7).
 *
 * Table of every feature: raw · normalized · trend · contribution · status.
 * Time-based comparison: mini history bars per feature (last N states),
 * so users see how the Digital DNA representation changes over time.
 *
 * Digital DNA = data-driven representation of multidimensional physiological
 * signals. No claim is made that these features identify human DNA.
 */

import React from 'react';
import { useFeatureState } from '../../processing/useFeatureState';
import { getFeaturePipeline } from '../../processing/featurePipeline';
import { FEATURES } from '../../data/sensorSchema';
import './DnaAnalysisPanel.css';

const HISTORY_POINTS = 24;

function fmt(v, d) {
  return v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d);
}

/** Trend arrow from the last few pipeline states. */
function trendOf(history, featureId, idx) {
  if (history.length < 3) return { arrow: '·', cls: '' };
  const n = Math.min(6, history.length);
  const cur = history[history.length - 1].features[featureId].normalized;
  const past = history[history.length - n].features[featureId].normalized;
  const delta = cur - past;
  if (Math.abs(delta) < 0.01) return { arrow: '→', cls: 'flat' };
  return delta > 0 ? { arrow: '▲', cls: 'up' } : { arrow: '▼', cls: 'down' };
}

export default function DnaAnalysisPanel() {
  const state = useFeatureState();
  const history = getFeaturePipeline().stateHistory;

  return (
    <section className="dna-analysis">
      <div className="glass-panel analysis-table-panel">
        <div className="analysis-head">
          <h3>DIGITAL BNA ANALYSIS</h3>
          <span className="demo-inline">feature pipeline output · demo data</span>
        </div>

        {!state ? (
          <div className="empty-hint">
            Start the sensor engine — processed features will appear here.
          </div>
        ) : (
          <>
            <table className="analysis-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Raw</th>
                  <th>Normalized</th>
                  <th>Trend</th>
                  <th>Contribution</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f) => {
                  const feat = state.features[f.id];
                  const tr = trendOf(history, f.id);
                  const contribPct = Math.min(Math.abs(feat.contribution) / 0.35, 1) * 100;
                  return (
                    <tr key={f.id}>
                      <td className="cell-feature">
                        {feat.label}
                        <span className="cell-source">{feat.source}</span>
                      </td>
                      <td>{fmt(feat.raw, feat.decimals)} <em className="cell-unit">{feat.unit}</em></td>
                      <td>
                        <span className="norm-cell">
                          <i style={{ width: `${feat.normalized * 100}%` }} />
                        </span>
                        {fmt(feat.normalized, 2)}
                      </td>
                      <td><span className={`trend ${tr.cls}`}>{tr.arrow}</span></td>
                      <td>
                        <span className="contrib-cell">
                          <i
                            className={feat.contribution >= 0 ? 'pos' : 'neg'}
                            style={{ width: `${contribPct}%` }}
                          />
                        </span>
                        {feat.contribution > 0 ? '+' : ''}{fmt(feat.contribution, 3)}
                      </td>
                      <td>
                        <span className={`derived-status s-${feat.status.toLowerCase()}`}>{feat.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="time-compare">
              <h4>Time comparison <span className="demo-inline">— normalized value per reading (oldest → newest)</span></h4>
              <div className="time-strip">
                {FEATURES.map((f) => {
                  const recent = history.slice(-HISTORY_POINTS);
                  return (
                    <div key={f.id} className="time-row" title={f.label}>
                      <span className="time-label">{f.short}</span>
                      <div className="time-cells">
                        {recent.length === 0 && <span className="empty-hint-inline">collecting…</span>}
                        {recent.map((s, i) => (
                          <i
                            key={`${s.timestamp}-${i}`}
                            style={{
                              height: `${Math.max(s.features[f.id].normalized * 100, 4)}%`,
                              opacity: 0.35 + (i / Math.max(recent.length - 1, 1)) * 0.65,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
