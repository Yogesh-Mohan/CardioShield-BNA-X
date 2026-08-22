/**
 * SensorEngine.js — the ONE real-time simulated sensor engine (Step 4).
 *
 * Single source of physiological data for the whole app:
 *   ECG stream, heart rate, GSR, LM35-style temperature,
 *   RR intervals / HRV and derived ECG features.
 *
 * Design rules honored here:
 *  - No pure-random values: seeded noise + scheduled beats + smooth interpolation.
 *  - Deterministic/reproducible per scenario seed (useful for demos).
 *  - One consistent timestamp per reading (canonical schema).
 *  - Abstract provider boundary: downstream code only sees onReading()/getEcgBuffer();
 *    an ESP32 hardware provider can later expose the identical interface.
 *  - Values are DEMO SIGNALS — not clinically accurate.
 */

import { SCENARIOS, SCENARIO_ORDER } from './sensorSchema';
import { createSmoothNoise, clamp, smoothToward } from './noise';
import { BeatScheduler, evaluateComplex, BASE_COMPLEX, PVC_COMPLEX } from './ecgSynth';

const SAMPLE_HZ = 250;          // ECG sample rate
const READING_HZ = 4;           // canonical reading rate (feature layer)
const TRANSITION_TAU = 1.6;     // s — smooth scenario cross-fade time constant
const BEAT_QUEUE_KEEP_S = 4;    // s of fired beats retained for waveform eval

export class SensorEngine {
  constructor({ scenario = 'NORMAL', seed = null } = {}) {
    this.readingListeners = new Set();
    this.scenarioId = scenario;
    this.baseSeed = seed ?? SCENARIOS[scenario].seed;

    // Engine clock (s). Pausing freezes it; reset zeroes it.
    this.time = 0;
    this.running = false;
    this._raf = null;
    this._lastWall = null;
    this._sampleAccum = 0;
    this._readingAccum = 0;

    // Smoothed live parameters (cross-fade between scenarios).
    const s0 = SCENARIOS[scenario];
    this._live = {
      hrBase: s0.hr.base,
      hrVar: s0.hr.var,
      respRate: s0.respRate,
      gsrBase: s0.gsr.base,
      gsrVar: s0.gsr.var,
      tempBase: s0.temp.base,
      tempVar: s0.temp.var,
      rrJitter: s0.rrJitter,
      ectopyChance: s0.ectopyChance,
      stShift: s0.stShift,
      tWaveAmp: s0.tWaveAmp,
      noiseLevel: s0.noiseLevel,
      qrsWiden: s0.qrsWiden,
    };

    this._noiseGsr = createSmoothNoise(this.baseSeed + 11, 0.13);
    this._noiseTemp = createSmoothNoise(this.baseSeed + 23, 0.07);
    this._noiseEcg = createSmoothNoise(this.baseSeed + 37, 2.1);
    this._noiseResp = createSmoothNoise(this.baseSeed + 53, 0.5);

    this.beats = new BeatScheduler(this.baseSeed + 71);
    this._firedQueue = []; // recent fired beats, ascending by .at

    // Latest canonical reading + recent reading history (for trends).
    this.lastReading = null;
    this.readingHistory = []; // newest last, capped

    // ECG sample buffer (newest last) — consumed by the monitor view.
    this.ecgBuffer = [];
    this.ECG_BUFFER_SECONDS = 8;
    this._lastBeatInfo = { rrInterval: 800, isPVC: false, bpm: Math.round(s0.hr.base) };
  }

  /* ---------------- lifecycle ---------------- */

