const numberFormat = new Intl.NumberFormat('es-ES');

function formatNumber(value) {
  return numberFormat.format(Math.round(value || 0));
}

/**
 * Capa de interfaz: HUD, pantallas, botones y feedback visual.
 * No conoce la lógica del juego, solo recibe datos y dispara acciones.
 */
export class UI {
  constructor() {
    const $ = (id) => document.getElementById(id);

    this.el = {
      overlay: $('overlay'),
      hud: $('hud'),
      screenMenu: $('screen-menu'),
      screenPause: $('screen-pause'),
      screenWin: $('screen-win'),
      screenLose: $('screen-lose'),
      score: $('hud-score'),
      distance: $('hud-distance'),
      crystals: $('hud-crystals'),
      crystalFill: $('crystal-fill'),
      crystalMeter: document.querySelector('.meter'),
      lives: $('lives'),
      lifeList: [...document.querySelectorAll('#lives .life')],
      damageFlash: $('damage-flash'),
      bestMenu: $('best-menu'),
      winScore: $('win-score'),
      winCrystals: $('win-crystals'),
      winDistance: $('win-distance'),
      winBest: $('win-best'),
      loseScore: $('lose-score'),
      loseCrystals: $('lose-crystals'),
      loseDistance: $('lose-distance'),
      loseBest: $('lose-best'),
      sound: $('btn-sound'),
      touch: $('touch-controls'),
      buttons: {
        play: $('btn-play'),
        pause: $('btn-pause'),
        sound: $('btn-sound'),
        resume: $('btn-resume'),
        restartPause: $('btn-restart-pause'),
        menuPause: $('btn-menu-pause'),
        restartWin: $('btn-restart-win'),
        menuWin: $('btn-menu-win'),
        restartLose: $('btn-restart-lose'),
        menuLose: $('btn-menu-lose'),
      },
    };

    this.screens = {
      menu: this.el.screenMenu,
      pause: this.el.screenPause,
      win: this.el.screenWin,
      lose: this.el.screenLose,
    };

    this.activeScreen = null;
    this.last = { score: null, distance: null, crystals: null, lives: null };
    this.listeners = [];
    this.timers = [];
    this.touchCleanup = [];
    this.focusTimer = 0;
  }

