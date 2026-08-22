/**
 * EmergencyPanel.jsx — EMERGENCY MONITORING UI (Step 10).
 *
 * Shows: current level · score · triggering features · trend ·
 * event timeline · simulated alert banner · manual demo trigger.
 *
 * SAFETY: software demonstration ONLY.
 *  - No real emergency calls are sent.
 *  - No hospitals / contacts are contacted.
 *  - No medical devices are controlled.
 *  - No electrical stimulation is generated.
 */

import React, { useState } from 'react';
import { useEmergencyResult, useRiskResult } from '../../processing/useFeatureState';
import { getEmergencyEngine, EmergencyEngine } from '../../analysis/emergencyEngine';
import './EmergencyPanel.css';

function ts(millis) {
  if (!millis) return '—';
  const d = new Date(millis);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const LEVEL_CLS = { NORMAL: 'lvl-normal', WARNING: 'lvl-warning', CRITICAL: 'lvl-critical' };

export default function EmergencyPanel() {
  const emergency = useEmergencyResult();
  const risk = useRiskResult();
  const [simCount, setSimCount] = useState(0);

  const level = emergency?.level ?? risk?.level ?? 'NORMAL';
  const score = emergency?.score ?? risk?.score ?? 0;
  const events = emergency?.events ?? [];

  const handleSimulate = () => {
    getEmergencyEngine().simulateEmergency();
    setSimCount((c) => c + 1);
  };

  return (
    <section className="emergency-panel">
      <div className="glass-panel emergency-main">
        <div className="emergency-head">
          <div>
            <h3>EMERGENCY MONITORING</h3>
            <p className="emergency-sub">
              Automated workflow from AI risk state
              <span className="demo-inline"> · software demo only · no real alerts</span>
            </p>
          </div>
          <span className={`level-badge ${LEVEL_CLS[level]}`}>{level}</span>
        </div>

        {/* Alert Banner */}
        {emergency?.alertActive && (
          <div className="alert-banner">
            <span className="alert-icon">🚨</span>
            <div>
              <strong>SIMULATED ALERT ACTIVE — {emergency.alertId}</strong>
              <p>This is a software demonstration. No real notifications were sent.</p>
            </div>
          </div>
        )}

        {/* Status row */}
        <div className="status-row">
          <div className="status-cell">
            <span className="status-label">Risk Score</span>
            <span className={`status-val ${LEVEL_CLS[level]}`}>{Math.round(score * 100)}%</span>
          </div>
          <div className="status-cell">
            <span className="status-label">Trend</span>
            <span className="status-val">
              {emergency?.trend === 'rising' ? '▲ Rising' : emergency?.trend === 'falling' ? '▼ Falling' : '→ Stable'}
            </span>
          </div>
          <div className="status-cell">
            <span className="status-label">Events</span>
            <span className="status-val">{events.length}</span>
          </div>
        </div>

        {/* Triggering features */}
        {emergency?.triggeringFeatures?.length > 0 && (
          <div className="trigger-section">
            <h4>Triggering Features</h4>
            <div className="trigger-chips">
              {emergency.triggeringFeatures.map((f) => (
                <span key={f.id} className="trigger-chip">
                  {f.label}
                  <em>{f.direction === 'above' ? '↑' : '↓'} {Math.round(f.deviation * 100)}%</em>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Manual demo trigger */}
        <div className="demo-controls">
          <button className="simulate-btn" onClick={handleSimulate}>
            🚨 SIMULATE EMERGENCY
          </button>
          <span className="demo-inline">
            Demo control — logs a synthetic CRITICAL event to the timeline (no real action)
          </span>
        </div>

        {/* Event Timeline */}
        <div className="timeline-section">
          <h4>Event Timeline</h4>
          {events.length === 0 ? (
            <div className="empty-hint">
              No emergency events yet. Switch to ABNORMAL or CRITICAL scenario, or use the simulate button.
            </div>
          ) : (
            <div className="timeline-list">
              {[...events].reverse().map((evt) => (
                <div key={evt.id} className={`timeline-item ${LEVEL_CLS[evt.state]}`}>
                  <div className="tl-time">{ts(evt.timestamp)}</div>
                  <div className="tl-body">
                    <span className={`tl-type type-${evt.eventType.toLowerCase()}`}>
                      {evt.eventType.replace(/_/g, ' ')}
                    </span>
                    <span className="tl-state">{evt.prevState} → {evt.state}</span>
                    {evt.score != null && (
                      <span className="tl-score">Score: {Math.round(evt.score * 100)}%</span>
                    )}
                    <span className="tl-features">
                      {EmergencyEngine.featureNames(evt)}
                    </span>
                    {evt.note && <p className="tl-note">{evt.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="terminology-note">
          SOFTWARE DEMONSTRATION ONLY — no real emergency calls, hospital contacts, medical device control, or electrical stimulation.
        </p>
      </div>
    </section>
  );
}
