/**
 * Constantes compartidas por la lógica y la escena 3D.
 * La lógica pura solo depende de este archivo y de math.js, de modo que
 * pueda probarse con Vitest sin cargar Three.js ni WebGL.
 */
export const LANES = Object.freeze([-2.6, 0, 2.6]);

export const GAME_CONFIG = Object.freeze({
  lanes: LANES,

  // Reglas
  lives: 3,
  crystalGoal: 15,

  // Velocidad y dificultad
  baseSpeed: 24,
  maxSpeed: 46,
  speedGainPerMeter: 0.02,
  difficultyDistance: 1100,

  // Puntuación
  scorePerMeter: 1.25,
  crystalPoints: 100,
  collisionPenalty: 75,
  lifeBonus: 250,

  // Jugador
  jumpVelocity: 10.4,
  gravity: -33,
  laneChangeRate: 15,
  playerWidth: 0.8,
  playerHeight: 1.72,
  playerDepth: 0.9,
  playerZ: 0,

  // Combate / recogida
  invulnerabilityTime: 1.5,
  crystalPickupRadius: 1.3,

  // Mundo
  spawnZ: -120,
  removeZ: 12,
});
