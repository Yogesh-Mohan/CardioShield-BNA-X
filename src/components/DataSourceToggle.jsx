import React from 'react';
import { useSensor } from '../data/SensorProvider';
import './DataSourceToggle.css';

export default function DataSourceToggle() {
  const {
    dataMode,
    setDataMode,
    rtdbPath,
    setRtdbPath,
    rtdbConnected,
    lastRtdbPacketTime,
    sendTestHardwarePacket,
  } = useSensor();

  return (
    <div className="data-source-control glass-panel">
      <div className="source-toggle-head">
        <div className="source-title-wrap">
          <span className="source-title">DATA SOURCE</span>
          <span className="source-badge">
            {dataMode === 'SIMULATED' ? (
              <span className="badge-sim">SIMULATION ENGINE</span>
            ) : (
              <span className={`badge-rtdb ${rtdbConnected ? 'connected' : 'waiting'}`}>
                <span className="rtdb-dot"></span>
                {rtdbConnected ? 'FIREBASE RTDB [LIVE STREAM]' : 'FIREBASE RTDB [LISTENING]'}
              </span>
            )}
          </span>
        </div>

        <div className="mode-btn-group">
          <button
            type="button"
            className={`mode-btn ${dataMode === 'SIMULATED' ? 'active' : ''}`}
            onClick={() => setDataMode('SIMULATED')}
          >
            SIMULATOR
          </button>
          <button
            type="button"
            className={`mode-btn ${dataMode === 'REALTIME_FIREBASE' ? 'active' : ''}`}
            onClick={() => setDataMode('REALTIME_FIREBASE')}
          >
            LIVE RTDB
          </button>
        </div>
      </div>

      {dataMode === 'REALTIME_FIREBASE' && (
        <div className="rtdb-details-row">
          <div className="rtdb-path-input-wrap">
            <span className="path-label">Path:</span>
            <input
              type="text"
              value={rtdbPath}
              onChange={(e) => setRtdbPath(e.target.value)}
              className="path-input"
              placeholder="e.g. live_sensors"
            />
          </div>

          <div className="rtdb-actions">
            <button
              type="button"
              className="push-test-btn"
              onClick={() => sendTestHardwarePacket()}
              title="Push a synthetic ESP32 telemetry packet to RTDB to verify live connection"
            >
              ⚡ SEND TEST PACKET
            </button>
            {lastRtdbPacketTime && (
              <span className="last-packet-tag">
                Last Rx: {new Date(lastRtdbPacketTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
