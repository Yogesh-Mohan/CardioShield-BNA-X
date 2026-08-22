/**
 * dnaMapping.js — DETERMINISTIC FEATURE→GEOMETRY MAPPING (Step 6).
 *
 * Maps the processed feature vector (from THE ONE pipeline) onto the
 * Digital DNA structure. Same input ⇒ same structure, always.
 *
 *   normalized value → node elevation + orbital radius + bob speed
 *   feature weight   → orbital spread + node radius
 *   contribution     → node size, deformation, glow intensity, bob amplitude
 *   value similarity → pairwise edge existence + thickness
 *   overall activity → central node size/deform + particle motion
 *
 * Digital DNA = data-driven representation of multidimensional physiological
 * signals. It does NOT represent biological/genetic DNA.
 */

import { FEATURES } from '../../data/sensorSchema';
import { clamp } from '../../data/noise';

/** Golden-angle spiral → evenly distributed node longitudes. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const COLOR_NOMINAL = [0.0, 1.0, 0.53];  // #00ff88
const COLOR_ELEVATED = [1.0, 0.67, 0.0]; // #ffaa00
const COLOR_OUTLIER = [1.0, 0.3, 0.3];   // #ff4d4d

const STATUS_COLORS = {
  NOMINAL: COLOR_NOMINAL,
  ELEVATED: COLOR_ELEVATED,
  OUTLIER: COLOR_OUTLIER,
};

/** Nodes whose normalized values differ less than this become interconnected. */
const CONNECT_THRESHOLD = 0.32;

/**
 * Compute per-frame TARGET parameters for every node + edges.
 * The scene lerps its live values toward these targets for smooth motion.
 */
export function computeNodeTargets(featureState) {
  if (!featureState || !featureState.features) return null;

  const nodes = FEATURES.map((f, i) => {
    const feat = featureState.features[f.id];
    const norm = feat.normalized;
    const contrib = feat.contribution;

    return {
      id: f.id,
      // Position: longitude fixed (golden angle), latitude + orbit from data.
      theta: i * GOLDEN_ANGLE,
      phi: Math.PI * (0.18 + 0.64 * norm),
      orbitRadius: 1.0 + f.weight * 2.4 + norm * 0.8,
      // Size: weight baseline + deviation boost.
      radius: 0.14 + f.weight * 0.55 + Math.abs(contrib) * 0.18,
      // Motion: stronger deviation ⇒ more visible movement.
      bobAmp: 0.04 + Math.abs(contrib) * 0.22,
      bobSpeed: 0.6 + norm * 1.6,
      phase: i * 1.7,
      // Local geometry deformation kicks in beyond mild deviation.
      deform: Math.max(0, Math.abs(contrib) - 0.25) * 0.9,
      color: STATUS_COLORS[feat.status] ?? COLOR_NOMINAL,
      intensity: 0.5 + Math.abs(contrib) * 1.4,
    };
  });

  // Overall activity = mean absolute contribution, amplified.
  const absContribs = nodes.map(
    (n) => Math.abs(featureState.features[n.id].contribution)
  );
  const activity = clamp(
    (absContribs.reduce((a, b) => a + b, 0) / absContribs.length) * 2.2,
    0, 1
  );

  // Central node aggregates the whole vector.
  let wSum = 0;
  const mixed = [0, 0, 0];
  nodes.forEach((n) => {
    const w = Math.abs(featureState.features[n.id].contribution) + 0.05;
    wSum += w;
    mixed[0] += n.color[0] * w;
    mixed[1] += n.color[1] * w;
    mixed[2] += n.color[2] * w;
  });
  const centerColor = mixed.map((c) => c / wSum);

  const center = {
    radius: 0.34 + activity * 0.22,
    deform: activity * 0.55,
    intensity: 0.6 + activity * 1.2,
    color: centerColor,
  };

  // Pairwise edges from feature-value similarity (deterministic topology).
  const pairs = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const ni = featureState.features[nodes[i].id].normalized;
      const nj = featureState.features[nodes[j].id].normalized;
      const d = Math.abs(ni - nj);
      if (d < CONNECT_THRESHOLD) {
        const wi = FEATURES[i].weight;
        const wj = FEATURES[j].weight;
        const strength = clamp((1 - d / CONNECT_THRESHOLD) * ((wi + wj) * 1.6), 0.05, 1);
        pairs.push({ i, j, strength, thickness: 0.008 + strength * 0.03 });
      }
    }
  }

  return { nodes, center, pairs, activity };
}

/** Spherical → cartesian for a node target at time t (includes bob motion). */
export function nodePosition(target, t, out) {
  const { theta, phi, orbitRadius, bobAmp, bobSpeed, phase } = target;
  const r = orbitRadius + Math.sin(t * bobSpeed + phase) * bobAmp;
  const sinPhi = Math.sin(phi);
  out.set(r * sinPhi * Math.cos(theta), r * Math.cos(phi), r * sinPhi * Math.sin(theta));
  return out;
}
