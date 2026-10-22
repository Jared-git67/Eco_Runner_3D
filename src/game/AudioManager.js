/**
 * Efectos de sonido sintetizados con Web Audio. No usa archivos externos.
 * El contexto se crea únicamente tras una interacción del usuario.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = this._readMutedPreference();
  }

  _readMutedPreference() {
    try {
      return window.localStorage.getItem('eco-runner-muted') === '1';
    } catch {
      return false;
    }
  }

  _saveMutedPreference() {
    try {
      window.localStorage.setItem('eco-runner-muted', this.muted ? '1' : '0');
    } catch {
      // Almacenamiento no disponible (modo privado estricto): no es crítico.
    }
  }

  unlock() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;

      this.ctx = new AudioContextClass();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.16;
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.16, this.ctx.currentTime, 0.02);
    }
    this._saveMutedPreference();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    if (!this.muted) this.unlock();
    return this.muted;
  }

  _tone({ frequency, endFrequency = frequency, duration = 0.15, type = 'sine', volume = 0.4, delay = 0 }) {
    if (!this.ctx || this.muted) return;

    const start = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  collect() {
    this._tone({ frequency: 880, endFrequency: 1320, duration: 0.11, type: 'sine', volume: 0.28 });
    this._tone({
      frequency: 1560,
      endFrequency: 1960,
      duration: 0.1,
      type: 'triangle',
      volume: 0.16,
      delay: 0.055,
    });
  }

  jump() {
    this._tone({ frequency: 180, endFrequency: 440, duration: 0.16, type: 'triangle', volume: 0.2 });
  }

  hit() {
    this._tone({ frequency: 160, endFrequency: 48, duration: 0.3, type: 'sawtooth', volume: 0.42 });
    this._tone({ frequency: 92, endFrequency: 38, duration: 0.24, type: 'square', volume: 0.18 });
  }

  pause() {
    this._tone({ frequency: 520, endFrequency: 380, duration: 0.1, type: 'sine', volume: 0.2 });
  }

  start() {
    this._tone({ frequency: 220, endFrequency: 880, duration: 0.28, type: 'triangle', volume: 0.18 });
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((frequency, index) => {
      this._tone({
        frequency,
        endFrequency: frequency * 1.01,
        duration: 0.28,
        type: 'triangle',
        volume: 0.22,
        delay: index * 0.11,
      });
    });
  }

  lose() {
    const notes = [329.63, 261.63, 196, 146.83];
    notes.forEach((frequency, index) => {
      this._tone({
        frequency,
        endFrequency: frequency * 0.94,
        duration: 0.3,
        type: 'sawtooth',
        volume: 0.15,
        delay: index * 0.13,
      });
    });
  }
}
