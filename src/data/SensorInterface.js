/**
 * SensorInterface.js — abstract sensor-provider facade (Step 4).
 *
 * Downstream code should prefer the React provider (useSensor) or the
 * engine singleton. This facade keeps a hardware-agnostic entry point:
 * when ESP32 hardware arrives, only this file changes — the canonical
 * schema (sensorSchema.js) stays identical.
 */

import { getSensorEngine } from './engineSingleton';

export class SensorInterface {
  /** Latest canonical reading from the active provider (simulated today). */
  static getSensorData() {
    return getSensorEngine().lastReading;
  }

  /** Subscribe to canonical readings; returns unsubscribe function. */
  static subscribe(fn) {
    return getSensorEngine().onReading(fn);
  }
}

export default SensorInterface;
