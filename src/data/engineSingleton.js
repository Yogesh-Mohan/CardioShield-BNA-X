/**
 * engineSingleton.js — guarantees ONE SensorEngine instance per app.
 * Used by the React provider, the legacy SensorInterface facade,
 * and any future non-React consumer (e.g. ESP32 bridge).
 */

import { SensorEngine } from './SensorEngine';

let instance = null;

export function getSensorEngine() {
  if (!instance) {
    instance = new SensorEngine({ scenario: 'NORMAL' });
  }
  return instance;
}
