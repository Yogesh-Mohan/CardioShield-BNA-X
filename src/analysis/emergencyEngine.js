/**
 * emergencyEngine.js — EMERGENCY MONITORING ENGINE (Step 10).
 *
 *   AI risk state → transition detection → emergency events → timeline
 *
 * NORMAL   → no action
 * WARNING  → visible warning event (timestamp, features, trend)
 * CRITICAL → prominent emergency event + simulated alert workflow
 *
 * SAFETY: software demonstration ONLY.
 *  - No real emergency calls are sent.
 *  - No hospitals / contacts are contacted.
 *  - No medical devices are controlled.
 *  - No electrical stimulation is generated.
 */

const MAX_EVENTS = 60;

export class EmergencyEngine {
  constructor() {
    this.events = [];        // newest last
    this.currentState = 'NORMAL';
    this.lastResult = null;
    this._alertSeq = 0;
  }

  reset() {
    this.events = [];
    this.currentState = 'NORMAL';
    this.lastResult = null;
  }

  _pushEvent(evt) {
    this.events.push(evt);
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }

  /**
   * Ingest a risk-engine result; returns the emergency status snapshot:
   * {
   *   timestamp, level, score, scenario, trend,
   *   triggeringFeatures: [{id,label,direction,deviation}],
   *   alertActive, alertId,
   *   events: [...timeline newest last]
   * }
   */
  update(riskResult) {
    if (!riskResult || !riskResult.level) return this.lastResult;

    const prevLevel = this.currentState;
    const level = riskResult.level;

    const triggeringFeatures = (riskResult.triggers ?? [])
      .filter((t) => t.deviation > 0.05)
      .map((t) => ({ id: t.id, label: t.label, direction: t.direction, deviation: t.deviation }));

    let alertActive = this.lastResult?.alertActive ?? false;
    let alertId = this.lastResult?.alertId ?? null;

    // --- transition detection ---
    if (level !== prevLevel) {
      const rank = { NORMAL: 0, WARNING: 1, CRITICAL: 2 };
      const eventType =
        rank[level] > rank[prevLevel] ? 'ESCALATION' : 'RESOLUTION';

      this._pushEvent({
        id: `evt-${riskResult.timestamp}-${this._alertSeq++}`,
        timestamp: riskResult.timestamp,
        eventType,
        state: level,
        prevState: prevLevel,
        score: riskResult.score,
        scenario: riskResult.scenario,
        triggeringFeatures,
      });

      if (level === 'CRITICAL') {
        alertId = `ALERT-${new Date(riskResult.timestamp).toISOString().slice(11, 19)}`;
        alertActive = true;
        this._pushEvent({
          id: `evt-${riskResult.timestamp}-sim`,
          timestamp: riskResult.timestamp,
          eventType: 'SIMULATED_ALERT',
          state: 'CRITICAL',
          prevState: prevLevel,
          score: riskResult.score,
          scenario: riskResult.scenario,
          triggeringFeatures,
          note: 'Simulated alert raised for demonstration only — no real notifications were sent.',
        });
      } else if (level === 'NORMAL' && prevLevel === 'WARNING') {
        alertActive = false;
        alertId = null;
      }
    }

    // CRITICAL → WARNING de-escalation also clears the alert banner
    // (still logged as RESOLUTION).
    if (level === 'WARNING' && prevLevel === 'CRITICAL') {
      alertActive = false;
      alertId = null;
    }

    this.currentState = level;

    const result = {
      timestamp: riskResult.timestamp,
      level,
      score: riskResult.score,
      scenario: riskResult.scenario,
      trend: riskResult.trend,
      triggeringFeatures,
      alertActive,
      alertId,
      events: [...this.events],
    };

    this.lastResult = result;
    return result;
  }

  /** Manual "SIMULATE EMERGENCY" demo control — logs a synthetic event. */
  simulateEmergency(scenario = 'MANUAL_DEMO') {
    const ts = Date.now();
    const evt = {
      id: `evt-${ts}-manual`,
      timestamp: ts,
      eventType: 'SIMULATED_ALERT',
      state: 'CRITICAL',
      prevState: this.currentState,
      score: null,
      scenario,
      triggeringFeatures: [],
      manual: true,
      note: 'Manually triggered demo event — no real notifications were sent.',
    };
    this._pushEvent(evt);
    if (this.lastResult) {
      this.lastResult = { ...this.lastResult, events: [...this.events] };
    }
    return evt;
  }

  /** Human-readable feature names for an event. */
  static featureNames(event) {
    if (!event?.triggeringFeatures?.length) return '—';
    return event.triggeringFeatures.map((f) => f.label).join(', ');
  }
}

let singleton = null;
export function getEmergencyEngine() {
  if (!singleton) singleton = new EmergencyEngine();
  return singleton;
}
