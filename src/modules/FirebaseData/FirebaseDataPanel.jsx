/**
 * FirebaseDataPanel.jsx — FIREBASE HEALTH DATA UI (Step 13).
 *
 * Periodically saves health snapshots to Firestore and displays
 * recent stored records. Shows loading/error states.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSensor } from '../../data/SensorProvider';
import { useRiskResult, useEmergencyResult } from '../../processing/useFeatureState';
import { useSchemaResult } from '../../processing/useFeatureState';
import { saveHealthSnapshot, getRecentSnapshots } from '../../services/healthDataService';
import './FirebaseDataPanel.css';

function ts(millis) {
  if (!millis) return '—';
  const d = new Date(millis);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function FirebaseDataPanel() {
  const { reading, running } = useSensor();
  const risk = useRiskResult();
  const emergency = useEmergencyResult();
  const schema = useSchemaResult();
  const [records, setRecords] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoSave, setAutoSave] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getRecentSnapshots(15);
      setRecords(data);
    } catch (err) {
      setError('Failed to fetch records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const saveNow = async () => {
    if (!reading) return;
    setSaving(true);
    setError('');
    try {
      await saveHealthSnapshot({
        timestamp: Date.now(),
        heartRate: reading.heartRate,
        ecg: reading.ecg,
        gsr: reading.gsr,
        temperature: reading.temperature,
        rrInterval: reading.rrInterval,
        hrvSdnn: reading.hrvSdnn,
        stLevel: reading.stLevel,
        rAmplitude: reading.rAmplitude,
        signalQuality: reading.signalQuality,
        scenario: reading.scenario,
        anomalyScore: risk?.score ?? null,
        riskLevel: risk?.level ?? null,
        overallDeviation: schema?.overallDeviation ?? null,
        emergencyLevel: emergency?.level ?? null,
      });
      setSaveCount(c => c + 1);
      await fetchRecords();
    } catch (err) {
      setError('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (autoSave && running) {
      intervalRef.current = setInterval(saveNow, 10000);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoSave, running]);

  return (
    <section className="firebase-data">
      <div className="glass-panel fb-main">
        <div className="fb-head">
          <div>
            <h3>FIREBASE HEALTH DATA</h3>
            <p className="fb-sub">Cloud-stored prototype health records</p>
          </div>
          <span className="fb-count">{saveCount} saved this session</span>
        </div>

        <div className="fb-controls">
          <button className="ctl-btn start" onClick={saveNow} disabled={saving || !reading}>
            {saving ? '⏳ Saving...' : '💾 SAVE NOW'}
          </button>
          <label className="fb-auto-label">
            <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} />
            Auto-save every 10s
          </label>
          <button className="ctl-btn reset" onClick={fetchRecords} disabled={loading}>
            ↻ REFRESH
          </button>
        </div>

        {error && <div className="fb-error">⚠ {error}</div>}

        <div className="fb-records">
          <h4>Recent Records {loading && <span className="demo-inline">(loading...)</span>}</h4>
          {records.length === 0 && !loading ? (
            <div className="empty-hint">No records stored yet. Save a snapshot or enable auto-save.</div>
          ) : (
            <div className="fb-table-wrap">
              <table className="fb-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>HR</th>
                    <th>GSR</th>
                    <th>Temp</th>
                    <th>Score</th>
                    <th>Risk</th>
                    <th>Scenario</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td>{ts(r.timestamp)}</td>
                      <td>{r.heartRate ?? '—'}</td>
                      <td>{r.gsr != null ? Number(r.gsr).toFixed(2) : '—'}</td>
                      <td>{r.temperature != null ? Number(r.temperature).toFixed(1) : '—'}°</td>
                      <td>{r.anomalyScore != null ? `${Math.round(r.anomalyScore * 100)}%` : '—'}</td>
                      <td><span className={`risk-pill r-${(r.riskLevel || 'normal').toLowerCase()}`}>{r.riskLevel || '—'}</span></td>
                      <td>{r.scenario || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
