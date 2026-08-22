/**
 * TreatmentSim.jsx — ALPHA/BETA/GAMMA TREATMENT SIMULATOR (Step 14).
 *
 * Software-only mathematical simulation for hackathon demonstration.
 *
 * IMPORTANT:
 *  - NOT a radiation device.
 *  - NOT a clinical treatment planner.
 *  - NOT a real radiation calculation system.
 *  - Does NOT provide real treatment recommendations.
 *  - Does NOT calculate real-world radiation doses.
 *
 * Purpose: Demonstrate mathematical modeling and visualization.
 */

import React, { useState, useMemo } from 'react';
import './TreatmentSim.css';

const SCENARIOS = {
  alpha: {
    label: 'Alpha Protocol',
    color: '#00e5ff',
    desc: 'Low-energy, high-precision simulated response model',
    defaultParams: { intensity: 0.6, duration: 5, sensitivity: 0.5 },
    fn: (t, p) => p.intensity * (1 - Math.exp(-t / p.duration)) * Math.exp(-p.sensitivity * t * 0.05),
  },
  beta: {
    label: 'Beta Protocol',
    color: '#ff6600',
    desc: 'Medium-energy, broad-range simulated response model',
    defaultParams: { intensity: 0.8, duration: 8, sensitivity: 0.3 },
    fn: (t, p) => p.intensity * (1 - Math.exp(-t / (p.duration * 0.5))) * (1 / (1 + Math.exp((t - p.duration * 1.5) * p.sensitivity))),
  },
  gamma: {
    label: 'Gamma Protocol',
    color: '#ff4444',
    desc: 'High-energy, rapid-decay simulated response model',
    defaultParams: { intensity: 1.0, duration: 3, sensitivity: 0.7 },
    fn: (t, p) => p.intensity * Math.pow(t / p.duration, 1.5) * Math.exp(-(t / p.duration) * p.sensitivity * 2),
  },
};

function generateCurve(fn, params, points = 60, tMax = 20) {
  const data = [];
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * tMax;
    data.push({ t, v: Math.max(0, fn(t, params)) });
  }
  return data;
}

function MiniGraph({ curves, height = 180 }) {
  const maxV = Math.max(0.01, ...curves.flatMap(c => c.data.map(d => d.v)));
  const tMax = Math.max(...curves.flatMap(c => c.data.map(d => d.t)));

  return (
    <svg viewBox={`0 0 400 ${height}`} className="treatment-graph" preserveAspectRatio="none">
      {/* Grid */}
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={0} y1={height * (1 - f)} x2={400} y2={height * (1 - f)} stroke="rgba(255,255,255,0.06)" />
      ))}
      {curves.map((curve, ci) => {
        const path = curve.data
          .map((d, i) => `${i === 0 ? 'M' : 'L'} ${(d.t / tMax) * 400},${height - (d.v / maxV) * (height - 10)}`)
          .join(' ');
        return <path key={ci} d={path} fill="none" stroke={curve.color} strokeWidth="2.5" opacity="0.9" />;
      })}
    </svg>
  );
}

