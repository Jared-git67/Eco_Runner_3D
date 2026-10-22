import { LANES } from './config.js';
import { clamp } from './math.js';

export const ObstacleType = Object.freeze({
  BARRIER: 'barrier',
  BLOCK: 'block',
});

export function shuffle(values, rng = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Genera un patrón de obstáculos siempre superable:
 * - Como máximo dos carriles quedan bloqueados por muros altos.
 * - El patrón de tres barreras bajas es saltable de un único salto.
 */
export function createObstaclePattern(difficulty = 0, rng = Math.random) {
  const d = clamp(difficulty, 0, 1);
  const lanes = shuffle([0, 1, 2], rng);

  // Muro completo bajo: obliga a saltar. Solo aparece cuando ya hay ritmo.
  const fullBarrier = d > 0.18 && rng() < 0.07 + d * 0.13;
  if (fullBarrier) {
    return lanes.map((lane) => ({ lane, type: ObstacleType.BARRIER }));
  }

  let count = 1;
  if (d >= 0.1) {
    const oneLaneChance = 0.68 - d * 0.18;
    count = rng() < oneLaneChance ? 1 : 2;
  }

  const chosen = lanes.slice(0, count);
  const blockChance = 0.35 + d * 0.3;

  return chosen.map((lane) => ({
    lane,
    type: rng() < blockChance ? ObstacleType.BLOCK : ObstacleType.BARRIER,
  }));
}

/** Segundos entre patrones. La frecuencia aumenta con la dificultad. */
export function nextObstacleDelay(difficulty = 0, rng = Math.random) {
  const d = clamp(difficulty, 0, 1);
  return 1.6 - d * 0.65 + rng() * 0.55;
}

/** Distancia longitudinal mínima entre un cristal y un obstáculo del mismo carril. */
export const CRYSTAL_SAFE_DISTANCE = 24;

/** Segundos entre formaciones de cristales. */
export function nextCrystalDelay(difficulty = 0, rng = Math.random) {
  const d = clamp(difficulty, 0, 1);
  return 3.3 - d * 0.55 + rng() * 0.7;
}

/**
 * Elige un carril libre para todos los cristales de una formación.
 * Un carril se descarta si contiene un obstáculo a menos de
 * CRYSTAL_SAFE_DISTANCE de cualquiera de las posiciones previstas.
 */
export function chooseCrystalLane(obstacles, positions, clearance = CRYSTAL_SAFE_DISTANCE, rng = Math.random) {
  const blocked = new Set();

  for (const obstacle of obstacles) {
    const depth = obstacle.depth ?? 1;
    for (const position of positions) {
      if (Math.abs(obstacle.z - position) < clearance + depth / 2) {
        blocked.add(obstacle.lane);
        break;
      }
    }
  }

  return pickLaneAvoiding([...blocked], rng);
}

/** Elige un carril que no esté bloqueado, o null si todos lo están. */
export function pickLaneAvoiding(blockedLanes, rng = Math.random) {
  const blocked = new Set(blockedLanes);
  const free = LANES.map((_, index) => index).filter((lane) => !blocked.has(lane));
  if (free.length === 0) return null;
  return free[Math.min(free.length - 1, Math.floor(rng() * free.length))];
}
