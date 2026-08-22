/**
 * noise.js — deterministic signal primitives.
 * Seeded PRNG + smooth 1-D value noise so demo signals are correlated,
 * time-dependent and reproducible (never pure Math.random()).
 */

/** mulberry32 — small, fast, seedable PRNG. Returns fn() in [0,1). */
export function createSeededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Smooth 1-D value noise: random lattice + cosine interpolation.
 * frequency = oscillations per second of the underlying lattice.
 */
export function createSmoothNoise(seed, frequency = 1) {
  const rand = createSeededRandom(seed);
  const lattice = Array.from({ length: 512 }, () => rand() * 2 - 1);
  const SIZE = lattice.length;

  return function noise(t) {
    const x = t * frequency;
    const i0 = Math.floor(x);
    const frac = x - i0;
    const a = lattice[((i0 % SIZE) + SIZE) % SIZE];
    const b = lattice[(((i0 + 1) % SIZE) + SIZE) % SIZE];
    const w = (1 - Math.cos(frac * Math.PI)) / 2; // cosine ease
    return a + (b - a) * w; // roughly [-1, 1]
  };
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const lerp = (a, b, t) => a + (b - a) * t;

/** Exponential smoothing toward target (frame-rate independent). */
export function smoothToward(current, target, dt, timeConstant) {
  const alpha = 1 - Math.exp(-dt / timeConstant);
  return current + (target - current) * alpha;
}