export default function TreatmentSim() {
  const [activeScenarios, setActiveScenarios] = useState(['alpha']);
  const [params, setParams] = useState(() =>
    Object.fromEntries(Object.entries(SCENARIOS).map(([k, v]) => [k, { ...v.defaultParams }]))
  );

  const toggleScenario = (id) => {
    setActiveScenarios(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const updateParam = (scenario, key, value) => {
    setParams(prev => ({ ...prev, [scenario]: { ...prev[scenario], [key]: value } }));
  };

  const curves = useMemo(() =>
    activeScenarios.map(id => ({
      id,
      color: SCENARIOS[id].color,
      data: generateCurve(SCENARIOS[id].fn, params[id]),
    })),
    [activeScenarios, params]
  );

  const peakValues = useMemo(() =>
    Object.fromEntries(
      Object.entries(SCENARIOS).map(([id, sc]) => {
        const curve = generateCurve(sc.fn, params[id]);
        const peak = Math.max(...curve.map(d => d.v));
        const peakT = curve.find(d => d.v === peak)?.t ?? 0;
        const auc = curve.reduce((acc, d, i, arr) => {
          if (i === 0) return 0;
          return acc + ((arr[i - 1].v + d.v) / 2) * (d.t - arr[i - 1].t);
        }, 0);
        return [id, { peak, peakT, auc }];
      })
    ),
    [params]
  );

  return (
    <section className="treatment-sim">
      <div className="glass-panel treatment-main">
        <div className="treat-head">
          <div>
            <h3>TREATMENT SIMULATION</h3>
            <p className="treat-sub">
              Mathematical response modeling
              <span className="demo-inline"> · Research simulation — NOT for clinical use</span>
            </p>
          </div>
        </div>

        <div className="sim-safety-banner">
          ⚠️ RESEARCH / MATHEMATICAL SIMULATION — Not a radiation device, not a clinical treatment planner, not for patient use.
        </div>

        <div className="treat-scenarios">
          {Object.entries(SCENARIOS).map(([id, sc]) => (
            <button
              key={id}
              className={`treat-scenario-btn ${activeScenarios.includes(id) ? 'active' : ''}`}
              style={{ '--sc-color': sc.color }}
              onClick={() => toggleScenario(id)}
            >
              <span className="sc-dot" />
              {sc.label}
            </button>
          ))}
        </div>

        <div className="treat-graph-section">
          <h4>Simulated Response Curves</h4>
          {curves.length === 0 ? (
            <div className="empty-hint">Select at least one protocol to view the response curve.</div>
          ) : (
            <MiniGraph curves={curves} />
          )}
        </div>

        <div className="treat-params-grid">
          {Object.entries(SCENARIOS).map(([id, sc]) => (
            <div key={id} className="glass-panel treat-param-card" style={{ '--sc-color': sc.color }}>
              <h4 style={{ color: sc.color }}>{sc.label}</h4>
              <p className="param-desc">{sc.desc}</p>

              <label>
                Intensity: <strong>{params[id].intensity.toFixed(2)}</strong>
                <input type="range" min="0.1" max="1.5" step="0.05"
                  value={params[id].intensity}
                  onChange={(e) => updateParam(id, 'intensity', Number(e.target.value))}
                />
              </label>
              <label>
                Duration: <strong>{params[id].duration.toFixed(1)}</strong>
                <input type="range" min="1" max="15" step="0.5"
                  value={params[id].duration}
                  onChange={(e) => updateParam(id, 'duration', Number(e.target.value))}
                />
              </label>
              <label>
                Sensitivity: <strong>{params[id].sensitivity.toFixed(2)}</strong>
                <input type="range" min="0.1" max="1.0" step="0.05"
                  value={params[id].sensitivity}
                  onChange={(e) => updateParam(id, 'sensitivity', Number(e.target.value))}
                />
              </label>

              <div className="param-stats">
                <span>Peak: {peakValues[id].peak.toFixed(3)} @ t={peakValues[id].peakT.toFixed(1)}</span>
                <span>AUC: {peakValues[id].auc.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="treat-compare glass-panel">
          <h4>Scenario Comparison</h4>
          <table className="compare-table">
            <thead>
              <tr><th>Protocol</th><th>Peak Response</th><th>Peak Time</th><th>AUC (Total Effect)</th><th>Intensity</th><th>Duration</th></tr>
            </thead>
            <tbody>
              {Object.entries(SCENARIOS).map(([id, sc]) => (
                <tr key={id}>
                  <td style={{ color: sc.color }}>{sc.label}</td>
                  <td>{peakValues[id].peak.toFixed(3)}</td>
                  <td>{peakValues[id].peakT.toFixed(1)}s</td>
                  <td>{peakValues[id].auc.toFixed(2)}</td>
                  <td>{params[id].intensity.toFixed(2)}</td>
                  <td>{params[id].duration.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="terminology-note">
          RESEARCH / MATHEMATICAL SIMULATION — No real-world doses, no patient treatment, no clinical recommendations.
        </p>
      </div>
    </section>
  );
}
