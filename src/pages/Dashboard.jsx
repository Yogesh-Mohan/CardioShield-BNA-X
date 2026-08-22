import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSensor } from '../data/SensorProvider';
import { useFeatureState, useRiskResult, useEmergencyResult } from '../processing/useFeatureState';
import ScenarioSelector from '../components/ScenarioSelector';
import DataSourceToggle from '../components/DataSourceToggle';

// Module views
import EcgMonitorView from '../modules/EcgMonitor/EcgMonitorView';
import DigitalDNAView from '../modules/DigitalDNA/DigitalDNAView';
import DnaAnalysisPanel from '../modules/DigitalDNA/DnaAnalysisPanel';
import NeuralSchemaPanel from '../modules/NeuralSchema/NeuralSchemaPanel';
import RiskAnalysisPanel from '../modules/AI/RiskAnalysisPanel';
import EmergencyPanel from '../modules/Emergency/EmergencyPanel';
import PacemakerSim from '../modules/Pacemaker/PacemakerSim';
import DefibrillatorSim from '../modules/Defibrillator/DefibrillatorSim';
import FirebaseDataPanel from '../modules/FirebaseData/FirebaseDataPanel';
import TreatmentSim from '../modules/Treatment/TreatmentSim';
import PpsePanel from '../modules/PPSE/PpsePanel';

import './Dashboard.css';

// SVG Icon Pack designed manually to replace low-quality emojis
const ICONS = {
  overview: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  monitor: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  dna: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 10.5C4.5 10.5 7.5 4.5 12 4.5C16.5 4.5 19.5 10.5 19.5 10.5C19.5 10.5 16.5 16.5 12 16.5C7.5 16.5 4.5 10.5 4.5 10.5Z" />
      <circle cx="12" cy="10.5" r="3" />
      <path d="M12 2v2.5M12 16.5V22M2 10.5h2.5M19.5 10.5H22" />
    </svg>
  ),
  analysis: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  ppse: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  emergency: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  pacemaker: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  defib: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  firebase: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
  treatment: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  ),
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: ICONS.overview },
  { id: 'monitor', label: 'Monitoring', icon: ICONS.monitor },
  { id: 'dna', label: 'Digital BNA', icon: ICONS.dna },
  { id: 'analysis', label: 'Analysis', icon: ICONS.analysis },
  { id: 'ppse', label: 'Psycho-Physiological Analysis', icon: ICONS.ppse },
  { id: 'emergency', label: 'Emergency', icon: ICONS.emergency },
  { id: 'pacemaker', label: 'Pacemaker Sim', icon: ICONS.pacemaker },
  { id: 'defib', label: 'Defibrillator Sim', icon: ICONS.defib },
  { id: 'firebase', label: 'Cloud Data', icon: ICONS.firebase },
  { id: 'treatment', label: 'Treatment Sim', icon: ICONS.treatment },
];

function fmt(v, d = 1) {
  return v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d);
}

