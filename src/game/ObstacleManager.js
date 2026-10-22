import * as THREE from 'three';
import { GAME_CONFIG, LANES } from './config.js';
import { createObstaclePattern, nextObstacleDelay, ObstacleType } from './spawn.js';
import { createGlowTexture, createHazardTexture } from './utils.js';

/**
 * Obstáculos y su ciclo de vida. Cada patrón se genera en la lógica pura de
 * spawn.js; este manager solo construye, mueve y recicla los objetos 3D.
 */
export class ObstacleManager {
  constructor(scene, config = GAME_CONFIG, rng = Math.random) {
    this.scene = scene;
    this.config = config;
    this.rng = rng;
    this.items = [];
    this.spawnTimer = 1.2;
    this.elapsed = 0;
    this.reservedLanesProvider = null;

    this.geometries = [];
    this.materials = [];
    this.textures = [];

    this._buildResources();
  }

  _geo(geometry) {
    this.geometries.push(geometry);
    return geometry;
  }

  _mat(material) {
    this.materials.push(material);
    return material;
  }

  _buildResources() {
    const hazardTexture = createHazardTexture();
    hazardTexture.repeat.set(2.2, 1);
    this.textures.push(hazardTexture);

    const glowTexture = createGlowTexture();
    this.textures.push(glowTexture);

    this.materialsByType = {
      barrierBody: this._mat(
        new THREE.MeshStandardMaterial({
          map: hazardTexture,
          emissive: 0xff5a1f,
          emissiveMap: hazardTexture,
          emissiveIntensity: 0.95,
          color: 0xffffff,
          metalness: 0.55,
          roughness: 0.38,
        }),
      ),
      barrierTop: this._mat(new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false })),
      barrierFoot: this._mat(
        new THREE.MeshStandardMaterial({ color: 0x120d0b, metalness: 0.8, roughness: 0.35 }),
      ),
      blockBody: this._mat(
        new THREE.MeshStandardMaterial({
          color: 0x170c20,
          emissive: 0x25061a,
          emissiveIntensity: 1.1,
          metalness: 0.82,
          roughness: 0.28,
        }),
      ),
      blockEdge: this._mat(
        new THREE.LineBasicMaterial({ color: 0xff4d7d, transparent: true, opacity: 0.72 }),
      ),
      blockStrip: this._mat(
        new THREE.MeshStandardMaterial({
          color: 0x430817,
          emissive: 0xff245f,
          emissiveIntensity: 2.8,
          metalness: 0.3,
          roughness: 0.25,
        }),
      ),
      blockBand: this._mat(new THREE.MeshBasicMaterial({ color: 0xff9ab4, toneMapped: false })),
      blockTop: this._mat(new THREE.MeshBasicMaterial({ color: 0xff3d6f, toneMapped: false })),
      blockBase: this._mat(
        new THREE.MeshStandardMaterial({
          color: 0x09090f,
          emissive: 0x16030f,
          emissiveIntensity: 0.7,
          metalness: 0.7,
          roughness: 0.4,
        }),
      ),
    };

    this.barrierAura = this._mat(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff8a3d,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.blockAura = this._mat(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff2f74,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    this.geometriesByType = {
      barrierBody: this._geo(new THREE.BoxGeometry(1.96, 1.02, 0.7)),
      barrierTop: this._geo(new THREE.BoxGeometry(2.1, 0.1, 0.8)),
      barrierFoot: this._geo(new THREE.BoxGeometry(0.2, 0.18, 0.95)),
      blockBody: this._geo(new THREE.BoxGeometry(1.96, 2.9, 1.15)),
      blockPlinth: this._geo(new THREE.BoxGeometry(2.18, 0.16, 1.36)),
      blockStrip: this._geo(new THREE.BoxGeometry(0.17, 2.2, 0.045)),
      blockBand: this._geo(new THREE.BoxGeometry(2.02, 0.07, 1.18)),
      blockTop: this._geo(new THREE.BoxGeometry(0.32, 0.1, 0.32)),
    };

    this.blockEdges = new THREE.EdgesGeometry(this.geometriesByType.blockBody);
  }

  _createBarrier(lane) {
    const group = new THREE.Group();
    const materials = this.materialsByType;
    const geometries = this.geometriesByType;

    const body = new THREE.Mesh(geometries.barrierBody, materials.barrierBody);
    body.position.y = 0.51;
    group.add(body);

    const top = new THREE.Mesh(geometries.barrierTop, materials.barrierTop);
    top.position.y = 1.07;
    group.add(top);

    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(geometries.barrierFoot, materials.barrierFoot);
      foot.position.set(side * 0.87, 0.09, 0);
      group.add(foot);
    }

    const aura = new THREE.Sprite(this.barrierAura);
    aura.position.set(0, 0.56, 0);
    aura.scale.set(2.5, 1.65, 1);
    group.add(aura);

    group.position.set(LANES[lane], 0, this.config.spawnZ);
    this.scene.add(group);

    const item = {
      group,
      lane,
      type: ObstacleType.BARRIER,
      x: LANES[lane],
      z: this.config.spawnZ,
      width: 1.96,
      height: 1.02,
      depth: 0.7,
      hit: false,
      hitTimer: 0,
    };
    group.userData.item = item;
    this.items.push(item);
    return item;
  }

  _createBlock(lane) {
    const group = new THREE.Group();
    const materials = this.materialsByType;
    const geometries = this.geometriesByType;

    const plinth = new THREE.Mesh(geometries.blockPlinth, materials.blockBase);
    plinth.position.y = 0.08;
    group.add(plinth);

    const body = new THREE.Mesh(geometries.blockBody, materials.blockBody);
    body.position.y = 1.45;
    group.add(body);

    const edges = new THREE.LineSegments(this.blockEdges, materials.blockEdge);
    edges.position.y = 1.45;
    group.add(edges);

    for (const side of [-1, 1]) {
      for (const front of [-1, 1]) {
        const strip = new THREE.Mesh(geometries.blockStrip, materials.blockStrip);
        strip.position.set(side * 0.66, 1.45, front * 0.588);
        group.add(strip);
      }
    }

    for (const y of [0.78, 2.12]) {
      const band = new THREE.Mesh(geometries.blockBand, materials.blockBand);
      band.position.y = y;
      group.add(band);
    }

    const beacon = new THREE.Mesh(geometries.blockTop, materials.blockTop);
    beacon.position.y = 2.96;
    group.add(beacon);

    const aura = new THREE.Sprite(this.blockAura);
    aura.position.set(0, 1.35, 0);
    aura.scale.set(2.7, 3.4, 1);
    group.add(aura);

    group.position.set(LANES[lane], 0, this.config.spawnZ);
    this.scene.add(group);

    const item = {
      group,
      lane,
      type: ObstacleType.BLOCK,
      x: LANES[lane],
      z: this.config.spawnZ,
      width: 1.96,
      height: 2.9,
      depth: 1.15,
      hit: false,
      hitTimer: 0,
    };
    group.userData.item = item;
    this.items.push(item);
    return item;
  }

  /**
   * Permite consultar los carriles ocupados por cristales recién generados.
   * Así un obstáculo no aparece encima de un cristal que ya está en la pista.
   */
  setReservedLanesProvider(provider) {
    this.reservedLanesProvider = provider;
  }

  spawnPattern(difficulty = 0) {
    const pattern = createObstaclePattern(difficulty, this.rng);
    const reserved = new Set(this.reservedLanesProvider?.(this.config.spawnZ) ?? []);
    const usable = pattern.filter((part) => !reserved.has(part.lane));

    for (const part of usable) {
      if (part.type === ObstacleType.BLOCK) {
        this._createBlock(part.lane);
      } else {
        this._createBarrier(part.lane);
      }
    }
    return usable;
  }

  update(dt, state) {
    this.elapsed += dt;
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      this.spawnPattern(state.difficulty);
      this.spawnTimer = nextObstacleDelay(state.difficulty, this.rng);
    }

    const step = state.speed * dt;

    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index];
      item.z += step;
      item.group.position.z = item.z;

      if (item.hitTimer > 0) {
        item.hitTimer = Math.max(0, item.hitTimer - dt);
        item.group.visible = Math.floor(item.hitTimer * 30) % 2 === 0;
      }

      if (item.z > this.config.removeZ) {
        this.scene.remove(item.group);
        this.items.splice(index, 1);
      }
    }

    const pulse = 0.2 + Math.sin(this.elapsed * 3.4) * 0.06;
    this.barrierAura.opacity = pulse;
    this.blockAura.opacity = pulse + 0.06;
  }

  markHit(item) {
    item.hit = true;
    item.hitTimer = 0.38;
  }

  getBlockedLanesNear(z, range = 9) {
    const blocked = [];
    for (const item of this.items) {
      if (Math.abs(item.z - z) < range) blocked.push(item.lane);
    }
    return [...new Set(blocked)];
  }

  reset() {
    for (const item of this.items) {
      this.scene.remove(item.group);
    }
    this.items.length = 0;
    this.spawnTimer = 1.2;
    this.elapsed = 0;
  }

  dispose() {
    this.reset();
    for (const geometry of this.geometries) geometry.dispose?.();
    this.blockEdges.dispose?.();
    for (const material of this.materials) material.dispose?.();
    for (const texture of this.textures) texture.dispose?.();
  }
}
