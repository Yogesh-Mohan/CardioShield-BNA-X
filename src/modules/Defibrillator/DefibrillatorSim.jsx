/**
 * DefibrillatorSim.jsx — DEFIBRILLATOR SIMULATION (Step 12).
 *
 * Software-only educational simulation demonstrating a hypothetical
 * emergency defibrillation workflow using simulated data.
 *
 * SAFETY:
 *  - Does NOT generate electrical output.
 *  - Does NOT control a real defibrillator.
 *  - Does NOT create a real shock circuit.
 *  - Does NOT connect to hardware.
 *  - Does NOT provide real clinical instructions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSensor } from '../../data/SensorProvider';
import { useRiskResult, useEmergencyResult } from '../../processing/useFeatureState';
import './DefibrillatorSim.css';

const PHASES = {
  IDLE: { label: 'STANDBY', cls: 'idle', desc: 'System monitoring — no intervention required' },
  ANALYZING: { label: 'ANALYZING RHYTHM', cls: 'analyzing', desc: 'Simulated rhythm analysis in progress...' },
  CHARGING: { label: 'CHARGING', cls: 'charging', desc: 'Simulated energy charging — abstract parameter' },
  READY: { label: 'SHOCK READY', cls: 'ready', desc: 'Simulated shock ready — awaiting operator confirmation' },
  DELIVERED: { label: 'SHOCK DELIVERED', cls: 'delivered', desc: 'Simulated intervention event logged' },
  RECOVERY: { label: 'POST-SHOCK MONITOR', cls: 'recovery', desc: 'Simulated recovery monitoring phase' },
};

function ts(ms) {
  return ms ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
}

export default function DefibrillatorSim() {
  const { reading, running } = useSensor();
  const risk = useRiskResult();
  const emergency = useEmergencyResult();
  const [phase, setPhase] = useState('IDLE');
  const [energy, setEnergy] = useState(0);
  const [shockCount, setShockCount] = useState(0);
  const [events, setEvents] = useState([]);
  const [simActive, setSimActive] = useState(false);
  const timerRef = useRef(null);

  const hr = reading?.heartRate ?? 72;
  const riskLevel = risk?.level ?? 'NORMAL';
  const emergencyLevel = emergency?.level ?? 'NORMAL';

  const addEvent = (type, detail) => {
    setEvents(prev => [{
      id: `defib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(), type, detail, hr, riskLevel, phase,
    }, ...prev].slice(0, 40));
  };

  const startAnalysis = () => {
    if (!running) return;
    setSimActive(true);
    setPhase('ANALYZING');
    addEvent('ANALYSIS_START', 'Simulated rhythm analysis initiated');

    timerRef.current = setTimeout(() => {
      const shockable = hr > 140 || riskLevel === 'CRITICAL';
      if (shockable) {
        setPhase('CHARGING');
        addEvent('RHYTHM_DETECTED', 'Shockable rhythm detected (simulation)');
        let e = 0;
        const chargeInterval = setInterval(() => {
          e += 25;
          setEnergy(e);
          if (e >= 200) {
            clearInterval(chargeInterval);
            setPhase('READY');
            addEvent('CHARGE_COMPLETE', `Simulated energy parameter: ${e}J (abstract)`);
          }
        }, 300);
      } else {
        setPhase('IDLE');
        addEvent('NO_SHOCK', 'Non-shockable rhythm — no intervention (simulation)');
        setSimActive(false);
      }
    }, 2000);
  };

  const deliverShock = () => {
    setPhase('DELIVERED');
    setShockCount(c => c + 1);
    addEvent('SHOCK_DELIVERED', `Simulated intervention #${shockCount + 1} — energy: ${energy}J (abstract, no real output)`);

    setTimeout(() => {
      setPhase('RECOVERY');
      setEnergy(0);
      addEvent('RECOVERY_START', 'Simulated post-intervention monitoring');
    }, 1500);

    setTimeout(() => {
      setPhase('IDLE');
      setSimActive(false);
      addEvent('RECOVERY_COMPLETE', 'Simulated recovery complete — returning to standby');
    }, 5000);
  };

  const handleReset = () => {
    clearTimeout(timerRef.current);
    setPhase('IDLE');
    setEnergy(0);
    setShockCount(0);
    setEvents([]);
    setSimActive(false);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const phaseInfo = PHASES[phase];

  return (
    <section className="defib-sim">
      <div className="glass-panel defib-main">
        <div className="defib-head">
          <div>
            <h3>DEFIBRILLATOR SIMULATION</h3>
            <p className="defib-sub">
              Educational software simulation
              <span className="demo-inline"> · NO electrical output · NO real defibrillator</span>
            </p>
          </div>
          <span className={`defib-phase-badge ${phaseInfo.cls}`}>{phaseInfo.label}</span>
        </div>

        <div className="sim-safety-banner">
          ⚠️ SOFTWARE SIMULATION ONLY — Does not generate electrical output, control real devices, or create shock circuits.
        </div>

        <div className="defib-status-row">
          <div className="defib-stat">
            <span className="defib-stat-label">Detected HR</span>
            <span className="defib-stat-val">{hr} <em>BPM</em></span>
          </div>
          <div className="defib-stat">
            <span className="defib-stat-label">Energy (Abstract)</span>
            <span className="defib-stat-val">{energy > 0 ? energy : '—'} <em>{energy > 0 ? 'J' : ''}</em></span>
          </div>
          <div className="defib-stat">
            <span className="defib-stat-label">Shock Count</span>
            <span className="defib-stat-val">{shockCount}</span>
          </div>
          <div className="defib-stat">
            <span className="defib-stat-label">Emergency State</span>
            <span className={`defib-stat-val level-${emergencyLevel.toLowerCase()}`}>{emergencyLevel}</span>
          </div>
        </div>

        <div className="defib-workflow">
          <h4>Workflow Status</h4>
          <p className="workflow-desc">{phaseInfo.desc}</p>

          {phase === 'CHARGING' && (
            <div className="charge-bar-wrap">
              <div className="charge-bar" style={{ width: `${(energy / 200) * 100}%` }} />
              <span className="charge-label">{energy}J / 200J</span>
            </div>
          )}

          {phase === 'DELIVERED' && (
            <div className="shock-flash">⚡ SIMULATED INTERVENTION EVENT ⚡</div>
          )}
        </div>

        <div className="defib-controls">
          {phase === 'IDLE' && (
            <button className="ctl-btn start" onClick={startAnalysis} disabled={!running}>
              ▶ START ANALYSIS
            </button>
          )}
          {phase === 'READY' && (
            <button className="defib-shock-btn" onClick={deliverShock}>
              ⚡ DELIVER SIMULATED SHOCK
            </button>
          )}
          {(phase === 'ANALYZING' || phase === 'CHARGING') && (
            <span className="demo-inline">Processing...</span>
          )}
          <button className="ctl-btn reset" onClick={handleReset}>↺ RESET</button>
          {!running && <span className="demo-inline">Start the sensor engine first</span>}
        </div>

        <div className="defib-timeline">
          <h4>Event Timeline</h4>
          {events.length === 0 ? (
            <div className="empty-hint">No defibrillator events yet.</div>
          ) : (
            <div className="defib-events">
              {events.map(evt => (
                <div key={evt.id} className="defib-event">
                  <span className="defib-evt-time">{ts(evt.timestamp)}</span>
                  <span className={`defib-evt-type type-${evt.type.toLowerCase()}`}>{evt.type.replace(/_/g, ' ')}</span>
                  <span className="defib-evt-detail">{evt.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="terminology-note">
          SOFTWARE SIMULATION ONLY — No electrical output, no real devices, no shock circuits, no clinical instructions.
        </p>
      </div>
    </section>
  );
}
