/**
 * RiskAnalysisPanel.jsx — AI-ASSISTED ANOMALY / RISK UI (Step 9).
 *
 * Shows: weighted anomaly score · NORMAL/WARNING/CRITICAL classification ·
 * confidence/strength · trend direction · triggering features ·
 * plain-language explanation · configurable DEMO thresholds.
 *
 * "AI-assisted physiological anomaly/risk prototype" — NOT a medical
 * diagnostic AI. All thresholds are DEMO/PROTOTYPE values.
 */

import React, { useState } from 'react';
import { useRiskResult } from '../../processing/useFeatureState';
import { getRiskEngine } from '../../analysis/riskEngine';
import './RiskAnalysisPanel.css';

function fmt(v, d = 2) {
  return v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d);
}

const LEVEL_META = {
  NORMAL: { cls: 'normal', label: 'NORMAL' },
  WARNING: { cls: 'warning', label: 'WARNING' },
  CRITICAL: { cls: 'critical', label: 'CRITICAL' },
};

/** Tiny inline sparkline for score history. */
function ScoreSpark({ values }) {
  if (!values || values.length < 2) return <div className="spark-empty">collecting…</div>;
  const pts = values.slice(-40);
  const max = Math.max(...pts, 0.001);
  const path = pts
    .map((v, i) => `${(i / (pts.length - 1)) * 100},${30 - (v / max) * 28}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="score-spark">
      <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function RiskAnalysisPanel() {
  const risk = useRiskResult();
  const [thresholds, setThresholds] = useState(() => ({ ...getRiskEngine().config }));

  const applyThresholds = (next) => {
    setThresholds(next);
    getRiskEngine().setThresholds(next);
  };

  const meta = LEVEL_META[risk?.level ?? 'NORMAL'];

  return (
    <section className="risk-analysis">
      <div className="glass-panel risk-main">
        <div className="risk-head">
          <div>
            <h3>AI ANOMALY / RISK ENGINE</h3>
            <p className="risk-sub">
              AI-assisted physiological anomaly/risk prototype
              <span className="demo-inline"> · not a medical diagnostic AI</span>
            </p>
          </div>
          <span className={`risk-badge ${meta.cls}`}>{meta.label}</span>
        </div>

        {!risk ? (
          <div className="empty-hint">
            Start the engine — the risk assessment will appear here.
          </div>
        ) : (
          <>
            <div className="score-block">
              <div className="score-row">
                <span className="score-label">ANOMALY SCORE</span>
                <span className={`score-value ${meta.cls}`}>
                  {Math.round(risk.score * 100)}%
                </span>
              </div>
              <div className="score-track">
                <i style={{ width: `${risk.score * 100}%` }} />
                <b style={{ left: `${risk.thresholds.warningThreshold * 100}%` }} title="warning threshold (demo)" />
                <b style={{ left: `${risk.thresholds.criticalThreshold * 100}%` }} title="critical threshold (demo)" />
              </div>
              <div className="score-meta">
                <span>Confidence/Strength: <strong>{Math.round(risk.confidence * 100)}%</strong></span>
                <span>Trend: <strong className={risk.trend === 'rising' ? 't-up' : risk.trend === 'falling' ? 't-down' : ''}>
                  {risk.trend === 'rising' ? '▲ rising' : risk.trend === 'falling' ? '▼ falling' : '→ stable'}
                </strong></span>
                {!risk.baselineReady && <span className="baseline-warn">baseline still learning</span>}
              </div>
            </div>

            <ScoreSpark values={risk.scoreHistory} />

            <div className="triggers-block">
              <h4>Triggering features</h4>
              <div className="trigger-list">
                {risk.triggers.map((t) => (
                  <div key={t.id} className="trigger-item">
                    <span className="trigger-name">{t.label}</span>
                    <div className="trigger-bar">
                      <i style={{ width: `${Math.min(t.deviation / 1.2, 1) * 100}%` }} />
                    </div>
                    <span className="trigger-val">{fmt(t.deviation)}</span>
                    <span className={`trigger-dir dir-${t.direction}`}>
                      {t.direction === 'above' ? '+' : t.direction === 'below' ? '−' : '·'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="explanation-box">
              <span className="explanation-tag">EXPLAINABILITY</span>
              <p>{risk.explanation}</p>
            </div>

            <div className="threshold-controls">
              <h4>Demo thresholds</h4>
              <label>
                WARNING
                <input
                  type="range" min="0.05" max="0.8" step="0.01"
                  value={thresholds.warningThreshold}
                  onChange={(e) => applyThresholds({
                    ...thresholds,
                    warningThreshold: Math.min(Number(e.target.value), thresholds.criticalThreshold - 0.05),
                  })}
                />
                <em>{Math.round(thresholds.warningThreshold * 100)}%</em>
              </label>
              <label>
                CRITICAL
                <input
                  type="range" min="0.15" max="0.95" step="0.01"
                  value={thresholds.criticalThreshold}
                  onChange={(e) => applyThresholds({
                    ...thresholds,
                    criticalThreshold: Math.max(Number(e.target.value), thresholds.warningThreshold + 0.05),
                  })}
                />
                <em>{Math.round(thresholds.criticalThreshold * 100)}%</em>
              </label>
              <span className="demo-inline">prototype thresholds · not medical guidance</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
