import { GameStatus } from './GameState.js';

/**
 * Teclado, atajos globales y gestos de deslizamiento en el lienzo.
 * Los botones táctiles visibles se conectan desde UI.
 */
export class InputManager {
  constructor({ canvas, getStatus, onLeft, onRight, onJump, onPause, onResume, onStart, onRestart, onMenu, onMute }) {
    this.canvas = canvas;
    this.getStatus = getStatus;
    this.onLeft = onLeft;
    this.onRight = onRight;
    this.onJump = onJump;
    this.onPause = onPause;
    this.onResume = onResume;
    this.onStart = onStart;
    this.onRestart = onRestart;
    this.onMenu = onMenu;
    this.onMute = onMute;

    this.swipe = null;
    this.bound = false;
    this.keyHandler = this._onKeyDown.bind(this);
    this.pointerDownHandler = this._onPointerDown.bind(this);
    this.pointerUpHandler = this._onPointerUp.bind(this);
    this.pointerCancelHandler = () => {
      this.swipe = null;
    };
  }

  connect() {
    if (this.bound) return;
    this.bound = true;
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('pointerdown', this.pointerDownHandler, { passive: false });
    this.canvas.addEventListener('pointerup', this.pointerUpHandler, { passive: false });
    this.canvas.addEventListener('pointercancel', this.pointerCancelHandler);
  }

  _onKeyDown(event) {
    const code = event.code;
    const status = this.getStatus();

    if (code === 'Space' || code === 'Enter') {
      event.preventDefault();
    }

    if (event.repeat) return;

    if (code === 'KeyM') {
      this.onMute?.();
      return;
    }

    if (code === 'Escape' || code === 'KeyP') {
      if (status === GameStatus.PLAYING) {
        this.onPause?.();
      } else if (status === GameStatus.PAUSED) {
        this.onResume?.();
      } else if (status === GameStatus.WON || status === GameStatus.LOST) {
        this.onMenu?.();
      }
      return;
    }

    if (code === 'KeyR' && status !== GameStatus.MENU) {
      this.onRestart?.();
      return;
    }

    if (status === GameStatus.PLAYING) {
      if (code === 'ArrowLeft' || code === 'KeyA') {
        event.preventDefault();
        this.onLeft?.();
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        event.preventDefault();
        this.onRight?.();
      } else if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        this.onJump?.();
      }
      return;
    }

    if (status === GameStatus.PAUSED) {
      if (code === 'Space' || code === 'Enter') {
        this.onResume?.();
      }
      return;
    }

    if (status === GameStatus.MENU) {
      if (code === 'Space' || code === 'Enter') {
        this.onStart?.();
      }
      return;
    }

    if (status === GameStatus.WON || status === GameStatus.LOST) {
      if (code === 'Space' || code === 'Enter') {
        this.onRestart?.();
      }
    }
  }

  _onPointerDown(event) {
    if (event.pointerType !== 'touch') return;
    if (this.getStatus() !== GameStatus.PLAYING) return;
    this.swipe = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
  }

  _onPointerUp(event) {
    if (!this.swipe || event.pointerId !== this.swipe.id) return;

    const dx = event.clientX - this.swipe.x;
    const dy = event.clientY - this.swipe.y;
    const elapsed = performance.now() - this.swipe.time;
    this.swipe = null;

    if (elapsed > 700) return;

    if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx > 0) this.onRight?.();
      else this.onLeft?.();
    } else if (dy < -38 && Math.abs(dy) > Math.abs(dx)) {
      this.onJump?.();
    }
  }

  destroy() {
    if (!this.bound) return;
    this.bound = false;
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('pointerdown', this.pointerDownHandler);
    this.canvas.removeEventListener('pointerup', this.pointerUpHandler);
    this.canvas.removeEventListener('pointercancel', this.pointerCancelHandler);
  }
}
