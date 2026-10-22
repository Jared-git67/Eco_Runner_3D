export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Interpolación independiente de los FPS.
 * lambda alto = convergencia rápida.
 */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function randomRange(min, max, rng = Math.random) {
  return min + rng() * (max - min);
}
