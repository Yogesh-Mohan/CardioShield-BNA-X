/**
 * healthDataService.js — FIREBASE HEALTH DATA (Step 13).
 *
 * Reusable service functions for storing and retrieving prototype health data.
 * Keeps Firebase logic separate from UI components.
 *
 * Stores: sensor readings, feature states, risk assessments, emergency events,
 * simulation events — all timestamped and scoped to the authenticated user.
 */

import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { auth } from './firebaseService';

let db = null;
function getDb() {
  if (!db) db = getFirestore();
  return db;
}

function getUserId() {
  return auth.currentUser?.uid ?? null;
}

/** Store a health snapshot (called periodically, not every frame). */
export async function saveHealthSnapshot(data) {
  const uid = getUserId();
  if (!uid) return null;
  try {
    const doc = await addDoc(collection(getDb(), 'healthData'), {
      uid,
      createdAt: serverTimestamp(),
      timestamp: data.timestamp ?? Date.now(),
      heartRate: data.heartRate ?? null,
      ecgValue: data.ecg ?? null,
      gsr: data.gsr ?? null,
      temperature: data.temperature ?? null,
      rrInterval: data.rrInterval ?? null,
      hrvSdnn: data.hrvSdnn ?? null,
      stLevel: data.stLevel ?? null,
      rAmplitude: data.rAmplitude ?? null,
      signalQuality: data.signalQuality ?? null,
      scenario: data.scenario ?? null,
      anomalyScore: data.anomalyScore ?? null,
      riskLevel: data.riskLevel ?? null,
      overallDeviation: data.overallDeviation ?? null,
      emergencyLevel: data.emergencyLevel ?? null,
    });
    return doc.id;
  } catch (err) {
    console.error('Failed to save health snapshot:', err);
    return null;
  }
}

/** Store a simulation event (pacemaker / defibrillator / treatment). */
export async function saveSimulationEvent(type, eventData) {
  const uid = getUserId();
  if (!uid) return null;
  try {
    const doc = await addDoc(collection(getDb(), 'simulationEvents'), {
      uid,
      createdAt: serverTimestamp(),
      type,
      ...eventData,
    });
    return doc.id;
  } catch (err) {
    console.error('Failed to save simulation event:', err);
    return null;
  }
}

/** Retrieve recent health snapshots for the current user. */
export async function getRecentSnapshots(count = 20) {
  const uid = getUserId();
  if (!uid) return [];
  try {
    const q = query(
      collection(getDb(), 'healthData'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Failed to fetch snapshots:', err);
    return [];
  }
}

/** Retrieve recent simulation events for the current user. */
export async function getRecentSimEvents(type = null, count = 20) {
  const uid = getUserId();
  if (!uid) return [];
  try {
    let q;
    if (type) {
      q = query(
        collection(getDb(), 'simulationEvents'),
        where('uid', '==', uid),
        where('type', '==', type),
        orderBy('createdAt', 'desc'),
        limit(count)
      );
    } else {
      q = query(
        collection(getDb(), 'simulationEvents'),
        where('uid', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(count)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Failed to fetch sim events:', err);
    return [];
  }
}
