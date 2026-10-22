import { GAME_CONFIG } from './config.js';

/**
 * Colisiones numéricas en AABB. No usan Box3 para poder ejecutarse en tests
 * sin Three.js y para controlar con precisión el margen de salto y el barrido
 * en Z (evita atravesar obstáculos a bajos FPS).
 */
export function getPlayerBounds(state, config = GAME_CONFIG) {
  const z = config.playerZ;
  return {
    minX: state.playerX - config.playerWidth / 2,
    maxX: state.playerX + config.playerWidth / 2,
    minY: state.playerY,
    maxY: state.playerY + config.playerHeight,
    minZ: z - config.playerDepth / 2,
    maxZ: z + config.playerDepth / 2,
  };
}

export function getObstacleBounds(obstacle) {
  const width = obstacle.width ?? 1.9;
  const height = obstacle.height ?? 1;
  const depth = obstacle.depth ?? 0.7;
  return {
    minX: obstacle.x - width / 2,
    maxX: obstacle.x + width / 2,
    minY: 0,
    maxY: height,
    minZ: obstacle.z - depth / 2,
    maxZ: obstacle.z + depth / 2,
  };
}

/**
 * @param {object} state
 * @param {object} obstacle {x, z, width, height, depth, type, hit}
 * @param {object} config
 * @param {number} speed velocidad actual (unidades/s)
 * @param {number} dt delta de la simulación
 */
export function obstacleHitsPlayer(state, obstacle, config = GAME_CONFIG, speed = 0, dt = 0) {
  if (obstacle.hit) return false;

  const player = getPlayerBounds(state, config);
  const box = getObstacleBounds(obstacle);

  // El obstáculo avanza hacia +Z. Se amplía su borde delantero para no
  // atravesarlo cuando el paso de simulación es grande.
  const sweep = Math.max(0, speed) * Math.max(0, dt) + 0.04;

  const overlapX = player.maxX > box.minX && player.minX < box.maxX;
  const overlapY = player.maxY > box.minY && player.minY < box.maxY - 0.045;
  const overlapZ = player.maxZ > box.minZ && player.minZ < box.maxZ + sweep;

  return overlapX && overlapY && overlapZ;
}

/**
 * Recogida con volumen elipsoidal y barrido en Z. El jugador puede recoger
 * cristales sin necesidad de saltar, pero también al hacerlo.
 */
export function crystalIsCollected(state, crystal, config = GAME_CONFIG, speed = 0, dt = 0) {
  if (crystal.collected) return false;

  const centerX = state.playerX;
  const centerY = state.playerY + config.playerHeight * 0.5;
  const centerZ = config.playerZ;

  const radius = config.crystalPickupRadius;
  const zRadius = radius + Math.max(0, speed) * Math.max(0, dt) * 0.5;

  const dx = centerX - crystal.x;
  const dy = centerY - crystal.y;
  const dz = centerZ - crystal.z;

  return (dx * dx + dy * dy) / (radius * radius) + (dz * dz) / (zRadius * zRadius) <= 1;
}
