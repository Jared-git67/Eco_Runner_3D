import { GAME_CONFIG, LANES } from './config.js';
import { clamp } from './math.js';

export const GameStatus = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WON: 'won',
  LOST: 'lost',
});

/**
 * Estado y física del juego, sin ninguna dependencia de Three.js.
 * Toda la partida se puede simular y probar de forma determinista.
 */
export class GameState {
  constructor(config = GAME_CONFIG) {
    this.config = config;
    this.status = GameStatus.MENU;
    this.resetValues();
  }

  resetValues() {
    this.lives = this.config.lives;
    this.crystals = 0;
    this.score = 0;
    this.distance = 0;
    this.speed = this.config.baseSpeed;
    this.laneIndex = Math.floor(LANES.length / 2);
    this.playerX = LANES[this.laneIndex];
    this.targetX = this.playerX;
    this.playerY = 0;
    this.velocityY = 0;
    this.grounded = true;
    this.invulnerable = 0;
    this.runTime = 0;
    this.hitFlash = 0;
  }

  get difficulty() {
    return clamp(this.distance / this.config.difficultyDistance, 0, 1);
  }

  get progress() {
    return clamp(this.crystals / this.config.crystalGoal, 0, 1);
  }

  get isPlaying() {
    return this.status === GameStatus.PLAYING;
  }

  get isInvulnerable() {
    return this.invulnerable > 0;
  }

  start() {
    this.resetValues();
    this.status = GameStatus.PLAYING;
  }

  restart() {
    this.start();
  }

  toMenu() {
    this.resetValues();
    this.status = GameStatus.MENU;
  }

  pause() {
    if (this.status !== GameStatus.PLAYING) return false;
    this.status = GameStatus.PAUSED;
    return true;
  }

  resume() {
    if (this.status !== GameStatus.PAUSED) return false;
    this.status = GameStatus.PLAYING;
    return true;
  }

  moveLane(direction) {
    if (!this.isPlaying) return false;
    const next = clamp(this.laneIndex + Math.sign(direction), 0, LANES.length - 1);
    if (next === this.laneIndex) return false;
    this.laneIndex = next;
    this.targetX = LANES[next];
    return true;
  }

  jump() {
    if (!this.isPlaying || !this.grounded) return false;
    this.velocityY = this.config.jumpVelocity;
    this.grounded = false;
    return true;
  }

  update(dt) {
    if (!this.isPlaying) return;

    // Evita saltos enormes de simulación tras un cambio de pestaña.
    const step = clamp(dt, 0, 0.05);
    this.runTime += step;

    this.speed = Math.min(
      this.config.maxSpeed,
      this.config.baseSpeed + this.distance * this.config.speedGainPerMeter,
    );

    const metres = this.speed * step;
    this.distance += metres;
    this.score += metres * this.config.scorePerMeter;

    const laneBlend = 1 - Math.exp(-this.config.laneChangeRate * step);
    this.playerX += (this.targetX - this.playerX) * laneBlend;
    if (Math.abs(this.targetX - this.playerX) < 0.004) {
      this.playerX = this.targetX;
    }

    if (!this.grounded) {
      this.velocityY += this.config.gravity * step;
      this.playerY += this.velocityY * step;
      if (this.playerY <= 0) {
        this.playerY = 0;
        this.velocityY = 0;
        this.grounded = true;
      }
    }

    this.invulnerable = Math.max(0, this.invulnerable - step);
    this.hitFlash = Math.max(0, this.hitFlash - step);
  }

  /**
   * Aplica daño solo si la partida sigue activa y no hay invulnerabilidad.
   * Devuelve true únicamente cuando se resta una vida de verdad.
   */
  applyDamage() {
    if (!this.isPlaying || this.invulnerable > 0) return false;

    this.lives = Math.max(0, this.lives - 1);
    this.invulnerable = this.config.invulnerabilityTime;
    this.hitFlash = 0.45;
    this.score = Math.max(0, Math.round(this.score) - this.config.collisionPenalty);

    if (this.lives <= 0) {
      this.status = GameStatus.LOST;
    }
    return true;
  }

  collectCrystal() {
    if (!this.isPlaying) return false;

    this.crystals += 1;
    this.score += this.config.crystalPoints;

    if (this.crystals >= this.config.crystalGoal) {
      this.crystals = this.config.crystalGoal;
      this.score += this.lives * this.config.lifeBonus;
      this.status = GameStatus.WON;
    }
    return true;
  }

  /** Instantánea para HUD, depuración y pruebas de integración. */
  snapshot() {
    return {
      status: this.status,
      lives: this.lives,
      crystals: this.crystals,
      score: Math.round(this.score),
      distance: Math.round(this.distance),
      speed: Number(this.speed.toFixed(2)),
      difficulty: Number(this.difficulty.toFixed(2)),
      laneIndex: this.laneIndex,
      playerX: Number(this.playerX.toFixed(3)),
      playerY: Number(this.playerY.toFixed(3)),
      grounded: this.grounded,
      invulnerable: Number(this.invulnerable.toFixed(2)),
    };
  }
}
