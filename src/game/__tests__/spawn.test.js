import { describe, expect, it } from 'vitest';
import {
  chooseCrystalLane,
  createObstaclePattern,
  CRYSTAL_SAFE_DISTANCE,
  nextCrystalDelay,
  nextObstacleDelay,
  ObstacleType,
  pickLaneAvoiding,
} from '../spawn.js';

function seededRandom(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

describe('generación de obstáculos', () => {
  it('en dificultad inicial genera un único obstáculo', () => {
    const rng = seededRandom(10);
    for (let i = 0; i < 20; i += 1) {
      const pattern = createObstaclePattern(0, rng);
      expect(pattern).toHaveLength(1);
    }
  });

  it('nunca deja un muro de tres bloques altos imposible de esquivar', () => {
    for (let seed = 1; seed <= 80; seed += 1) {
      const rng = seededRandom(seed);
      for (let i = 0; i < 30; i += 1) {
        const pattern = createObstaclePattern(seed / 80, rng);
        const lanes = pattern.map((item) => item.lane);
        expect(new Set(lanes).size).toBe(lanes.length);
        expect(pattern.length).toBeGreaterThanOrEqual(1);
        expect(pattern.length).toBeLessThanOrEqual(3);

        const blocks = pattern.filter((item) => item.type === ObstacleType.BLOCK);
        expect(blocks.length).toBeLessThan(3);

        if (pattern.length === 3) {
          expect(pattern.every((item) => item.type === ObstacleType.BARRIER)).toBe(true);
        }
      }
    }
  });

  it('genera patrones de muro completo saltable en dificultades altas', () => {
    const rng = seededRandom(77);
    let fullBarrier = 0;
    for (let i = 0; i < 500; i += 1) {
      const pattern = createObstaclePattern(1, rng);
      if (pattern.length === 3 && pattern.every((item) => item.type === ObstacleType.BARRIER)) {
        fullBarrier += 1;
      }
    }
    expect(fullBarrier).toBeGreaterThan(0);
  });

  it('reduce el tiempo entre obstáculos al subir la dificultad', () => {
    const easyRng = seededRandom(3);
    const hardRng = seededRandom(3);
    let easy = 0;
    let hard = 0;
    for (let i = 0; i < 200; i += 1) {
      easy += nextObstacleDelay(0, easyRng);
      hard += nextObstacleDelay(1, hardRng);
    }
    expect(hard).toBeLessThan(easy);
    expect(nextObstacleDelay(0.5, seededRandom(1))).toBeGreaterThan(0.5);
  });
});

describe('selección segura de carriles', () => {
  it('elige el único carril libre', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(pickLaneAvoiding([0, 2], seededRandom(i + 1))).toBe(1);
    }
  });

  it('devuelve null si todos los carriles están bloqueados', () => {
    expect(pickLaneAvoiding([0, 1, 2])).toBeNull();
  });

  it('el retardo de cristales se mantiene positivo y pausado', () => {
    for (let i = 0; i < 50; i += 1) {
      const delay = nextCrystalDelay(i / 50, seededRandom(i + 11));
      expect(delay).toBeGreaterThan(2.5);
      expect(delay).toBeLessThan(4.1);
    }
  });
});

describe('generación segura de cristales', () => {
  it('elige un carril libre para toda la formación', () => {
    const obstacles = [
      { lane: 0, z: -126, depth: 0.7 },
      { lane: 1, z: -110, depth: 1.15 },
    ];
    for (let seed = 1; seed <= 20; seed += 1) {
      expect(chooseCrystalLane(obstacles, [-124, -142], CRYSTAL_SAFE_DISTANCE, seededRandom(seed))).toBe(2);
    }
  });

  it('descarta un carril con un obstáculo cerca de cualquier cristal de la formación', () => {
    const obstacles = [{ lane: 1, z: -142, depth: 0.7 }];
    for (let seed = 1; seed <= 20; seed += 1) {
      const lane = chooseCrystalLane(obstacles, [-124, -142], CRYSTAL_SAFE_DISTANCE, seededRandom(seed));
      expect(lane).not.toBe(1);
    }
  });

  it('devuelve null si los tres carriles están bloqueados', () => {
    const obstacles = [
      { lane: 0, z: -124 },
      { lane: 1, z: -124 },
      { lane: 2, z: -124 },
    ];
    expect(chooseCrystalLane(obstacles, [-124], CRYSTAL_SAFE_DISTANCE, seededRandom(1))).toBeNull();
  });

  it('no considera peligroso un obstáculo suficientemente lejos', () => {
    const obstacles = [
      { lane: 0, z: -80 },
      { lane: 1, z: -80 },
    ];
    for (let seed = 1; seed <= 20; seed += 1) {
      const lane = chooseCrystalLane(obstacles, [-140], CRYSTAL_SAFE_DISTANCE, seededRandom(seed));
      expect(lane).not.toBeNull();
    }
  });
});
