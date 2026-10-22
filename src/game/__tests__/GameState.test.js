import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../config.js';
import { GameState, GameStatus } from '../GameState.js';

const step = 1 / 60;

function advance(state, seconds) {
  const iterations = Math.ceil(seconds / step);
  for (let i = 0; i < iterations; i += 1) state.update(step);
}

describe('GameState', () => {
  it('inicia y reinicia con todos los valores restaurados', () => {
    const state = new GameState(GAME_CONFIG);
    expect(state.status).toBe(GameStatus.MENU);

    state.start();
    state.moveLane(1);
    state.score = 900;
    state.crystals = 4;
    state.distance = 300;
    state.lives = 1;
    advance(state, 0.2);

    state.restart();
    expect(state.status).toBe(GameStatus.PLAYING);
    expect(state.lives).toBe(3);
    expect(state.crystals).toBe(0);
    expect(state.score).toBe(0);
    expect(state.distance).toBe(0);
    expect(state.speed).toBe(GAME_CONFIG.baseSpeed);
    expect(state.laneIndex).toBe(1);
    expect(state.playerX).toBe(0);
    expect(state.playerY).toBe(0);
    expect(state.grounded).toBe(true);
    expect(state.invulnerable).toBe(0);
  });

  it('cambia de carril y respeta los límites', () => {
    const state = new GameState(GAME_CONFIG);
    state.start();

    expect(state.moveLane(-1)).toBe(true);
    expect(state.laneIndex).toBe(0);
    expect(state.moveLane(-1)).toBe(false);
    expect(state.laneIndex).toBe(0);

    expect(state.moveLane(1)).toBe(true);
    expect(state.moveLane(1)).toBe(true);
    expect(state.laneIndex).toBe(2);
    expect(state.moveLane(1)).toBe(false);

    advance(state, 1);
    expect(state.playerX).toBeCloseTo(2.6, 3);
  });

  it('impulsa un salto y aterriza sin permitir doble salto', () => {
    const state = new GameState(GAME_CONFIG);
    state.start();

    expect(state.jump()).toBe(true);
    expect(state.grounded).toBe(false);
    state.update(0.1);
    expect(state.playerY).toBeGreaterThan(0);
    expect(state.jump()).toBe(false);

    advance(state, 1.5);
    expect(state.grounded).toBe(true);
    expect(state.playerY).toBe(0);
    expect(state.jump()).toBe(true);
  });

  it('resta una sola vida por impacto y aplica invulnerabilidad', () => {
    const state = new GameState(GAME_CONFIG);
    state.start();

    expect(state.applyDamage()).toBe(true);
    expect(state.lives).toBe(2);
    expect(state.isInvulnerable).toBe(true);

    expect(state.applyDamage()).toBe(false);
    expect(state.applyDamage()).toBe(false);
    expect(state.lives).toBe(2);

    advance(state, GAME_CONFIG.invulnerabilityTime + 0.1);
    expect(state.applyDamage()).toBe(true);
    expect(state.lives).toBe(1);

    advance(state, GAME_CONFIG.invulnerabilityTime + 0.1);
    expect(state.applyDamage()).toBe(true);
    expect(state.lives).toBe(0);
    expect(state.status).toBe(GameStatus.LOST);
    expect(state.applyDamage()).toBe(false);
  });

  it('congela la simulación en pausa y la reanuda', () => {
    const state = new GameState(GAME_CONFIG);
    state.start();
    advance(state, 0.5);

    const distance = state.distance;
    const score = state.score;
    expect(state.pause()).toBe(true);
    expect(state.status).toBe(GameStatus.PAUSED);

    state.update(2);
    expect(state.distance).toBe(distance);
    expect(state.score).toBe(score);

    expect(state.resume()).toBe(true);
    state.update(step);
    expect(state.distance).toBeGreaterThan(distance);
    expect(state.score).toBeGreaterThan(score);
  });

  it('gana exactamente al recolectar 15 cristales', () => {
    const state = new GameState(GAME_CONFIG);
    state.start();

    for (let i = 0; i < GAME_CONFIG.crystalGoal - 1; i += 1) {
      expect(state.collectCrystal()).toBe(true);
    }
    expect(state.status).toBe(GameStatus.PLAYING);
    expect(state.crystals).toBe(14);

    expect(state.collectCrystal()).toBe(true);
    expect(state.crystals).toBe(GAME_CONFIG.crystalGoal);
    expect(state.status).toBe(GameStatus.WON);
    expect(state.collectCrystal()).toBe(false);
    expect(state.crystals).toBe(GAME_CONFIG.crystalGoal);
  });

  it('suma puntuación por distancia y limita la velocidad máxima', () => {
    const state = new GameState(GAME_CONFIG);
    state.start();
    advance(state, 2);

    expect(state.score).toBeGreaterThan(0);
    expect(state.distance).toBeGreaterThan(0);
    expect(state.speed).toBeGreaterThan(GAME_CONFIG.baseSpeed);

    state.distance = 5000;
    state.update(step);
    expect(state.speed).toBe(GAME_CONFIG.maxSpeed);
    expect(state.difficulty).toBe(1);
  });
});
