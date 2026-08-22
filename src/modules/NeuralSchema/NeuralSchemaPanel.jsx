/**
 * NeuralSchemaPanel.jsx — NEURAL SCHEMA UI (Step 8).
 *
 * Shows: personal baseline vs current state · feature deviations ·
 * overall deviation · trend · dominant contributing features.
 * Consumes the shared analysis store — same data the AI engine uses.
 *
 * Neural Schema = software representation of physiological patterns.
 * It does NOT read brain activity or extract biological neural structure.
 */

import React from 'react';
import { useSchemaResult } from '../../processing/useFeatureState';
import { FEATURES } from '../../data/sensorSchema';
import './NeuralSchemaPanel.css';

function fmt(v, d = 3) {
  return v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d);
}

const TREND_LABEL = {
  rising: { text: '▲ RISING', cls: 'up' },
  falling: { text: '▼ FALLING', cls: 'down' },
  stable: { text: '→ STABLE', cls: 'flat' },
};

export default function NeuralSchemaPanel() {
  const schema = useSchemaResult();

  return (
    <section className="neural-schema">
      <div className="glass-panel schema-main">
        <div className="schema-head">
          <div>
            <h3>NEURAL SCHEMA</h3>
            <p className="schema-sub">
              Personal physiological pattern layer
              <span className="demo-inline"> · software pattern model</span>
            </p>
          </div>
          <span className={`trend-chip ${TREND_LABEL[schema?.trend ?? 'stable'].cls}`}>
            {TREND_LABEL[schema?.trend ?? 'stable'].text}
          </span>
        </div>

        {!schema ? (
          <div className="empty-hint">
            Start the engine in NORMAL scenario to learn the personal baseline.
          </div>
        ) : (
          <>
            <div className="baseline-status">
              <span className={`baseline-pill ${schema.baselineReady ? 'ready' : 'learning'}`}>
                {schema.baselineReady
                  ? `BASELINE LOCKED · ${schema.baselineSamples} samples`
                  : `LEARNING BASELINE · ${schema.baselineSamples}/8 samples`}
              </span>
              <span className="demo-inline">learned from NORMAL demo scenario</span>
            </div>

            <div className="deviation-gauge-wrap">
              <div className="gauge-labels">
                <span>OVERALL DEVIATION</span>
                <span className="gauge-value">{Math.round(schema.overallDeviation * 100)}%</span>
              </div>
              <div className="deviation-gauge">
                <i style={{ width: `${schema.overallDeviation * 100}%` }} />
                <b className="gauge-mark warn" style={{ left: '25%' }} title="warning band" />
                <b className="gauge-mark crit" style={{ left: '55%' }} title="critical band" />
              </div>
            </div>

            <div className="deviation-rows">
              {FEATURES.map((f) => {
                const d = schema.deviations[f.id];
                return (
                  <div key={f.id} className="deviation-row">
                    <span className="dev-name">{f.short}</span>
                    <div className="dev-bars">
                      <div className="dev-bar baseline" title="baseline mean">
                        <i style={{ left: `${(d.baselineMean ?? 0) * 100}%` }} />
                      </div>
                      <div className="dev-bar current" title="current value">
                        <i style={{ left: `${d.normalized * 100}%` }} />
                      </div>
                    </div>
                    <span className={`dev-dir dir-${d.direction}`}>
                      {d.direction === 'above' ? '+' : d.direction === 'below' ? '−' : '·'}
                    </span>
                    <span className="dev-val">{fmt(d.deviation, 2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="dominant-block">
              <h4>Dominant contributors</h4>
              <div className="dominant-list">
                {schema.dominant.map((id, i) => {
                  const f = FEATURES.find((x) => x.id === id);
                  const d = schema.deviations[id];
                  return (
                    <span key={id} className={`dominant-tag rank-${i + 1}`}>
                      {f.short} · {Math.round(d.deviation * 100)}%
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        )}
        <p className="terminology-note">
          Neural Schema = software representation of physiological patterns (not brain-activity recording).
        </p>
      </div>
    </section>
  );
}
