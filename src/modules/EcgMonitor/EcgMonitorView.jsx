/**
 * EcgMonitorView.jsx — LIVE MONITORING VIEW (Step 5).
 *
 * Contains: ECG waveform · BPM · GSR · Temperature · signal status ·
 * derived ECG features · scenario selector · pause/resume/reset.
 * Consumes the Step 4 engine via useSensor() — generates no data of its own.
 * No medical diagnosis is performed or displayed.
 */

import React, { useEffect, useState } from 'react';
import { useSensor } from '../../data/SensorProvider';
import { useFeatureState } from '../../processing/useFeatureState';
import EcgCanvas from './EcgCanvas';
import ScenarioSelector from '../../components/ScenarioSelector';
import './EcgMonitor.css';

function fmt(value, decimals) {
  return value == null || Number.isNaN(value) ? '—' : value.toFixed(decimals);
}

function VitalsTile({ label, value, unit, tone }) {
  return (
    <div className="vitals-tile">
      <span className="vitals-label">{label}</span>
      <span className="vitals-value" style={{ color: tone || 'var(--accent)' }}>
        {value}
        {unit && <em className="vitals-unit">{unit}</em>}
      </span>
    </div>
  );
}

export default function EcgMonitorView() {
  const { reading, engine, running, start, pause, reset } = useSensor();
  const featureState = useFeatureState();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(engine.getElapsed()), 500);
    return () => clearInterval(id);
  }, [engine]);

  const hasData = !!reading;
  const hr = hasData ? reading.heartRate : null;
  const quality = hasData ? reading.signalQuality : null;

  const signalStatus = !hasData
    ? { label: 'NO SIGNAL', cls: 'warn' }
    : !running
      ? { label: 'PAUSED', cls: 'warn' }
      : quality > 0.85
        ? { label: 'SIGNAL LOCK', cls: 'ok' }
        : quality > 0.7
          ? { label: 'SIGNAL FAIR', cls: 'warn' }
          : { label: 'SIGNAL NOISY', cls: 'bad' };

  const ecgFeatures = featureState
    ? ['rr_interval', 'hrv_sdnn', 'st_level', 'r_amplitude'].map(
        (id) => featureState.features[id]
      )
    : [];

  return (
    <section className="monitor-view">
      <div className="monitor-toolbar">
        <div className={`signal-chip ${signalStatus.cls}`}>
          <span className="signal-dot" />
          {signalStatus.label}
        </div>
        <div className="monitor-clock">
          ELAPSED {Math.floor(elapsed)}s
        </div>
        <div className="monitor-controls">
          {!running ? (
            <button className="ctl-btn start" onClick={start}>▶ START</button>
          ) : (
            <button className="ctl-btn pause" onClick={pause}>❚❚ PAUSE</button>
          )}
          <button className="ctl-btn reset" onClick={reset}>↺ RESET</button>
        </div>
      </div>

      <div className="monitor-grid">
        <div className="monitor-main glass-panel">
          <div className="monitor-main-head">
            <h3>ECG WAVEFORM</h3>
            <span className="demo-tag">DEMO SIGNAL · NOT CLINICAL</span>
          </div>
          <EcgCanvas paused={!running} />
          <div className="ecg-derived">
            <h4>Derived ECG features <span className="demo-inline">(demo estimates)</span></h4>
            <div className="derived-grid">
              {ecgFeatures.length === 0 && (
                <div className="empty-hint">Start the engine to compute features.</div>
              )}
              {ecgFeatures.filter(Boolean).map((f) => (
                <div key={f.id} className="derived-item">
                  <span className="derived-name">{f.short}</span>
                  <span className="derived-val">
                    {fmt(f.cleaned, f.decimals)} <em>{f.unit}</em>
                  </span>
                  <span className={`derived-status s-${f.status.toLowerCase()}`}>{f.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="monitor-side">
          <div className="glass-panel vitals-panel">
            <h3>VITALS</h3>
            <div className="vitals-grid">
              <VitalsTile label="HEART RATE" value={hr ?? '—'} unit="BPM"
                tone={hr == null ? undefined : hr > 120 ? 'var(--bad)' : hr > 95 ? 'var(--warn)' : 'var(--ok)'} />
              <VitalsTile label="RR INTERVAL" value={hasData ? reading.rrInterval : '—'} unit="ms" />
              <VitalsTile label="HRV (SDNN)" value={hasData ? fmt(reading.hrvSdnn, 1) : '—'} unit="ms" />
              <VitalsTile label="GSR" value={hasData ? fmt(reading.gsr, 2) : '—'} unit="kΩ"
                tone={hasData && reading.gsr < 2.5 ? 'var(--warn)' : undefined} />
              <VitalsTile label="TEMP (LM35)" value={hasData ? fmt(reading.temperature, 2) : '—'} unit="°C"
                tone={hasData && reading.temperature > 37.6 ? 'var(--warn)' : undefined} />
              <VitalsTile label="QUALITY" value={quality == null ? '—' : `${Math.round(quality * 100)}`} unit="%" />
            </div>
          </div>
          <ScenarioSelector />
        </div>
      </div>
    </section>
  );
}
