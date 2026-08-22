/**
 * PacemakerSim.jsx — PACEMAKER SIMULATION (Step 11).
 *
 * Software-only educational simulation demonstrating how a system could
 * identify simulated cardiac rhythm concerns and enter a pacing workflow.
 *
 * SAFETY: This is ONLY an educational hackathon software simulation.
 *  - Does NOT generate electrical signals.
 *  - Does NOT control hardware.
 *  - Does NOT create a real pacemaker controller.
 *  - Does NOT connect to a human.
 *  - Does NOT provide clinical treatment recommendations.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSensor } from '../../data/SensorProvider';
import { useRiskResult } from '../../processing/useFeatureState';
import './PacemakerSim.css';

const PACING_MODES = {
  STANDBY: { label: 'STANDBY', cls: 'standby', desc: 'Monitoring rhythm — no pacing required' },
  DEMAND: { label: 'DEMAND PACING', cls: 'demand', desc: 'Simulated demand pacing — rate below threshold' },
  FIXED: { label: 'FIXED RATE', cls: 'fixed', desc: 'Simulated fixed-rate pacing — rhythm unstable' },
  OVERDRIVE: { label: 'OVERDRIVE', cls: 'overdrive', desc: 'Simulated overdrive suppression — tachyarrhythmia detected' },
};

function ts(ms) {
  return ms ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
}

export default function PacemakerSim() {
  const { reading, running } = useSensor();
  const risk = useRiskResult();
  const [simActive, setSimActive] = useState(false);
  const [mode, setMode] = useState('STANDBY');
  const [events, setEvents] = useState([]);
  const [pacingRate, setPacingRate] = useState(0);
  const intervalRef = useRef(null);

  const hr = reading?.heartRate ?? 72;
  const riskLevel = risk?.level ?? 'NORMAL';

  useEffect(() => {
    if (!simActive || !running) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      let newMode = 'STANDBY';
      let rate = 0;

      if (hr < 50) {
        newMode = 'FIXED';
        rate = 72;
      } else if (hr < 60) {
        newMode = 'DEMAND';
        rate = 65;
      } else if (hr > 150 && riskLevel === 'CRITICAL') {
        newMode = 'OVERDRIVE';
        rate = 100;
      }

      if (newMode !== mode) {
        setEvents(prev => [{
          id: `pace-${now}`,
          timestamp: now,
          fromMode: mode,
          toMode: newMode,
          hr,
          rate,
          riskLevel,
        }, ...prev].slice(0, 40));
      }

      setMode(newMode);
      setPacingRate(rate);
    }, 1500);

    return () => clearInterval(intervalRef.current);
  }, [simActive, running, hr, riskLevel, mode]);

  const handleStart = () => {
    setSimActive(true);
    setEvents([{
      id: `pace-init-${Date.now()}`,
      timestamp: Date.now(),
      fromMode: 'OFF',
      toMode: 'STANDBY',
      hr,
      rate: 0,
      riskLevel,
    }]);
  };

  const handleReset = () => {
    setSimActive(false);
    setMode('STANDBY');
    setPacingRate(0);
    setEvents([]);
    clearInterval(intervalRef.current);
  };

  const modeInfo = PACING_MODES[mode];

  return (
    <section className="pacemaker-sim">
      <div className="glass-panel pacemaker-main">
        <div className="pm-head">
          <div>
            <h3>PACEMAKER SIMULATION</h3>
            <p className="pm-sub">
              Educational software simulation
              <span className="demo-inline"> · NOT a real pacemaker · NO electrical output</span>
            </p>
          </div>
          <span className={`pm-mode-badge ${modeInfo.cls}`}>{modeInfo.label}</span>
        </div>

        <div className="sim-safety-banner">
          ⚠️ SOFTWARE SIMULATION ONLY — Does not generate electrical signals, control hardware, or connect to any human patient.
        </div>

        <div className="pm-status-row">
          <div className="pm-stat">
            <span className="pm-stat-label">Detected HR</span>
            <span className="pm-stat-val">{hr} <em>BPM</em></span>
          </div>
          <div className="pm-stat">
            <span className="pm-stat-label">Pacing Rate</span>
            <span className="pm-stat-val">{pacingRate > 0 ? pacingRate : '—'} <em>{pacingRate > 0 ? 'BPM' : ''}</em></span>
          </div>
          <div className="pm-stat">
            <span className="pm-stat-label">Risk State</span>
            <span className={`pm-stat-val level-${riskLevel.toLowerCase()}`}>{riskLevel}</span>
          </div>
          <div className="pm-stat">
            <span className="pm-stat-label">Sim Status</span>
            <span className="pm-stat-val">{simActive ? 'ACTIVE' : 'INACTIVE'}</span>
          </div>
        </div>

        <div className="pm-decision">
          <h4>Pacing Decision</h4>
          <p>{modeInfo.desc}</p>
          {mode !== 'STANDBY' && (
            <div className="pm-rhythm-viz">
              <div className="rhythm-bar">
                <span className="rhythm-label">Before (Intrinsic)</span>
                <div className="rhythm-wave">
                  {Array.from({ length: 20 }, (_, i) => (
                    <i key={i} style={{
                      height: `${20 + Math.sin(i * 0.8) * 15 + (mode === 'FIXED' ? Math.random() * 20 : 0)}%`,
                      animationDelay: `${i * 0.05}s`,
                    }} className="wave-bar intrinsic" />
                  ))}
                </div>
              </div>
              <div className="rhythm-bar">
                <span className="rhythm-label">After (Paced)</span>
                <div className="rhythm-wave">
                  {Array.from({ length: 20 }, (_, i) => (
                    <i key={i} style={{
                      height: `${35 + Math.sin(i * 0.5) * 8}%`,
                      animationDelay: `${i * 0.05}s`,
                    }} className="wave-bar paced" />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pm-controls">
          {!simActive ? (
            <button className="ctl-btn start" onClick={handleStart} disabled={!running}>
              ▶ START SIMULATION
            </button>
          ) : (
            <button className="ctl-btn pause" onClick={() => setSimActive(false)}>
              ❚❚ STOP
            </button>
          )}
          <button className="ctl-btn reset" onClick={handleReset}>↺ RESET</button>
          {!running && <span className="demo-inline">Start the sensor engine first</span>}
        </div>

        <div className="pm-timeline">
          <h4>Event Timeline</h4>
          {events.length === 0 ? (
            <div className="empty-hint">No pacing events yet. Start the simulation.</div>
          ) : (
            <div className="pm-events">
              {events.map(evt => (
                <div key={evt.id} className={`pm-event ${PACING_MODES[evt.toMode]?.cls || 'standby'}`}>
                  <span className="pm-evt-time">{ts(evt.timestamp)}</span>
                  <span className="pm-evt-transition">{evt.fromMode} → {evt.toMode}</span>
                  <span className="pm-evt-hr">HR: {evt.hr} BPM</span>
                  {evt.rate > 0 && <span className="pm-evt-rate">Pacing: {evt.rate} BPM</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="terminology-note">
          EDUCATIONAL SOFTWARE SIMULATION ONLY — No electrical signals, no hardware control, no patient connection.
        </p>
      </div>
    </section>
  );
}
