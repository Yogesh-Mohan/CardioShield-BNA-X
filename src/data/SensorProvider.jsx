/**
 * SensorProvider.jsx — React binding for the physiological data pipeline.
 *
 * Supports Dual-Mode Operation:
 *  1. 'SIMULATED': Engine generates synthetic reproducible signals (normal, stress, abnormal, critical).
 *  2. 'REALTIME_FIREBASE': Subscribes directly to Firebase Realtime Database (`/live_sensors`),
 *     enabling live hardware sensor telemetry (AD8232, MAX30102, GSR, DHT11) to drive the entire
 *     downstream pipeline (Digital DNA, Neural Schema, AI Risk, Emergency, PPSE).
 */

import React, {
  createContext, useContext, useEffect, useMemo, useRef, useState, useCallback,
} from 'react';
import { getSensorEngine } from './engineSingleton';
import { SCENARIO_ORDER, SCENARIOS } from './sensorSchema';
import { resetAnalysisChain } from '../processing/analysisStore';
import { subscribeRealtimeSensors, pushMockHardwareData } from '../services/realtimeSensorService';

const SensorContext = createContext(null);

export function useSensor() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensor must be used within <SensorProvider>');
  return ctx;
}

export function SensorProvider({ children }) {
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = getSensorEngine();
  const engine = engineRef.current;

  // Mode state: 'SIMULATED' | 'REALTIME_FIREBASE'
  const [dataMode, setDataMode] = useState('SIMULATED');
  const [rtdbPath, setRtdbPath] = useState('live_sensors');
  const [rtdbConnected, setRtdbConnected] = useState(false);
  const [lastRtdbPacketTime, setLastRtdbPacketTime] = useState(null);

  const [reading, setReading] = useState(() => engine.lastReading);
  const [history, setHistory] = useState(() => [...engine.readingHistory]);
  const [scenario, setScenarioState] = useState(engine.getScenario());
  const [running, setRunning] = useState(engine.running);

  // Auto-start simulation engine on initial load if in SIMULATED mode
  useEffect(() => {
    if (dataMode === 'SIMULATED' && !engine.running) {
      engine.start();
      setRunning(true);
    }
  }, [engine, dataMode]);

  // Subscribe to engine's canonical output (unified listener for downstream UI)
  useEffect(() => {
    const unsub = engine.onReading((r) => {
      setReading(r);
      setHistory([...engine.readingHistory]);
    });
    return unsub;
  }, [engine]);

  // Realtime Database streaming effect when in 'REALTIME_FIREBASE' mode
  useEffect(() => {
    if (dataMode !== 'REALTIME_FIREBASE') {
      engine.isRealtimeHardware = false;
      setRtdbConnected(false);
      return;
    }

    // Do NOT pause the engine! We need it running to generate the high-res synthetic ECG wave.
    engine.isRealtimeHardware = true;
    engine.start();
    setRunning(true);

    const unsubRtdb = subscribeRealtimeSensors(
      (normalizedReading) => {
        setRtdbConnected(true);
        setLastRtdbPacketTime(Date.now());
        engine.feedExternalReading(normalizedReading);
      },
      {
        path: rtdbPath,
        onError: (err) => {
          console.warn('[SensorProvider] RTDB Stream error:', err);
          setRtdbConnected(false);
        },
      }
    );

    return () => {
      unsubRtdb();
      setRtdbConnected(false);
    };
  }, [dataMode, rtdbPath, engine]);

  const toggleDataMode = useCallback((mode) => {
    setDataMode(mode);
    if (mode === 'SIMULATED') {
      engine.start();
      setRunning(true);
    }
  }, [engine]);

  const sendTestHardwarePacket = useCallback(async (customData) => {
    const packet = customData || {
      heartRate: 84 + Math.round(Math.random() * 12),
      gsr: Number((3.2 + Math.random() * 0.8).toFixed(2)),
      temperature: Number((36.7 + Math.random() * 0.4).toFixed(2)),
      ecg: Number((Math.random() * 1.2 - 0.2).toFixed(3)),
      rrInterval: 720,
      hrvSdnn: 48.5,
      stLevel: 0.02,
      rAmplitude: 1.15,
      signalQuality: 0.98,
      scenario: 'REALTIME_LIVE',
    };
    return await pushMockHardwareData(packet, rtdbPath);
  }, [rtdbPath]);

  const controls = useMemo(
    () => ({
      start: () => {
        if (dataMode === 'SIMULATED') {
          engine.start();
        }
        setRunning(true);
      },
      pause: () => {
        if (dataMode === 'SIMULATED') {
          engine.pause();
        }
        setRunning(false);
      },
      reset: () => {
        engine.reset();
        resetAnalysisChain();
        setRunning(false);
        setReading(engine.lastReading);
        setHistory([]);
      },
      setScenario: (id) => {
        if (!SCENARIO_ORDER.includes(id)) return;
        engine.setScenario(id);
        setScenarioState(id);
      },
      setDataMode: toggleDataMode,
      setRtdbPath,
      sendTestHardwarePacket,
    }),
    [engine, dataMode, toggleDataMode, sendTestHardwarePacket]
  );

  const value = useMemo(
    () => ({
      engine,
      reading,
      history,
      scenario,
      running,
      dataMode,
      rtdbPath,
      rtdbConnected,
      lastRtdbPacketTime,
      scenariosMeta: SCENARIO_ORDER.map((id) => ({
        id,
        label: SCENARIOS[id].label,
        blurb: SCENARIOS[id].blurb,
        severity: SCENARIOS[id].severity,
      })),
      ...controls,
    }),
    [engine, reading, history, scenario, running, dataMode, rtdbPath, rtdbConnected, lastRtdbPacketTime, controls]
  );

  return <SensorContext.Provider value={value}>{children}</SensorContext.Provider>;
}

export default SensorProvider;