  _listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    this.listeners.push(() => target.removeEventListener(event, handler, options));
  }

  bindActions(actions) {
    for (const [key, button] of Object.entries(this.el.buttons)) {
      if (!button) continue;
      const action = actions[key];
      if (!action) continue;
      this._listen(button, 'click', (event) => {
        event.preventDefault();
        action();
      });
    }
  }

  bindTouchControls(handlers) {
    const buttons = document.querySelectorAll('[data-action]');
    for (const button of buttons) {
      const action = button.dataset.action;
      const handler = handlers[action];
      if (!handler) continue;

      const onPointerDown = (event) => {
        event.preventDefault();
        button.classList.add('is-pressed');
        handler();
      };
      const onPointerUp = () => button.classList.remove('is-pressed');

      button.addEventListener('pointerdown', onPointerDown, { passive: false });
      button.addEventListener('pointerup', onPointerUp);
      button.addEventListener('pointercancel', onPointerUp);
      button.addEventListener('pointerleave', onPointerUp);
      button.addEventListener('contextmenu', (event) => event.preventDefault());

      this.touchCleanup.push(() => {
        button.removeEventListener('pointerdown', onPointerDown);
        button.removeEventListener('pointerup', onPointerUp);
        button.removeEventListener('pointercancel', onPointerUp);
        button.removeEventListener('pointerleave', onPointerUp);
      });
    }
  }

  showScreen(name) {
    const target = this.screens[name];
    if (!target) return;

    for (const screen of Object.values(this.screens)) {
      screen.classList.toggle('is-active', screen === target);
    }
    this.activeScreen = name;

    this.el.overlay.classList.remove('is-hidden');
    this.el.overlay.setAttribute('aria-hidden', 'false');

    const focusTarget = {
      menu: this.el.buttons.play,
      pause: this.el.buttons.resume,
      win: this.el.buttons.restartWin,
      lose: this.el.buttons.restartLose,
    }[name];
    window.clearTimeout(this.focusTimer);
    if (focusTarget) {
      this.focusTimer = window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 80);
    }
  }

  hideOverlay() {
    window.clearTimeout(this.focusTimer);
    this.el.overlay.classList.add('is-hidden');
    this.el.overlay.setAttribute('aria-hidden', 'true');
    this.activeScreen = null;
  }

  setHudVisible(visible) {
    this.el.hud.classList.toggle('is-visible', visible);
    this.el.hud.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  setLives(lives, maxLives = 3) {
    if (this.last.lives === lives) return;
    this.last.lives = lives;

    this.el.lifeList.forEach((life, index) => {
      life.classList.toggle('is-lost', index >= lives);
    });
    this.el.lives.setAttribute('aria-label', `${lives} de ${maxLives} vidas restantes`);
  }

  setScore(score) {
    const value = Math.round(score);
    if (this.last.score === value) return;
    this.last.score = value;
    this.el.score.textContent = formatNumber(value);
  }

  setDistance(distance) {
    const value = Math.round(distance);
    if (this.last.distance === value) return;
    this.last.distance = value;
    this.el.distance.textContent = `${formatNumber(value)} m`;
  }

  setCrystals(crystals, goal) {
    if (this.last.crystals === crystals) return;
    this.last.crystals = crystals;

    this.el.crystals.textContent = `${crystals} / ${goal}`;
    this.el.crystalFill.style.width = `${Math.min(100, (crystals / goal) * 100)}%`;
    this.el.crystalMeter.setAttribute('aria-valuemax', String(goal));
    this.el.crystalMeter.setAttribute('aria-valuenow', String(crystals));

    this.el.crystals.classList.remove('is-pop');
    void this.el.crystals.offsetWidth;
    this.el.crystals.classList.add('is-pop');
    const timeout = window.setTimeout(() => this.el.crystals.classList.remove('is-pop'), 340);
    this.timers.push(timeout);
  }

  flashDamage() {
    this.el.damageFlash.classList.remove('is-active');
    void this.el.damageFlash.offsetWidth;
    this.el.damageFlash.classList.add('is-active');
    const timeout = window.setTimeout(() => {
      this.el.damageFlash.classList.remove('is-active');
    }, 520);
    this.timers.push(timeout);
  }

  updateBest(best, menuOnly = false) {
    const text = `Récord: ${formatNumber(best)}`;
    this.el.bestMenu.textContent = text;
    if (!menuOnly) {
      this.el.winBest.textContent = text;
      this.el.loseBest.textContent = text;
    }
  }

  showWin({ score, crystals, goal, distance, best }) {
    this.el.winScore.textContent = formatNumber(score);
    this.el.winCrystals.textContent = `${crystals} / ${goal}`;
    this.el.winDistance.textContent = `${formatNumber(distance)} m`;
    this.el.winBest.textContent = `Récord: ${formatNumber(best)}`;
    this.showScreen('win');
  }

  showLose({ score, crystals, goal, distance, best }) {
    this.el.loseScore.textContent = formatNumber(score);
    this.el.loseCrystals.textContent = `${crystals} / ${goal}`;
    this.el.loseDistance.textContent = `${formatNumber(distance)} m`;
    this.el.loseBest.textContent = `Récord: ${formatNumber(best)}`;
    this.showScreen('lose');
  }

  setSoundState(muted) {
    this.el.sound.classList.toggle('is-muted', muted);
    this.el.sound.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar sonido');
    this.el.sound.title = muted ? 'Activar sonido (M)' : 'Silenciar sonido (M)';
  }

  setTouchVisible(visible) {
    this.el.touch.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  destroy() {
    for (const remove of this.listeners) remove();
    for (const remove of this.touchCleanup) remove();
    for (const timer of this.timers) window.clearTimeout(timer);
    window.clearTimeout(this.focusTimer);
    this.listeners.length = 0;
    this.touchCleanup.length = 0;
    this.timers.length = 0;
  }
}
