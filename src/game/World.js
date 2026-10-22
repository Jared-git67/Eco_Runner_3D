import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createGlowTexture, createGridTexture } from './utils.js';
import { clamp, damp } from './math.js';

const TRACK_LENGTH = 360;
const PYLON_COUNT = 19;
const PYLON_SPACING = 16;
const PYLON_SPAN = PYLON_COUNT * PYLON_SPACING;
const ARCH_COUNT = 8;
const ARCH_SPACING = 44;
const ARCH_SPAN = ARCH_COUNT * ARCH_SPACING;

/**
 * Escena 3D: pista, iluminación, arquitectura de neón, cámara y render.
 * Los materiales y geometrías se comparten para mantener el rendimiento.
 */
export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.elapsed = 0;
    this.shake = 0;
    this.baseCameraPosition = new THREE.Vector3(0, 5.35, 9.5);
    this.cameraTarget = new THREE.Vector3(0, 1.6, -10);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x030711, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030711, 0.0072);

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
    this.camera.position.copy(this.baseCameraPosition);
    this.camera.lookAt(this.cameraTarget);

    this.sharedGeometries = [];
    this.sharedMaterials = [];
    this.sharedTextures = [];
    this._dummy = new THREE.Object3D();

    this._buildLights();
    this._buildTrack();
    this._buildPylons();
    this._buildArches();
    this._buildCity();
    this._buildSky();

    this.resize(window.innerWidth, window.innerHeight);
  }

  _material(material) {
    this.sharedMaterials.push(material);
    return material;
  }

  _geometry(geometry) {
    this.sharedGeometries.push(geometry);
    return geometry;
  }

  _merged(geometries) {
    const merged = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!merged) throw new Error('No se pudo fusionar la geometría de la escena.');
    this.sharedGeometries.push(merged);
    return merged;
  }

  _buildLights() {
    this.hemisphere = new THREE.HemisphereLight(0x8cecff, 0x03060c, 1.25);
    this.scene.add(this.hemisphere);

    this.keyLight = new THREE.DirectionalLight(0xb2fff0, 2);
    this.keyLight.position.set(7, 15, 10);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x35d8ff, 1.1);
    this.fillLight.position.set(-9, 8, -16);
    this.scene.add(this.fillLight);

    this.playerLight = new THREE.PointLight(0x2fffa8, 42, 30, 2);
    this.playerLight.position.set(0, 3.2, 4.5);
    this.scene.add(this.playerLight);

    this.rimLight = new THREE.PointLight(0xff2f7a, 55, 65, 2);
    this.rimLight.position.set(12, 8, -28);
    this.scene.add(this.rimLight);

    this.cyanLight = new THREE.PointLight(0x15c8ff, 45, 55, 2);
    this.cyanLight.position.set(-14, 6, -14);
    this.scene.add(this.cyanLight);
  }

  _buildTrack() {
    const gridTexture = createGridTexture();
    gridTexture.repeat.set(2, 45);
    this.gridTexture = gridTexture;
    this.sharedTextures.push(gridTexture);

    const groundMaterial = this._material(
      new THREE.MeshStandardMaterial({
        map: gridTexture,
        emissive: 0x18ffc0,
        emissiveMap: gridTexture,
        emissiveIntensity: 0.72,
        color: 0x69838c,
        metalness: 0.48,
        roughness: 0.44,
      }),
    );

    const ground = new THREE.Mesh(this._geometry(new THREE.PlaneGeometry(12, TRACK_LENGTH)), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -TRACK_LENGTH / 2 + 15);
    this.scene.add(ground);

    const underMaterial = this._material(
      new THREE.MeshStandardMaterial({ color: 0x030811, metalness: 0.5, roughness: 0.7 }),
    );
    const under = new THREE.Mesh(this._geometry(new THREE.PlaneGeometry(46, TRACK_LENGTH + 40)), underMaterial);
    under.rotation.x = -Math.PI / 2;
    under.position.set(0, -0.08, -TRACK_LENGTH / 2);
    this.scene.add(under);

    const platformMaterial = this._material(
      new THREE.MeshStandardMaterial({
        color: 0x07131e,
        emissive: 0x061d22,
        emissiveIntensity: 0.85,
        metalness: 0.7,
        roughness: 0.36,
      }),
    );
    const platformGeometry = this._geometry(new THREE.BoxGeometry(3.6, 0.55, TRACK_LENGTH));
    for (const side of [-1, 1]) {
      const platform = new THREE.Mesh(platformGeometry, platformMaterial);
      platform.position.set(side * 5.65, -0.2, -TRACK_LENGTH / 2 + 15);
      this.scene.add(platform);
    }

    this.cyanLineMaterial = this._material(
      new THREE.MeshBasicMaterial({
        color: 0x2ce6ff,
        transparent: true,
        opacity: 0.55,
        toneMapped: false,
      }),
    );
    this.greenLineMaterial = this._material(
      new THREE.MeshBasicMaterial({
        color: 0x39ffb2,
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
      }),
    );

    const dividerGeometry = this._geometry(new THREE.BoxGeometry(0.045, 0.012, TRACK_LENGTH));
    for (const x of [-1.3, 1.3]) {
      const line = new THREE.Mesh(dividerGeometry, this.cyanLineMaterial);
      line.position.set(x, 0.018, -TRACK_LENGTH / 2 + 15);
      this.scene.add(line);
    }

    const edgeGeometry = this._geometry(new THREE.BoxGeometry(0.09, 0.016, TRACK_LENGTH));
    for (const x of [-3.94, 3.94]) {
      const line = new THREE.Mesh(edgeGeometry, this.greenLineMaterial);
      line.position.set(x, 0.02, -TRACK_LENGTH / 2 + 15);
      this.scene.add(line);
    }

    const curbMaterial = this._material(
      new THREE.MeshStandardMaterial({ color: 0x08151e, metalness: 0.8, roughness: 0.3 }),
    );
    const curbGeometry = this._geometry(new THREE.BoxGeometry(0.34, 0.3, TRACK_LENGTH));
    const curbLineGeometry = this._geometry(new THREE.BoxGeometry(0.05, 0.025, TRACK_LENGTH));
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(curbGeometry, curbMaterial);
      curb.position.set(side * 4.16, 0.14, -TRACK_LENGTH / 2 + 15);
      this.scene.add(curb);

      const glow = new THREE.Mesh(curbLineGeometry, this.greenLineMaterial);
      glow.position.set(side * 4.16, 0.3, -TRACK_LENGTH / 2 + 15);
      this.scene.add(glow);
    }
  }

  _buildPylons() {
    // Cada pilar se dibuja con tres InstancedMesh (estructura + dos neones)
    // en lugar de 38 grupos con cuatro mallas cada uno.
    const dark = this._material(
      new THREE.MeshStandardMaterial({
        color: 0x0a1822,
        emissive: 0x06171c,
        emissiveIntensity: 1,
        metalness: 0.75,
        roughness: 0.32,
      }),
    );

    const baseGeometry = new THREE.BoxGeometry(0.7, 0.32, 0.95).translate(0, 0.16, 0);
    const poleGeometry = new THREE.BoxGeometry(0.2, 2.65, 0.48).translate(0, 1.42, 0);
    const darkGeometry = this._merged([baseGeometry, poleGeometry]);

    const stripGeometry = new THREE.BoxGeometry(0.055, 1.8, 0.5).translate(-0.105, 1.55, 0);
    const topGeometry = new THREE.BoxGeometry(0.34, 0.14, 0.62).translate(0, 2.82, 0);
    const neonGeometry = this._merged([stripGeometry, topGeometry]);

    const capacity = PYLON_COUNT * 2;
    this.pylonDark = new THREE.InstancedMesh(darkGeometry, dark, capacity);
    this.pylonGreen = new THREE.InstancedMesh(neonGeometry, this.greenLineMaterial, capacity);
    this.pylonCyan = new THREE.InstancedMesh(neonGeometry, this.cyanLineMaterial, capacity);
    this.pylonGreen.count = 0;
    this.pylonCyan.count = 0;

    for (const mesh of [this.pylonDark, this.pylonGreen, this.pylonCyan]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
    }

    this.pylonRecords = [];
    const used = { green: 0, cyan: 0 };

    for (let index = 0; index < PYLON_COUNT; index += 1) {
      for (const side of [-1, 1]) {
        const neon = index % 2 === 0 ? this.pylonGreen : this.pylonCyan;
        const key = index % 2 === 0 ? 'green' : 'cyan';
        const record = {
          slot: used[key],
          mesh: neon,
          x: side * 5.32,
          z: 10 - index * PYLON_SPACING,
          baseZ: 10 - index * PYLON_SPACING,
          rotationY: side === 1 ? 0 : Math.PI,
        };
        used[key] += 1;
        neon.count = used[key];
        this.pylonRecords.push(record);
      }
    }

    this._applyPylonMatrices();
  }

  _applyPylonMatrices() {
    const dummy = this._dummy;
    for (let index = 0; index < this.pylonRecords.length; index += 1) {
      const record = this.pylonRecords[index];
      dummy.position.set(record.x, 0, record.z);
      dummy.rotation.set(0, record.rotationY, 0);
      dummy.updateMatrix();
      this.pylonDark.setMatrixAt(index, dummy.matrix);
      record.mesh.setMatrixAt(record.slot, dummy.matrix);
    }
    this.pylonDark.instanceMatrix.needsUpdate = true;
    this.pylonGreen.instanceMatrix.needsUpdate = true;
    this.pylonCyan.instanceMatrix.needsUpdate = true;
  }

  _buildArches() {
    const dark = this._material(
      new THREE.MeshStandardMaterial({
        color: 0x08131e,
        emissive: 0x051a1f,
        emissiveIntensity: 0.9,
        metalness: 0.8,
        roughness: 0.3,
      }),
    );

    const postGeometry = [
      new THREE.BoxGeometry(0.3, 5.7, 0.34).translate(-5.05, 2.85, 0),
      new THREE.BoxGeometry(0.3, 5.7, 0.34).translate(5.05, 2.85, 0),
    ];
    const topGeometry = new THREE.BoxGeometry(10.75, 0.3, 0.36).translate(0, 5.62, 0);
    const darkGeometry = this._merged([...postGeometry, topGeometry]);

    const stripPost = [
      new THREE.BoxGeometry(0.06, 4.7, 0.14).translate(-4.88, 2.65, -0.19),
      new THREE.BoxGeometry(0.06, 4.7, 0.14).translate(4.88, 2.65, -0.19),
    ];
    const stripTop = new THREE.BoxGeometry(10.25, 0.055, 0.12).translate(0, 5.43, -0.2);
    const neonGeometry = this._merged([...stripPost, stripTop]);

    this.archDark = new THREE.InstancedMesh(darkGeometry, dark, ARCH_COUNT);
    this.archGreen = new THREE.InstancedMesh(neonGeometry, this.greenLineMaterial, ARCH_COUNT);
    this.archCyan = new THREE.InstancedMesh(neonGeometry, this.cyanLineMaterial, ARCH_COUNT);
    this.archGreen.count = 0;
    this.archCyan.count = 0;

    for (const mesh of [this.archDark, this.archGreen, this.archCyan]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
    }

    this.archRecords = [];
    const used = { green: 0, cyan: 0 };

    for (let index = 0; index < ARCH_COUNT; index += 1) {
      const mesh = index % 2 === 0 ? this.archGreen : this.archCyan;
      const key = index % 2 === 0 ? 'green' : 'cyan';
      const z = 6 - index * ARCH_SPACING;
      this.archRecords.push({ slot: used[key], mesh, z, baseZ: z });
      used[key] += 1;
      mesh.count = used[key];
    }

    this._applyArchMatrices();
  }

  _applyArchMatrices() {
    const dummy = this._dummy;
    for (let index = 0; index < this.archRecords.length; index += 1) {
      const record = this.archRecords[index];
      dummy.position.set(0, 0, record.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      this.archDark.setMatrixAt(index, dummy.matrix);
      record.mesh.setMatrixAt(record.slot, dummy.matrix);
    }
    this.archDark.instanceMatrix.needsUpdate = true;
    this.archGreen.instanceMatrix.needsUpdate = true;
    this.archCyan.instanceMatrix.needsUpdate = true;
  }

  _buildCity() {
    const material = this._material(
      new THREE.MeshStandardMaterial({
        color: 0x050d17,
        emissive: 0x061b22,
        emissiveIntensity: 0.75,
        metalness: 0.5,
        roughness: 0.45,
      }),
    );
    const windowMaterial = this._material(
      new THREE.MeshBasicMaterial({ color: 0x1ac9c2, transparent: true, opacity: 0.35, toneMapped: false }),
    );

    const buildings = [];
    const windows = [];

    for (let index = 0; index < 26; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const width = 3 + Math.random() * 7;
      const depth = 3 + Math.random() * 7;
      const height = 7 + Math.random() * 34;
      const x = side * (17 + Math.random() * 38);
      const z = -55 - Math.random() * 230;

      buildings.push(new THREE.BoxGeometry(width, height, depth).translate(x, height / 2 - 0.4, z));

      if (index % 3 === 0) {
        windows.push(
          new THREE.BoxGeometry(0.14, height * 0.55, 0.1).translate(x, height * 0.5, z + depth / 2 + 0.06),
        );
      }
    }

    const buildingMesh = new THREE.Mesh(this._merged(buildings), material);
    this.scene.add(buildingMesh);

    if (windows.length > 0) {
      const windowMesh = new THREE.Mesh(this._merged(windows), windowMaterial);
      this.scene.add(windowMesh);
    }
  }

  _buildSky() {
    const starCount = 850;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 360;
      positions[i * 3 + 1] = 4 + Math.random() * 120;
      positions[i * 3 + 2] = -35 - Math.random() * 360;
    }

    const starGeometry = this._geometry(new THREE.BufferGeometry());
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xc0f3ff,
      size: 0.55,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      fog: false,
    });
    this.sharedMaterials.push(starMaterial);
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);

    // Planeta lejano con anillos: no le afecta la niebla para que funcione
    // como referencia visual del horizonte.
    const planet = new THREE.Group();
    planet.position.set(58, 38, -175);

    const planetMaterial = new THREE.MeshBasicMaterial({ color: 0x0b5f5b, fog: false });
    this.sharedMaterials.push(planetMaterial);
    const sphere = new THREE.Mesh(this._geometry(new THREE.SphereGeometry(7.2, 32, 24)), planetMaterial);
    planet.add(sphere);

    const glowTexture = createGlowTexture();
    this.sharedTextures.push(glowTexture);
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x33ffc4,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.sharedMaterials.push(glowMaterial);
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.set(54, 54, 1);
    planet.add(glow);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x4bffd1,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
    this.sharedMaterials.push(ringMaterial);
    const ring = new THREE.Mesh(this._geometry(new THREE.RingGeometry(10, 13.4, 64)), ringMaterial);
    ring.rotation.x = Math.PI / 2 + 0.34;
    ring.rotation.z = -0.18;
    planet.add(ring);

    const ringInner = new THREE.Mesh(
      this._geometry(new THREE.RingGeometry(14.5, 15.4, 64)),
      ringMaterial,
    );
    ringInner.rotation.copy(ring.rotation);
    planet.add(ringInner);

    this.planet = planet;
    this.scene.add(planet);
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  }

  resetCamera() {
    this.shake = 0;
    this.camera.position.copy(this.baseCameraPosition);
    this.camera.lookAt(this.cameraTarget);
  }

  resetEnvironment() {
    this.gridTexture.offset.y = 0;
    for (const pylon of this.pylonRecords) {
      pylon.z = pylon.baseZ;
    }
    for (const arch of this.archRecords) {
      arch.z = arch.baseZ;
    }
    this._applyPylonMatrices();
    this._applyArchMatrices();
    this.resetCamera();
  }

  update(dt, state, flowSpeed = 0) {
    this.elapsed += dt;

    this.gridTexture.offset.y -= (flowSpeed * dt) / 8;

    for (const pylon of this.pylonRecords) {
      pylon.z += flowSpeed * dt;
      if (pylon.z > 14) {
        pylon.z -= PYLON_SPAN;
      }
    }
    this._applyPylonMatrices();

    for (const arch of this.archRecords) {
      arch.z += flowSpeed * dt;
      if (arch.z > 14) {
        arch.z -= ARCH_SPAN;
      }
    }
    this._applyArchMatrices();

    this.stars.rotation.y += dt * 0.0035;
    this.planet.rotation.y += dt * 0.012;

    const targetX = state.playerX * 0.18;
    const desiredY = this.baseCameraPosition.y + Math.sin(this.elapsed * 1.7) * 0.035;
    this.camera.position.x = damp(this.camera.position.x, targetX, 5.5, dt);
    this.camera.position.y = damp(this.camera.position.y, desiredY, 5, dt);
    this.camera.position.z = damp(this.camera.position.z, this.baseCameraPosition.z, 5, dt);

    if (this.shake > 0.001) {
      const strength = this.shake;
      this.camera.position.x += (Math.random() - 0.5) * strength;
      this.camera.position.y += (Math.random() - 0.5) * strength * 0.65;
      this.camera.position.z += (Math.random() - 0.5) * strength * 0.4;
      this.shake = Math.max(0, this.shake - dt * 2.4);
    }

    this.camera.lookAt(this.camera.position.x * 1.15, 1.58, -10);

    this.playerLight.position.x = state.playerX * 0.45;
    this.playerLight.intensity = 38 + Math.sin(this.elapsed * 3.1) * 6 + Math.sin(this.elapsed * 7.3) * 2;
    this.rimLight.intensity = 48 + Math.sin(this.elapsed * 1.3) * 9;
    this.cyanLight.intensity = 40 + Math.cos(this.elapsed * 1.8) * 8;

    // La cámara nunca debe quedar demasiado cerca del suelo al vibrar.
    this.camera.position.y = clamp(this.camera.position.y, 4.6, 6.2);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize(width, height) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
  }

  dispose() {
    this.scene.traverse((object) => {
      if (object.geometry && !this.sharedGeometries.includes(object.geometry)) {
        object.geometry.dispose?.();
      }
    });
    for (const geometry of this.sharedGeometries) geometry.dispose?.();
    for (const material of this.sharedMaterials) {
      material.map?.dispose?.();
      material.dispose?.();
    }
    for (const texture of this.sharedTextures) texture.dispose?.();
    this.renderer.dispose();
  }
}
