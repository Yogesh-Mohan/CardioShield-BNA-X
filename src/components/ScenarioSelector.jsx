/**
 * ScenarioSelector.jsx — shared demo-scenario switcher (Steps 4–10).
 * Switching here propagates through: sensors → features → Digital DNA →
 * Neural Schema → AI → Emergency. Pure UI; state lives in SensorProvider.
 */

import React from 'react';
import { useSensor } from '../data/SensorProvider';
import './ScenarioSelector.css';

const SEVERITY_COLORS = ['var(--ok)', 'var(--warn)', 'var(--warn)', 'var(--bad)'];

export default function ScenarioSelector({ compact = false }) {
  const { scenario, setScenario, scenariosMeta, dataMode, reading, rtdbConnected } = useSensor();

  if (dataMode === 'REALTIME_FIREBASE') {
    const hr = reading?.heartRate ?? 75;
    const gsr = reading?.gsr ?? 3.5;
    const liveCondition = hr > 125 ? 'CRITICAL TACHYCARDIA' : hr > 100 || gsr < 2.5 ? 'ELEVATED STRESS' : hr < 55 ? 'BRADYCARDIA' : 'PHYSIOLOGICAL NOMINAL';
    const liveColor = hr > 125 ? 'var(--bad)' : hr > 100 || gsr < 2.5 ? 'var(--warn)' : 'var(--ok)';

    return (
      <div className={`scenario-selector ${compact ? 'compact' : ''}`}>
        <div className="scenario-head">
          <span className="scenario-title">LIVE TELEMETRY STREAM</span>
          <span className="demo-inline" style={{ color: rtdbConnected ? 'var(--ok)' : 'var(--warn)' }}>
            ● {rtdbConnected ? 'FIREBASE RTDB ACTIVE' : 'WAITING FOR HARDWARE'}
          </span>
        </div>
        <div className="scenario-options live-active-box" style={{ borderColor: liveColor }}>
          <div className="live-status-pill" style={{ color: liveColor }}>
            CURRENT PATIENT STATE: {liveCondition}
          </div>
        </div>
        <p className="scenario-blurb">
          Telemetry is auto-classified live from hardware sensors (AD8232, MAX30102, GSR, DHT11) via Firebase Realtime Database.
        </p>
      </div>
    );
  }

  return (
    <div className={`scenario-selector ${compact ? 'compact' : ''}`}>
      <div className="scenario-head">
        <span className="scenario-title">DEMO SCENARIO</span>
        <span className="demo-inline">simulated · not clinical</span>
      </div>
      <div className="scenario-options" role="tablist">
        {scenariosMeta.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={scenario === s.id}
            className={`scenario-btn ${scenario === s.id ? 'active' : ''}`}
            style={{ '--sev': SEVERITY_COLORS[s.severity] }}
            onClick={() => setScenario(s.id)}
            title={s.blurb}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="scenario-blurb">
        {scenariosMeta.find((s) => s.id === scenario)?.blurb}
      </p>
    </div>
  );
}
