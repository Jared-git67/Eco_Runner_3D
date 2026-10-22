import * as THREE from 'three';
import { GAME_CONFIG, LANES } from './config.js';
import { CRYSTAL_SAFE_DISTANCE, nextCrystalDelay, chooseCrystalLane } from './spawn.js';
import { createGlowTexture } from './utils.js';

/**
 * Cristales de energía. Aparecen de uno en uno, con una separación mínima
 * respecto a los obstáculos para que siempre sean alcanzables sin perder vidas.
 */
export class CrystalManager {
  constructor(scene, obstacleManager, config = GAME_CONFIG, rng = Math.random) {
    this.scene = scene;
    this.obstacles = obstacleManager;
    this.config = config;
    this.rng = rng;
    this.items = [];
    this.spawnTimer = 1.4;
    this.elapsed = 0;

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
    const glowTexture = createGlowTexture();
    this.textures.push(glowTexture);

    this.outerGeometry = this._geo(new THREE.OctahedronGeometry(0.38, 0));
    this.innerGeometry = this._geo(new THREE.OctahedronGeometry(0.19, 0));
    this.ringGeometry = this._geo(new THREE.TorusGeometry(0.49, 0.012, 5, 28));
    this.edgesGeometry = new THREE.EdgesGeometry(this.outerGeometry);

    this.outerMaterial = this._mat(
      new THREE.MeshStandardMaterial({
        color: 0x06402b,
        emissive: 0x35ff9f,
        emissiveIntensity: 3.1,
        metalness: 0.36,
        roughness: 0.16,
        flatShading: true,
      }),
    );
    this.innerMaterial = this._mat(
      new THREE.MeshBasicMaterial({ color: 0xd9fff0, toneMapped: false }),
    );
    this.edgeMaterial = this._mat(
      new THREE.LineBasicMaterial({ color: 0xaaffdc, transparent: true, opacity: 0.8 }),
    );
    this.ringMaterial = this._mat(
      new THREE.MeshBasicMaterial({ color: 0x4affd0, transparent: true, opacity: 0.55, toneMapped: false }),
    );
    this.auraMaterial = this._mat(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0x3fffb4,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
  }

  _create(lane, z, baseY = 1.2) {
    const group = new THREE.Group();

    const outer = new THREE.Mesh(this.outerGeometry, this.outerMaterial);
    group.add(outer);

    const inner = new THREE.Mesh(this.innerGeometry, this.innerMaterial);
    inner.rotation.y = Math.PI / 4;
    group.add(inner);

    const edges = new THREE.LineSegments(this.edgesGeometry, this.edgeMaterial);
    group.add(edges);

    const ring = new THREE.Mesh(this.ringGeometry, this.ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const aura = new THREE.Sprite(this.auraMaterial);
    aura.scale.set(1.9, 1.9, 1);
    group.add(aura);

    group.position.set(LANES[lane], baseY, z);
    this.scene.add(group);

    const item = {
      group,
      lane,
      x: LANES[lane],
      y: baseY,
      z,
      baseY,
      phase: this.rng() * Math.PI * 2,
      spin: 1.3 + this.rng() * 1.1,
      collected: false,
    };
    group.userData.item = item;
    this.items.push(item);
    return item;
  }

  _spawnFormation() {
    const z = this.config.spawnZ - this.rng() * 6;
    const lane = chooseCrystalLane(this.obstacles.items, [z], undefined, this.rng);
    if (lane === null) return false;

    this._create(lane, z, 1.2 + Math.sin(z * 0.12) * 0.08);
    return true;
  }

  /** Carriles ocupados por cristales cerca de una posición Z. */
  getLanesNear(z, range = CRYSTAL_SAFE_DISTANCE) {
    const lanes = [];
    for (const item of this.items) {
      if (Math.abs(item.z - z) < range) lanes.push(item.lane);
    }
    return [...new Set(lanes)];
  }

  /** Cristales iniciales separados para que el arranque no acelere el final. */
  prime() {
    const lane = 1;
    for (const z of [-46, -70]) {
      this._create(lane, z, 1.2);
    }
    this.spawnTimer = 3.4;
  }

  update(dt, state) {
    this.elapsed += dt;
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      const spawned = this._spawnFormation();
      this.spawnTimer = spawned ? nextCrystalDelay(state.difficulty, this.rng) : 0.55;
    }

    const step = state.speed * dt;

    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index];
      item.z += step;
      item.group.position.z = item.z;
      item.group.position.y = item.baseY + Math.sin(this.elapsed * 2.5 + item.phase) * 0.15;
      item.y = item.group.position.y;
      item.group.rotation.y += dt * item.spin;
      item.group.rotation.x = Math.sin(this.elapsed * 1.3 + item.phase) * 0.14;

      if (item.z > this.config.removeZ) {
        this.scene.remove(item.group);
        this.items.splice(index, 1);
      }
    }

    this.auraMaterial.opacity = 0.5 + Math.sin(this.elapsed * 4.1) * 0.12;
  }

  remove(item) {
    if (!item || item.collected) return;
    item.collected = true;
    this.scene.remove(item.group);
    const index = this.items.indexOf(item);
    if (index !== -1) this.items.splice(index, 1);
  }

  reset() {
    for (const item of this.items) {
      this.scene.remove(item.group);
    }
    this.items.length = 0;
    this.spawnTimer = 1.4;
    this.elapsed = 0;
  }

  dispose() {
    this.reset();
    for (const geometry of this.geometries) geometry.dispose?.();
    this.edgesGeometry.dispose?.();
    for (const material of this.materials) material.dispose?.();
    for (const texture of this.textures) texture.dispose?.();
  }
}
