import * as THREE from 'three';
import { GAME_CONFIG } from './config.js';
import { GameState, GameStatus } from './GameState.js';
import { crystalIsCollected, obstacleHitsPlayer } from './CollisionSystem.js';
import { World } from './World.js';
import { PlayerModel } from './PlayerModel.js';
import { ObstacleManager } from './ObstacleManager.js';
import { CrystalManager } from './CrystalManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { AudioManager } from './AudioManager.js';
import { CRYSTAL_SAFE_DISTANCE } from './spawn.js';
import { UI } from './UI.js';
import { InputManager } from './InputManager.js';

const BEST_KEY = 'eco-runner-best';

/**
 * Orquestador: conecta estado puro, escena, UI, audio y entrada.
 * Un único bucle requestAnimationFrame controla toda la partida.
 */
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.config = GAME_CONFIG;
    this.state = new GameState(this.config);

    this.world = new World(canvas);
    this.player = new PlayerModel(this.world.scene);
    this.obstacles = new ObstacleManager(this.world.scene, this.config);
    this.crystals = new CrystalManager(this.world.scene, this.obstacles, this.config);
    this.obstacles.setReservedLanesProvider((z) => this.crystals.getLanesNear(z, CRYSTAL_SAFE_DISTANCE));
    this.particles = new ParticleSystem(this.world.scene);
    this.audio = new AudioManager();
    this.ui = new UI();

    this.bestScore = this._readBest();
    this.lastTimestamp = 0;
    this.roundEnded = false;
    this.rafId = 0;
    this.initialized = false;

    this._handleResize = this._handleResize.bind(this);
    this._handleVisibility = this._handleVisibility.bind(this);
    this._loop = this._loop.bind(this);
  }

  _readBest() {
    try {
      const value = Number(window.localStorage.getItem(BEST_KEY));
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    } catch {
      return 0;
    }
  }

  _saveBest(score) {
    if (score <= this.bestScore) return;
    this.bestScore = Math.round(score);
    try {
      window.localStorage.setItem(BEST_KEY, String(this.bestScore));
    } catch {
      // El juego funciona igual sin almacenamiento persistente.
    }
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.ui.bindActions({
      play: () => this.startGame(),
      pause: () => this.pauseGame(),
      sound: () => this.toggleSound(),
      resume: () => this.resumeGame(),
      restartPause: () => this.restartGame(),
      menuPause: () => this.goToMenu(),
      restartWin: () => this.restartGame(),
      menuWin: () => this.goToMenu(),
      restartLose: () => this.restartGame(),
      menuLose: () => this.goToMenu(),
    });

    this.ui.bindTouchControls({
      left: () => this.handleLeft(),
      right: () => this.handleRight(),
      jump: () => this.handleJump(),
    });

    this.input = new InputManager({
      canvas: this.canvas,
      getStatus: () => this.state.status,
      onLeft: () => this.handleLeft(),
      onRight: () => this.handleRight(),
      onJump: () => this.handleJump(),
      onPause: () => this.pauseGame(),
      onResume: () => this.resumeGame(),
      onStart: () => this.startGame(),
      onRestart: () => this.restartGame(),
      onMenu: () => this.goToMenu(),
      onMute: () => this.toggleSound(),
    });
    this.input.connect();

    window.addEventListener('resize', this._handleResize);
    window.addEventListener('orientationchange', this._handleResize);
    document.addEventListener('visibilitychange', this._handleVisibility);

    this.ui.updateBest(this.bestScore);
    this.ui.setSoundState(this.audio.muted);
    this.ui.setLives(this.state.lives, this.config.lives);
    this.ui.setScore(0);
    this.ui.setDistance(0);
    this.ui.setCrystals(0, this.config.crystalGoal);
    this.ui.setHudVisible(false);
    this.ui.setTouchVisible(false);
    this.ui.showScreen('menu');

    this.world.resetEnvironment();
    this.player.sync(this.state, 0, false);

    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this._loop);
  }

  startGame() {
    this.audio.unlock();
    this.audio.start();
    this.state.start();
    this._prepareRound();

    this.roundEnded = false;
    this.lastTimestamp = performance.now();

    this.ui.setLives(this.state.lives, this.config.lives);
    this.ui.setScore(0);
    this.ui.setDistance(0);
    this.ui.setCrystals(0, this.config.crystalGoal);
    this.ui.hideOverlay();
    this.ui.setHudVisible(true);
    this.ui.setTouchVisible(true);
    document.body.classList.add('game-active');
    document.body.classList.remove('game-paused', 'game-ended');

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  _prepareRound() {
    this.obstacles.reset();
    this.crystals.reset();
    this.particles.reset();
    this.crystals.prime();
    this.world.resetEnvironment();
    this.player.sync(this.state, 0, true);
  }

  pauseGame() {
    if (!this.state.pause()) return;
    this.audio.pause();
    this.ui.showScreen('pause');
    this.ui.setTouchVisible(false);
    document.body.classList.remove('game-active');
    document.body.classList.add('game-paused');
    this.lastTimestamp = performance.now();
  }

  resumeGame() {
    if (!this.state.resume()) return;
    this.audio.unlock();
    this.ui.hideOverlay();
    this.ui.setHudVisible(true);
    this.ui.setTouchVisible(true);
    document.body.classList.add('game-active');
    document.body.classList.remove('game-paused', 'game-ended');
    this.lastTimestamp = performance.now();
  }

  restartGame() {
    this.audio.unlock();
    this.startGame();
  }

  goToMenu() {
    this.state.toMenu();
    this.obstacles.reset();
    this.crystals.reset();
    this.particles.reset();
    this.player.sync(this.state, 0, false);
    this.world.resetEnvironment();

    this.roundEnded = false;
    this.ui.showScreen('menu');
    this.ui.setHudVisible(false);
    this.ui.setTouchVisible(false);
    this.ui.updateBest(this.bestScore, true);
    document.body.classList.remove('game-active', 'game-paused', 'game-ended');
    this.lastTimestamp = performance.now();
  }

  toggleSound() {
    const muted = this.audio.toggleMuted();
    this.ui.setSoundState(muted);
  }

  handleLeft() {
    if (this.state.moveLane(-1)) this.audio.unlock();
  }

  handleRight() {
    if (this.state.moveLane(1)) this.audio.unlock();
  }

  handleJump() {
    if (this.state.jump()) {
      this.audio.unlock();
      this.audio.jump();
    }
  }

  _updateGameplay(dt) {
    this.obstacles.update(dt, this.state);
    this.crystals.update(dt, this.state);
    this.particles.update(dt);

    this._checkObstacleCollisions(dt);
    if (this.state.status === GameStatus.PLAYING) {
      this._checkCrystalCollisions(dt);
    }

    if (this.state.status !== GameStatus.PLAYING) {
      this._finishRound(this.state.status);
    }
  }

  _checkObstacleCollisions(dt) {
    for (const item of [...this.obstacles.items]) {
      if (!obstacleHitsPlayer(this.state, item, this.config, this.state.speed, dt)) continue;

      const damaged = this.state.applyDamage();
      if (!damaged) continue;

      this.obstacles.markHit(item);
      const position = new THREE.Vector3(item.x, Math.min(item.height * 0.55, 1.3), item.z);
      this.particles.burst(position, 0xff7a3c, 15, 5.4);
      this.world.addShake(0.72);
      this.audio.hit();
      this.ui.flashDamage();
      this.ui.setLives(this.state.lives, this.config.lives);

      if (this.state.status === GameStatus.LOST) break;
    }
  }

  _checkCrystalCollisions(dt) {
    for (const item of [...this.crystals.items]) {
      if (!crystalIsCollected(this.state, item, this.config, this.state.speed, dt)) continue;

      const position = item.group.position.clone();
      this.crystals.remove(item);
      const collected = this.state.collectCrystal();
      if (!collected) continue;

      this.particles.burst(position, 0x48ffb8, 13, 4.6);
      this.audio.collect();
      this.ui.setCrystals(this.state.crystals, this.config.crystalGoal);

      if (this.state.status === GameStatus.WON) break;
    }
  }

  _finishRound(status) {
    if (this.roundEnded) return;
    this.roundEnded = true;

    const score = Math.round(this.state.score);
    this._saveBest(score);
    this.ui.updateBest(this.bestScore);

    const payload = {
      score,
      crystals: this.state.crystals,
      goal: this.config.crystalGoal,
      distance: Math.round(this.state.distance),
      best: this.bestScore,
    };

    this.ui.setHudVisible(false);
    this.ui.setTouchVisible(false);
    document.body.classList.remove('game-active', 'game-paused');
    document.body.classList.add('game-ended');

    if (status === GameStatus.WON) {
      this.audio.win();
      this.ui.showWin(payload);
    } else {
      this.audio.lose();
      this.ui.showLose(payload);
    }
  }

  _syncHud() {
    this.ui.setScore(this.state.score);
    this.ui.setDistance(this.state.distance);
    this.ui.setCrystals(this.state.crystals, this.config.crystalGoal);
    this.ui.setLives(this.state.lives, this.config.lives);
  }

  _loop(timestamp) {
    this.rafId = requestAnimationFrame(this._loop);

    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    let dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    if (!Number.isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 0.05);

    const status = this.state.status;
    let flowSpeed = 0;

    if (status === GameStatus.PLAYING) {
      this.state.update(dt);
      this._updateGameplay(dt);
      flowSpeed = this.state.speed;
    } else if (status === GameStatus.MENU) {
      flowSpeed = 5.5;
      this.particles.update(dt);
    } else if (status === GameStatus.PAUSED) {
      flowSpeed = 0;
    } else {
      this.particles.update(dt);
    }

    const visualStatus = this.state.status;
    const playerDt = visualStatus === GameStatus.PAUSED ? 0 : dt;
    this.player.sync(this.state, playerDt, visualStatus === GameStatus.PLAYING);
    this.world.update(visualStatus === GameStatus.PAUSED ? 0 : dt, this.state, flowSpeed);
    this.world.render();
    this._syncHud();
  }

  _handleResize() {
    this.world.resize(window.innerWidth, window.innerHeight);
  }

  _handleVisibility() {
    if (document.hidden && this.state.status === GameStatus.PLAYING) {
      this.pauseGame();
    }
  }

  /** Datos de solo lectura para depuración y pruebas de integración. */
  getDebugState() {
    return {
      ...this.state.snapshot(),
      best: this.bestScore,
      obstacles: this.obstacles.items.length,
      crystalsActive: this.crystals.items.length,
      screen: this.ui.activeScreen ?? 'none',
      muted: this.audio.muted,
    };
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._handleResize);
    window.removeEventListener('orientationchange', this._handleResize);
    document.removeEventListener('visibilitychange', this._handleVisibility);
    this.input?.destroy();
    this.ui.destroy();
    this.player.dispose();
    this.obstacles.dispose();
    this.crystals.dispose();
    this.particles.dispose();
    this.world.dispose();
    this.initialized = false;
  }
}