/** Overview tab: compact summary of all systems */
function OverviewTab() {
  const { reading, running, start, pause } = useSensor();
  const risk = useRiskResult();
  const emergency = useEmergencyResult();

  const hr = reading?.heartRate ?? null;
  const gsr = reading?.gsr ?? null;
  const temp = reading?.temperature ?? null;
  const riskLevel = risk?.level ?? 'NORMAL';
  const emergencyLevel = emergency?.level ?? 'NORMAL';

  const levelCls = { NORMAL: 'ok', WARNING: 'warn', CRITICAL: 'bad' };

  // Scroll link reveal observer setup
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = containerRef.current?.querySelectorAll('.reveal-on-scroll');
    elements?.forEach((el) => observer.observe(el));

    return () => {
      elements?.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="overview-tab" ref={containerRef}>
      <div className="overview-controls-row reveal-on-scroll">
        <DataSourceToggle />
        <div className="overview-subcontrols">
          {!running ? (
            <button className="ctl-btn start" onClick={start}>▶ START ENGINE</button>
          ) : (
            <button className="ctl-btn pause" onClick={pause}>❚❚ PAUSE</button>
          )}
          <ScenarioSelector />
        </div>
      </div>

      <div className="overview-grid">
        <div className="glass-panel metric-card reveal-on-scroll">
          <div className="hud-corner top-left"></div>
          <div className="hud-corner bottom-right"></div>
          <div className="metric-tag">[ MAX30102 / PULSE ]</div>
          <h3>Heart Rate</h3>
          <div className="metric-value">{hr ?? '—'} <span className="metric-unit">BPM</span></div>
          <div className={`metric-status s-${hr != null && hr > 100 ? 'warn' : 'ok'}`}>
            {hr == null ? 'Awaiting data' : hr > 120 ? 'Tachycardic' : hr < 55 ? 'Bradycardic' : 'Normal Rhythm'}
          </div>
        </div>

        <div className="glass-panel metric-card reveal-on-scroll">
          <div className="hud-corner top-left"></div>
          <div className="hud-corner bottom-right"></div>
          <div className="metric-tag">[ AD8232 ]</div>
          <h3>ECG Status</h3>
          <div className="metric-value" style={{ color: 'var(--accent)' }}>
            {reading ? (reading.signalQuality > 0.85 ? 'Stable' : 'Noisy') : '—'}
          </div>
          <div className="metric-status">
            {reading ? `Quality: ${Math.round(reading.signalQuality * 100)}%` : 'No signal'}
          </div>
        </div>

        <div className="glass-panel metric-card reveal-on-scroll">
          <div className="hud-corner top-left"></div>
          <div className="hud-corner bottom-right"></div>
          <div className="metric-tag">[ GSR / FSR ]</div>
          <h3>Galvanic Skin Res.</h3>
          <div className="metric-value">{fmt(gsr, 2)} <span className="metric-unit">kΩ</span></div>
          <div className={`metric-status s-${gsr != null && gsr < 2.5 ? 'warn' : 'ok'}`}>
            {gsr == null ? 'Awaiting data' : gsr < 2.5 ? 'Elevated stress' : 'Optimal'}
          </div>
        </div>

        <div className="glass-panel metric-card reveal-on-scroll">
          <div className="hud-corner top-left"></div>
          <div className="hud-corner bottom-right"></div>
          <div className="metric-tag">[ DHT11 ]</div>
          <h3>Core Temp</h3>
          <div className="metric-value">{fmt(temp, 2)} <span className="metric-unit">°C</span></div>
          <div className={`metric-status s-${temp != null && temp > 37.6 ? 'warn' : 'ok'}`}>
            {temp == null ? 'Awaiting data' : temp > 37.6 ? 'Elevated' : 'Nominal'}
          </div>
        </div>
      </div>

      <div className="overview-modules">
        <div className="glass-panel overview-module reveal-on-scroll">
          <div className="hud-line top"></div>
          <div className="module-header-tech">
            <h3>AI RISK ENGINE</h3>
            <span className="tech-idx">[ MOD: AI-RISK ]</span>
          </div>
          <div className="overview-level-row">
            <span className={`level-pill ${levelCls[riskLevel]}`}>{riskLevel}</span>
            <span className="overview-score">
              Score: {risk ? `${Math.round(risk.score * 100)}%` : '—'}
            </span>
          </div>
          {risk?.explanation && <p className="overview-explain">{risk.explanation}</p>}
        </div>

        <div className="glass-panel overview-module reveal-on-scroll">
          <div className="hud-line top"></div>
          <div className="module-header-tech">
            <h3>EMERGENCY STATUS</h3>
            <span className="tech-idx">[ MOD: SEC-SYS ]</span>
          </div>
          <div className="overview-level-row">
            <span className={`level-pill ${levelCls[emergencyLevel]}`}>{emergencyLevel}</span>
            <span className="overview-score">
              Events: {emergency?.events?.length ?? 0}
            </span>
          </div>
          {emergency?.alertActive && (
            <p className="overview-alert">⚠ Simulated alert active: {emergency.alertId}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { logout, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const { scenario, dataMode, rtdbConnected } = useSensor();

  // Scroll to top inside main view container on tab change
  const contentContainerRef = useRef(null);
  useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-glow"></div>
        <div className="brand">
          <h1>BNA-X</h1>
          <p>CardioShield System</p>
        </div>
        <nav className="nav-menu">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className="nav-icon">{tab.icon}</i> <span className="nav-label">{tab.label}</span>
              {activeTab === tab.id && <div className="active-indicator"></div>}
            </div>
          ))}
        </nav>
      </aside>

      {/* Top Header */}
      <header className="top-header">
        <div className="header-status">
          <div className="status-badge">
            <span className="status-dot"></span>
            NODE: ONLINE
          </div>
          <div className="status-badge">
            {dataMode === 'REALTIME_FIREBASE' ? (
              <span className={`live-header-pill ${rtdbConnected ? 'rx-live' : 'rx-wait'}`}>
                ● RTDB: {rtdbConnected ? 'STREAMING' : 'LISTENING'}
              </span>
            ) : (
              `SCENARIO: ${scenario}`
            )}
          </div>
          <div className="status-badge user-badge">
            PROFILE: {currentUser?.email || 'DEMO_SUBJECT_01'}
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <span>DISCONNECT</span>
        </button>
      </header>

      {/* Main Content Container with dynamic scroll monitoring */}
      <main className="dashboard-content" ref={contentContainerRef}>
        <div className="content-glow"></div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'monitor' && <EcgMonitorView />}
        {activeTab === 'dna' && (
          <>
            <DigitalDNAView />
            <DnaAnalysisPanel />
          </>
        )}
        {activeTab === 'analysis' && (
          <>
            <NeuralSchemaPanel />
            <RiskAnalysisPanel />
          </>
        )}
        {activeTab === 'ppse' && <PpsePanel />}
        {activeTab === 'emergency' && <EmergencyPanel />}
        {activeTab === 'pacemaker' && <PacemakerSim />}
        {activeTab === 'defib' && <DefibrillatorSim />}
        {activeTab === 'firebase' && <FirebaseDataPanel />}
        {activeTab === 'treatment' && <TreatmentSim />}
      </main>
    </div>
  );
}
