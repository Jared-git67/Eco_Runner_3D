import './style.css';
import { Game } from './game/Game.js';

const canvas = document.getElementById('game-canvas');

function showFatalError(error) {
  console.error('[Eco Runner 3D] No se pudo iniciar el juego:', error);
  const overlay = document.getElementById('overlay');
  if (!overlay) return;

  overlay.classList.remove('is-hidden');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.innerHTML = `
    <section class="screen is-active">
      <div class="panel panel--compact panel--lose">
        <p class="eyebrow"><span class="status-dot status-dot--red"></span> Error del sistema</p>
        <h2 class="screen-title">Sin señal 3D</h2>
        <p class="screen-text">
          No se pudo iniciar WebGL. Actualiza tu navegador, activa la aceleración por hardware
          y vuelve a cargar la página.
        </p>
        <button class="btn btn--primary" type="button" onclick="window.location.reload()">
          Reintentar
        </button>
      </div>
    </section>
  `;
}

try {
  const game = new Game(canvas);
  game.init();

  if (import.meta.env.DEV) {
    window.__ecoRunner = game;
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      game.destroy();
    });
  }
} catch (error) {
  showFatalError(error);
}
