import * as THREE from 'three';
import { clamp, damp } from './math.js';
import { createGlowTexture, createShadowTexture } from './utils.js';

/**
 * Personaje original construido con geometrías de Three.js.
 * La física vive en GameState; este modelo solo representa y anima el estado.
 */
export class PlayerModel {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.geometries = [];
    this.materials = [];
    this.textures = [];

    this.root = new THREE.Group();
    this.model = new THREE.Group();
    this.root.add(this.model);
    this.scene.add(this.root);

    this._build();
    this._buildShadow();
  }

  _geo(geometry) {
    this.geometries.push(geometry);
    return geometry;
  }

  _mat(material) {
    this.materials.push(material);
    return material;
  }

  _build() {
    const suit = this._mat(
      new THREE.MeshStandardMaterial({ color: 0x07131f, metalness: 0.76, roughness: 0.27 }),
    );
    const armor = this._mat(
      new THREE.MeshStandardMaterial({
        color: 0x102837,
        emissive: 0x06282b,
        emissiveIntensity: 0.8,
        metalness: 0.82,
        roughness: 0.24,
      }),
    );
    const greenGlow = this._mat(
      new THREE.MeshStandardMaterial({
        color: 0x083d2a,
        emissive: 0x38ffb0,
        emissiveIntensity: 3,
        metalness: 0.25,
        roughness: 0.2,
      }),
    );
    const cyanGlow = this._mat(
      new THREE.MeshStandardMaterial({
        color: 0x06303c,
        emissive: 0x2bdcff,
        emissiveIntensity: 2.6,
        metalness: 0.25,
        roughness: 0.2,
      }),
    );
    const brightGreen = this._mat(
      new THREE.MeshBasicMaterial({ color: 0x9affda, toneMapped: false }),
    );
    const visor = this._mat(
      new THREE.MeshStandardMaterial({
        color: 0x062530,
        emissive: 0x2ce6ff,
        emissiveIntensity: 2.3,
        metalness: 0.9,
        roughness: 0.12,
      }),
    );

    // Torso y cintura
    const torso = new THREE.Mesh(
      this._geo(new THREE.CylinderGeometry(0.36, 0.27, 0.72, 7)),
      armor,
    );
    torso.position.y = 1.4;
    this.model.add(torso);

    const waist = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.42, 0.18, 0.29)), suit);
    waist.position.y = 1.03;
    this.model.add(waist);

    const chest = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.5, 0.26, 0.09)), suit);
    chest.position.set(0, 1.52, -0.31);
    chest.rotation.x = -0.08;
    this.model.add(chest);

    const chestLine = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.31, 0.035, 0.03)), brightGreen);
    chestLine.position.set(0, 1.53, -0.36);
    chestLine.rotation.x = -0.08;
    this.model.add(chestLine);

    const chestLine2 = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.2, 0.022, 0.03)), cyanGlow);
    chestLine2.position.set(0, 1.47, -0.365);
    this.model.add(chestLine2);

    // Núcleo del pecho.
    const core = new THREE.Mesh(this._geo(new THREE.OctahedronGeometry(0.07, 0)), brightGreen);
    core.position.set(0, 1.64, -0.35);
    this.model.add(core);

    // Cabeza y visor
    const neck = new THREE.Mesh(this._geo(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 8)), suit);
    neck.position.y = 1.82;
    this.model.add(neck);

    this.head = new THREE.Group();
    this.head.position.y = 2.01;
    this.model.add(this.head);

    const skull = new THREE.Mesh(this._geo(new THREE.IcosahedronGeometry(0.235, 1)), armor);
    this.head.add(skull);

    const visorMesh = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.37, 0.105, 0.11)), visor);
    visorMesh.position.set(0, 0.025, -0.19);
    this.head.add(visorMesh);

    const visorLine = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.28, 0.022, 0.02)), brightGreen);
    visorLine.position.set(0, 0.025, -0.25);
    this.head.add(visorLine);

    const crest = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.035, 0.14, 0.25)), greenGlow);
    crest.position.set(0, 0.2, 0.01);
    crest.rotation.x = 0.2;
    this.head.add(crest);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(this._geo(new THREE.SphereGeometry(0.075, 10, 8)), cyanGlow);
      ear.position.set(side * 0.23, 0.01, 0.01);
      this.head.add(ear);
    }

    // Hombreras
    for (const side of [-1, 1]) {
      const pad = new THREE.Mesh(this._geo(new THREE.SphereGeometry(0.145, 12, 8)), armor);
      pad.position.set(side * 0.39, 1.66, 0);
      pad.scale.set(1.15, 0.82, 1);
      this.model.add(pad);

      const padGlow = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.06, 0.03, 0.19)), greenGlow);
      padGlow.position.set(side * 0.39, 1.74, -0.02);
      this.model.add(padGlow);
    }

    // Brazos
    this.arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.44, 1.6, 0);
      arm.rotation.z = side * -0.08;

      const upper = new THREE.Mesh(this._geo(new THREE.CapsuleGeometry(0.087, 0.5, 4, 8)), suit);
      upper.position.y = -0.33;
      arm.add(upper);

      const forearm = new THREE.Mesh(this._geo(new THREE.CylinderGeometry(0.075, 0.068, 0.25, 7)), armor);
      forearm.position.y = -0.62;
      arm.add(forearm);

      const glove = new THREE.Mesh(this._geo(new THREE.SphereGeometry(0.078, 8, 6)), suit);
      glove.position.y = -0.77;
      arm.add(glove);

      const wristGlow = new THREE.Mesh(this._geo(new THREE.TorusGeometry(0.075, 0.012, 5, 10)), cyanGlow);
      wristGlow.position.y = -0.65;
      wristGlow.rotation.x = Math.PI / 2;
      arm.add(wristGlow);

      this.model.add(arm);
      this.arms.push(arm);
    }

    // Piernas
    this.legs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.18, 0.95, 0);

      const upper = new THREE.Mesh(this._geo(new THREE.CapsuleGeometry(0.105, 0.8, 4, 8)), suit);
      upper.position.y = -0.43;
      leg.add(upper);

      const knee = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.16, 0.1, 0.06)), greenGlow);
      knee.position.set(0, -0.43, -0.11);
      leg.add(knee);

      const boot = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.24, 0.14, 0.42)), armor);
      boot.position.set(0, -0.875, -0.07);
      leg.add(boot);

      const sole = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.23, 0.035, 0.4)), cyanGlow);
      sole.position.set(0, -0.955, -0.07);
      leg.add(sole);

      this.model.add(leg);
      this.legs.push(leg);
    }

    // Mochila de energía (visible desde la cámara trasera)
    const backpack = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.37, 0.48, 0.17)), suit);
    backpack.position.set(0, 1.4, 0.27);
    this.model.add(backpack);

    this.backCore = new THREE.Mesh(this._geo(new THREE.OctahedronGeometry(0.11, 0)), brightGreen);
    this.backCore.position.set(0, 1.42, 0.39);
    this.model.add(this.backCore);

    for (const side of [-1, 1]) {
      const thruster = new THREE.Mesh(this._geo(new THREE.BoxGeometry(0.055, 0.27, 0.05)), cyanGlow);
      thruster.position.set(side * 0.13, 1.25, 0.37);
      this.model.add(thruster);
    }

    const glowTexture = createGlowTexture();
    this.textures.push(glowTexture);
    const auraMaterial = this._mat(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0x42ffb6,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.aura = new THREE.Sprite(auraMaterial);
    this.aura.position.set(0, 1.42, 0.4);
    this.aura.scale.set(0.85, 0.85, 1);
    this.model.add(this.aura);
  }

  _buildShadow() {
    const texture = createShadowTexture();
    this.textures.push(texture);
    const material = this._mat(
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        color: 0x000000,
      }),
    );
    const geometry = this._geo(new THREE.PlaneGeometry(1.45, 1.45));
    this.shadow = new THREE.Mesh(geometry, material);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.012;
    this.scene.add(this.shadow);
  }

  sync(state, dt, active) {
    this.time += dt;
    const step = Math.max(0, Math.min(dt, 0.05));

    this.root.position.x = state.playerX;
    this.root.position.y = state.playerY;

    const lateral = state.targetX - state.playerX;
    const lean = clamp(-lateral * 0.13, -0.26, 0.26);
    this.model.rotation.z = damp(this.model.rotation.z, lean, 11, step);
    this.model.rotation.y = damp(this.model.rotation.y, clamp(-lateral * 0.045, -0.1, 0.1), 9, step);
    this.model.rotation.x = damp(this.model.rotation.x, active ? -0.09 : 0, 8, step);

    if (!active) {
      const idle = Math.sin(this.time * 1.6);
      this.model.position.y = idle * 0.012;
      this.legs[0].rotation.x = damp(this.legs[0].rotation.x, 0.03, 6, step);
      this.legs[1].rotation.x = damp(this.legs[1].rotation.x, -0.03, 6, step);
      this.arms[0].rotation.x = damp(this.arms[0].rotation.x, idle * 0.03, 5, step);
      this.arms[1].rotation.x = damp(this.arms[1].rotation.x, -idle * 0.03, 5, step);
      this.head.rotation.y = Math.sin(this.time * 0.7) * 0.08;
    } else if (state.grounded) {
      const cadence = this.time * (8 + state.speed * 0.14);
      const swing = Math.sin(cadence) * 0.82;
      this.model.position.y = Math.abs(Math.sin(cadence * 2)) * 0.038;
      this.legs[0].rotation.x = swing;
      this.legs[1].rotation.x = -swing;
      this.arms[0].rotation.x = -swing * 0.78;
      this.arms[1].rotation.x = swing * 0.78;
      this.head.rotation.y = damp(this.head.rotation.y, 0, 8, step);
    } else {
      this.model.position.y = 0;
      this.legs[0].rotation.x = damp(this.legs[0].rotation.x, -0.62, 12, step);
      this.legs[1].rotation.x = damp(this.legs[1].rotation.x, 0.48, 12, step);
      this.arms[0].rotation.x = damp(this.arms[0].rotation.x, -1.05, 12, step);
      this.arms[1].rotation.x = damp(this.arms[1].rotation.x, -0.8, 12, step);
      this.head.rotation.y = damp(this.head.rotation.y, 0, 8, step);
    }

    if (active) {
      this.arms[0].rotation.z = -0.08 + Math.sin(this.time * 2.2) * 0.015;
      this.arms[1].rotation.z = 0.08 - Math.sin(this.time * 2.2) * 0.015;
    }

    const flicker = state.invulnerable > 0 && Math.floor(this.time * 24) % 2 === 0;
    this.model.visible = !flicker;

    this.backCore.rotation.y += step * 2.4;
    this.backCore.rotation.x += step * 1.3;
    this.aura.material.opacity = 0.55 + Math.sin(this.time * 4) * 0.15;

    this.shadow.position.x = state.playerX;
    const height = state.playerY;
    const scale = 1 + height * 0.14;
    this.shadow.scale.set(scale, scale, 1);
    this.shadow.material.opacity = clamp(0.53 - height * 0.16, 0.12, 0.53);
  }

  dispose() {
    this.scene.remove(this.root);
    this.scene.remove(this.shadow);
    for (const geometry of this.geometries) geometry.dispose?.();
    for (const material of this.materials) material.dispose?.();
    for (const texture of this.textures) texture.dispose?.();
  }
}
