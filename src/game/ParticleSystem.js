import * as THREE from 'three';
import { createGlowTexture } from './utils.js';

/** Sistema de partículas con pool fijo: no crea objetos durante la partida. */
export class ParticleSystem {
  constructor(scene, maxParticles = 90) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.cursor = 0;
    this.texture = createGlowTexture();
    this.particles = [];

    for (let index = 0; index < maxParticles; index += 1) {
      const material = new THREE.SpriteMaterial({
        map: this.texture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.scale.setScalar(0.3);
      this.scene.add(sprite);
      this.particles.push({
        sprite,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        baseScale: 0.3,
      });
    }
  }

  burst(position, color = 0x38ffb0, count = 10, power = 4.2) {
    for (let index = 0; index < count; index += 1) {
      const particle = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % this.maxParticles;

      const life = 0.42 + Math.random() * 0.42;
      particle.life = life;
      particle.maxLife = life;
      particle.baseScale = 0.16 + Math.random() * 0.28;
      particle.sprite.visible = true;
      particle.sprite.position.copy(position);
      particle.sprite.position.x += (Math.random() - 0.5) * 0.35;
      particle.sprite.position.y += (Math.random() - 0.5) * 0.35;
      particle.sprite.position.z += (Math.random() - 0.5) * 0.35;
      particle.sprite.material.color.set(color);
      particle.sprite.material.opacity = 1;
      particle.sprite.scale.setScalar(particle.baseScale);

      particle.velocity.set(
        (Math.random() - 0.5) * power,
        Math.random() * power * 0.8 + 0.6,
        (Math.random() - 0.5) * power,
      );
    }
  }

  update(dt) {
    const step = Math.min(dt, 0.05);
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;

      particle.life -= step;
      if (particle.life <= 0) {
        particle.sprite.visible = false;
        particle.life = 0;
        continue;
      }

      particle.velocity.y -= 4.5 * step;
      particle.velocity.multiplyScalar(1 - 2.1 * step);
      particle.sprite.position.addScaledVector(particle.velocity, step);

      const progress = particle.life / particle.maxLife;
      particle.sprite.material.opacity = Math.min(1, progress * 1.7);
      particle.sprite.scale.setScalar(particle.baseScale * (0.75 + progress * 0.75));
    }
  }

  reset() {
    for (const particle of this.particles) {
      particle.life = 0;
      particle.sprite.visible = false;
    }
  }

  dispose() {
    for (const particle of this.particles) {
      this.scene.remove(particle.sprite);
      particle.sprite.material.dispose();
    }
    this.texture.dispose();
  }
}
