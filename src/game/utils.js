import * as THREE from 'three';

/** Textura radial reutilizable para brillos, partículas y sombras. */
export function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export function createShadowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.95)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0.55)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

/** Suelo técnico con rejilla de neón. La textura se desplaza al correr. */
export function createGridTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#040b13';
  ctx.fillRect(0, 0, size, size);

  // Degradado sutil para dar profundidad al material.
  const wash = ctx.createLinearGradient(0, 0, size, size);
  wash.addColorStop(0, 'rgba(13, 55, 61, 0.22)');
  wash.addColorStop(0.5, 'rgba(3, 14, 23, 0)');
  wash.addColorStop(1, 'rgba(8, 43, 54, 0.2)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, size, size);

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(48, 190, 186, 0.18)';
  ctx.beginPath();
  for (let i = 0; i <= size; i += 64) {
    ctx.moveTo(i + 0.5, 0);
    ctx.lineTo(i + 0.5, size);
    ctx.moveTo(0, i + 0.5);
    ctx.lineTo(size, i + 0.5);
  }
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(61, 255, 213, 0.62)';
  ctx.shadowColor = 'rgba(56, 255, 190, 0.85)';
  ctx.shadowBlur = 9;
  ctx.beginPath();
  for (let i = 0; i <= size; i += 128) {
    ctx.moveTo(i + 0.5, 0);
    ctx.lineTo(i + 0.5, size);
    ctx.moveTo(0, i + 0.5);
    ctx.lineTo(size, i + 0.5);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Franjas de peligro para las barreras bajas. */
export function createHazardTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#160905';
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 4);
  for (let x = -size * 1.5; x < size * 1.5; x += 56) {
    ctx.fillStyle = 'rgba(255, 99, 38, 0.95)';
    ctx.fillRect(x, -size, 24, size * 2);
    ctx.fillStyle = 'rgba(255, 205, 92, 0.55)';
    ctx.fillRect(x + 24, -size, 3, size * 2);
  }
  ctx.restore();

  const shade = ctx.createLinearGradient(0, 0, 0, size);
  shade.addColorStop(0, 'rgba(255,255,255,0.16)');
  shade.addColorStop(0.45, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
