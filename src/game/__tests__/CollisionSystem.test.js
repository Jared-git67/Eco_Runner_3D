import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../config.js';
import { GameState } from '../GameState.js';
import { crystalIsCollected, obstacleHitsPlayer } from '../CollisionSystem.js';

function createState() {
  const state = new GameState(GAME_CONFIG);
  state.start();
  return state;
}

function barrier(overrides = {}) {
  return {
    x: 0,
    z: 0,
    width: 1.96,
    height: 1.02,
    depth: 0.7,
    type: 'barrier',
    hit: false,
    ...overrides,
  };
}

function block(overrides = {}) {
  return {
    x: 0,
    z: 0,
    width: 1.96,
    height: 2.9,
    depth: 1.15,
    type: 'block',
    hit: false,
    ...overrides,
  };
}

describe('CollisionSystem: obstáculos', () => {
  it('detecta una barrera en el mismo carril', () => {
    const state = createState();
    expect(obstacleHitsPlayer(state, barrier(), GAME_CONFIG, 24, 1 / 60)).toBe(true);
  });

  it('no detecta la barrera si el jugador está por encima', () => {
    const state = createState();
    state.playerY = 1.15;
    expect(obstacleHitsPlayer(state, barrier(), GAME_CONFIG, 24, 1 / 60)).toBe(false);
  });

  it('detecta la barrera si el salto aún es demasiado bajo', () => {
    const state = createState();
    state.playerY = 0.7;
    expect(obstacleHitsPlayer(state, barrier(), GAME_CONFIG, 24, 1 / 60)).toBe(true);
  });

  it('no detecta obstáculos de otro carril', () => {
    const state = createState();
    expect(obstacleHitsPlayer(state, barrier({ x: 2.6 }), GAME_CONFIG, 24, 1 / 60)).toBe(false);
  });

  it('los muros altos siguen golpeando durante el salto', () => {
    const state = createState();
    state.playerY = 1.55;
    expect(obstacleHitsPlayer(state, block(), GAME_CONFIG, 24, 1 / 60)).toBe(true);
  });

  it('ignora obstáculos ya marcados como impactados', () => {
    const state = createState();
    expect(obstacleHitsPlayer(state, barrier({ hit: true }), GAME_CONFIG, 24, 1 / 60)).toBe(false);
  });

  it('usa barrido en Z para no atravesar a alta velocidad', () => {
    const state = createState();
    // A 46 u/s durante 50 ms el obstáculo avanza 2,3 unidades.
    expect(obstacleHitsPlayer(state, barrier({ z: -1.7 }), GAME_CONFIG, 46, 0.05)).toBe(true);
    expect(obstacleHitsPlayer(state, barrier({ z: -1.7 }), GAME_CONFIG, 0, 0)).toBe(false);
  });
});

describe('CollisionSystem: cristales', () => {
  it('recoge un cristal alineado con el jugador', () => {
    const state = createState();
    const crystal = { x: 0, y: 1.2, z: 0, collected: false };
    expect(crystalIsCollected(state, crystal, GAME_CONFIG, 24, 1 / 60)).toBe(true);
  });

  it('no recoge cristales de otro carril ni demasiado altos', () => {
    const state = createState();
    expect(crystalIsCollected(state, { x: 2.6, y: 1.2, z: 0 }, GAME_CONFIG, 24, 1 / 60)).toBe(false);
    expect(crystalIsCollected(state, { x: 0, y: 3.4, z: 0 }, GAME_CONFIG, 24, 1 / 60)).toBe(false);
  });

  it('no recoge dos veces el mismo cristal', () => {
    const state = createState();
    const crystal = { x: 0, y: 1.2, z: 0, collected: true };
    expect(crystalIsCollected(state, crystal, GAME_CONFIG, 24, 1 / 60)).toBe(false);
  });

  it('amplía el radio en Z a alta velocidad para evitar túneles', () => {
    const state = createState();
    const crystal = { x: 0, y: 1.2, z: -2.3, collected: false };
    expect(crystalIsCollected(state, crystal, GAME_CONFIG, 0, 0)).toBe(false);
    expect(crystalIsCollected(state, crystal, GAME_CONFIG, 46, 0.05)).toBe(true);
  });
});