  start() {
    if (this.running) return;
    this.running = true;
    this._lastWall = performance.now();
    const loop = () => {
      if (!this.running) return;
      const now = performance.now();
      const dt = Math.min((now - this._lastWall) / 1000, 0.25); // clamp tab-switch jumps
      this._lastWall = now;
      this._tick(dt);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  pause() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this._emitReading(); // final state so UI shows paused values
  }

  reset() {
    this.pause();
    this.time = 0;
    this.beats.reset();
    this._firedQueue = [];
    this.ecgBuffer = [];
    this.readingHistory = [];
    this.lastReading = null;
    this._sampleAccum = 0;
    this._readingAccum = 0;
    this._applyScenarioParams(100); // effectively snap to current scenario targets
    this._tick(0.0001);
    this.pause();
  }

  destroy() {
    this.pause();
    this.readingListeners.clear();
  }

  setScenario(id) {
    if (!SCENARIO_ORDER.includes(id) || id === this.scenarioId) return;
    this.scenarioId = id;
    // Re-seed noise generators with the new scenario's seed → reproducible runs.
    const s = SCENARIOS[id];
    this._noiseGsr = createSmoothNoise(s.seed + 11, 0.13);
    this._noiseTemp = createSmoothNoise(s.seed + 23, 0.07);
    this._noiseEcg = createSmoothNoise(s.seed + 37, 2.1);
    this._noiseResp = createSmoothNoise(s.seed + 53, 0.5);
    // Live params cross-fade smoothly in _tick; beats adapt via params each frame.
  }

  getScenario() {
    return this.scenarioId;
  }

  /* ---------------- internals ---------------- */

  _applyScenarioParams(dt) {
    const target = SCENARIOS[this.scenarioId];
    const L = this._live;
    L.hrBase = smoothToward(L.hrBase, target.hr.base, dt, TRANSITION_TAU);
    L.hrVar = smoothToward(L.hrVar, target.hr.var, dt, TRANSITION_TAU);
    L.respRate = smoothToward(L.respRate, target.respRate, dt, TRANSITION_TAU);
    L.gsrBase = smoothToward(L.gsrBase, target.gsr.base, dt, TRANSITION_TAU);
    L.gsrVar = smoothToward(L.gsrVar, target.gsr.var, dt, TRANSITION_TAU);
    L.tempBase = smoothToward(L.tempBase, target.temp.base, dt, TRANSITION_TAU);
    L.tempVar = smoothToward(L.tempVar, target.temp.var, dt, TRANSITION_TAU);
    L.rrJitter = smoothToward(L.rrJitter, target.rrJitter, dt, TRANSITION_TAU);
    L.ectopyChance = smoothToward(L.ectopyChance, target.ectopyChance, dt, TRANSITION_TAU);
    L.stShift = smoothToward(L.stShift, target.stShift, dt, TRANSITION_TAU);
    L.tWaveAmp = smoothToward(L.tWaveAmp, target.tWaveAmp, dt, TRANSITION_TAU);
    L.noiseLevel = smoothToward(L.noiseLevel, target.noiseLevel, dt, TRANSITION_TAU);
    L.qrsWiden = smoothToward(L.qrsWiden, target.qrsWiden, dt, TRANSITION_TAU);
  }

  _tick(dt) {
    this.time += dt;
    this._applyScenarioParams(dt);

    // --- advance beat scheduler & record fired beats ---
    const firedBeats = this.beats.advance(this.time, {
      hr: { base: this._live.hrBase, var: this._live.hrVar },
      respRate: this._live.respRate,
      rrJitter: this._live.rrJitter,
      ectopyChance: this._live.ectopyChance,
    });
    if (firedBeats.length > 0) {
      this._firedQueue.push(...firedBeats);
      const cutoff = this.time - BEAT_QUEUE_KEEP_S;
      while (this._firedQueue.length > 2 && this._firedQueue[1].at <= cutoff) {
        this._firedQueue.shift();
      }
      const last = firedBeats[firedBeats.length - 1];
      this._lastBeatInfo = {
        rrInterval: last.rrInterval,
        isPVC: last.isPVC,
        bpm: Math.round(60000 / last.rrInterval),
      };
    }

    // --- generate ECG samples at fixed rate ---
    this._sampleAccum += dt * SAMPLE_HZ;
    const nSamples = Math.floor(this._sampleAccum);
    this._sampleAccum -= nSamples;
    if (nSamples > 0) {
      const maxSamples = SAMPLE_HZ * this.ECG_BUFFER_SECONDS;
      for (let i = 0; i < nSamples; i++) {
        const tSample = this.time - (nSamples - i) / SAMPLE_HZ;
        this.ecgBuffer.push(this._ecgAt(tSample));
      }
      if (this.ecgBuffer.length > maxSamples) {
        this.ecgBuffer.splice(0, this.ecgBuffer.length - maxSamples);
      }
    }

    // --- emit canonical readings at fixed rate ---
    this._readingAccum += dt;
    if (this._readingAccum >= 1 / READING_HZ) {
      this._readingAccum = 0;
      this._emitReading();
    }
  }

  /** Resolve which fired beat governs engine time t (find closest beat). */
  _beatFor(t) {
    if (!this._firedQueue.length) return { at: -10, isPVC: false };

    let closest = this._firedQueue[0];
    let minDiff = Math.abs(t - closest.at);

    for (let i = 1; i < this._firedQueue.length; i++) {
      const diff = Math.abs(t - this._firedQueue[i].at);
      if (diff < minDiff) {
        minDiff = diff;
        closest = this._firedQueue[i];
      }
    }
    return closest;
  }

  /** ECG value (mV) at engine time t. */
  _ecgAt(t) {
    const L = this._live;
    const beat = this._beatFor(t);
    const dt = t - beat.at;

    let v = 0;
    if (beat.isPVC) {
      v = evaluateComplex(PVC_COMPLEX, dt, {
        stShift: L.stShift * 0.5,
        qrsWiden: L.qrsWiden,
      });
    } else {
      const complex = BASE_COMPLEX.map((c) =>
        c.name === 'T' ? { ...c, amp: L.tWaveAmp } : c
      );
      v = evaluateComplex(complex, dt, {
        stShift: L.stShift,
        qrsWiden: L.qrsWiden,
      });
    }
    // Respiration-coupled baseline wander + measurement noise.
    const wander =
      0.04 * Math.sin(t * 2 * Math.PI * L.respRate) +
      0.015 * this._noiseResp(t);
    const noise = L.noiseLevel * this._noiseEcg(t * 3.7);
    return v + wander + noise;
  }

  _emitReading() {
    if (this.isRealtimeHardware) return; // Prevent simulated readings from overwriting live hardware data

    const sdnn = this.beats.getSDNN();
    const reading = {
      schemaVersion: 1,
      timestamp: Date.now(),
      ecg: this.ecgBuffer.length ? this.ecgBuffer[this.ecgBuffer.length - 1] : 0,
      heartRate: this._lastBeatInfo.bpm,
      gsr: clamp(
        this._live.gsrBase + this._live.gsrVar * this._noiseGsr(this.time),
        0.4, 14
      ),
      temperature:
        this._live.tempBase + this._live.tempVar * this._noiseTemp(this.time),
      rrInterval: Math.round(this._lastBeatInfo.rrInterval),
      hrvSdnn: sdnn == null ? 45 : Math.round(sdnn * 10) / 10,
      stLevel: Math.round(this._live.stShift * 1000) / 1000,
      rAmplitude:
        Math.round((1.05 + 0.04 * this._noiseEcg(this.time * 0.5)) * 100) / 100,
      signalQuality: clamp(1 - this._live.noiseLevel * 4, 0.55, 0.99),
      scenario: this.scenarioId,
      running: this.running,
    };
    this.lastReading = reading;
    this.readingHistory.push(reading);
    if (this.readingHistory.length > 300) this.readingHistory.shift();

    for (const fn of this.readingListeners) fn(reading);
  }

  /* ---------------- public accessors ---------------- */

  getEcgBuffer() {
    return this.ecgBuffer;
  }

  /** Subscribe to fixed-rate canonical readings. Returns unsubscribe fn. */
  onReading(fn) {
    this.readingListeners.add(fn);
    if (this.lastReading) fn(this.lastReading);
    return () => this.readingListeners.delete(fn);
  }

  /** Feed live telemetry packet from external source (Firebase Realtime Database / Hardware). */
  feedExternalReading(externalReading) {
    if (!externalReading) return;

    // Update live parameters to match the hardware reading so the synthetic ECG generator syncs up.
    // This allows the background _tick() loop to smoothly generate a "dummy" visual wave based on live HR!
    if (externalReading.heartRate != null) {
      this._live.hrBase = Number(externalReading.heartRate) || 75;
      this._live.hrVar = 2; // Minimal variance since it's hardware driven
    }

    const hr = Number(externalReading.heartRate) || 72;

    const reading = {
      schemaVersion: 1,
      timestamp: externalReading.timestamp || Date.now(),
      ecg: (externalReading.ecg != null) ? Number(externalReading.ecg) : (this.ecgBuffer.length ? this.ecgBuffer[this.ecgBuffer.length - 1] : 0),
      heartRate: hr,
      gsr: (externalReading.gsr != null) ? Number(externalReading.gsr) : 3.5,
      temperature: (externalReading.temperature != null) ? Number(externalReading.temperature) : 36.8,
      rrInterval: (externalReading.rrInterval != null) ? Number(externalReading.rrInterval) : Math.round(60000 / hr),
      hrvSdnn: (externalReading.hrvSdnn != null) ? Number(externalReading.hrvSdnn) : 45,
      stLevel: (externalReading.stLevel != null) ? Number(externalReading.stLevel) : 0.0,
      rAmplitude: (externalReading.rAmplitude != null) ? Number(externalReading.rAmplitude) : 1.0,
      signalQuality: (externalReading.signalQuality != null) ? Number(externalReading.signalQuality) : 0.95,
      scenario: externalReading.scenario ?? 'REALTIME_LIVE',
      running: true,
      isRealtimeHardware: true,
    };

    this.lastReading = reading;
    this.readingHistory.push(reading);
    if (this.readingHistory.length > 300) this.readingHistory.shift();

    for (const fn of this.readingListeners) fn(reading);
  }

  getElapsed() {
    return this.time;
  }
}

export default SensorEngine;
