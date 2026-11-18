import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getDaylightPhaseInfo, RenderFrameState } from './renderer';
import {
  BuildingAssets,
  CharacterRig,
  createAnimalMesh,
  createBuildingMesh,
  createCarrocaMesh,
  createCleilsonRig,
  createFountainGroup,
  createFurnitureMesh,
  createNameplateSprite,
  createNPCRig,
  createPortalMarkerMesh,
  createProceduralTextureCache,
  createRelicMesh,
  createTreeMesh,
  createVillageWellMesh,
  dirToYaw,
  ProceduralTextureCache,
  to3DX,
  to3DZ,
  WORLD_TO_3D,
} from './threeAssets';
import { LifeStageId, SceneId } from './types';
import {
  PLAZA_FOUNTAIN,
  PLAZA_RECT,
  PARKED_CARROCA,
  SOCCER_FIELD_RECT,
  VILLAGE_WELL,
  WORLD_BUILDINGS,
  WORLD_HEIGHT,
  WORLD_ROADS,
  WORLD_TREES,
  WORLD_WIDTH,
} from './worldData';

const STREET_LANTERN_POSITIONS = [
  { x: 960, y: 840 },
  { x: 1440, y: 840 },
  { x: 960, y: 1260 },
  { x: 1440, y: 1260 },
];

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl =
      (probe.getContext('webgl2') as WebGLRenderingContext | null) ||
      (probe.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    let rendererStr = '';
    if (ext) {
      rendererStr = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    } else {
      rendererStr = String(gl.getParameter(gl.RENDERER) || '');
    }
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    return false;
  }
}

function disposeObjectSubtree(root: THREE.Object3D, keepTextures: Set<THREE.Texture>) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const sprite = obj as THREE.Sprite;
    const rawMat = mesh.material ?? sprite.material;
    if (!rawMat) return;
    const mats = Array.isArray(rawMat) ? rawMat : [rawMat];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial & THREE.SpriteMaterial;
      if (std.map && !keepTextures.has(std.map)) {
        std.map.dispose();
      }
      m.dispose();
    }
  });
}

export interface CompassProjection {
  visible: boolean;
  edgeX: number;
  edgeY: number;
  angleRad: number;
}

export class World3DController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget;
  private textures: ProceduralTextureCache;
  private keepTextures = new Set<THREE.Texture>();
  private isSoftwareGl: boolean;
  private enableShadows: boolean;
  private disposed = false;

  // Lighting
  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private interiorLight: THREE.PointLight;

  // Scene Content Groups
  private worldRoot = new THREE.Group();
  private dynamicRoot = new THREE.Group();
  private activeSceneId: SceneId | null = null;
  private activeFestivalMode = false;

  // Tracked animated objects for current scene
  private buildingAssets: BuildingAssets[] = [];
  private lanternBulbs: THREE.MeshStandardMaterial[] = [];
  private lanternLights: THREE.PointLight[] = [];
  private interiorWindowMats: THREE.MeshStandardMaterial[] = [];
  private fountainRipple: THREE.Mesh | null = null;
  private treeGroups: THREE.Group[] = [];
  private portalGroups: THREE.Group[] = [];
  private festivalFlags: THREE.Mesh[] = [];

  // Dynamic entity maps
  private playerRig: CharacterRig | null = null;
  private currentStageId: LifeStageId | null = null;
  private npcRigs = new Map<string, CharacterRig>();
  private animalGroups = new Map<string, THREE.Group>();
  private relicGroups = new Map<string, THREE.Group>();
  private burstPool: THREE.Mesh[] = [];
  private nearestRing: THREE.Mesh;

  // Weather & Firefly 3D Particles
  private rainLines: THREE.LineSegments;
  private rainPositions: Float32Array;
  private rainCount = 360;
  private mistPoints: THREE.Points;
  private mistPositions: Float32Array;
  private mistCount = 90;
  private fireflyPoints: THREE.Points;
  private fireflyPositions: Float32Array;
  private fireflyCount = 48;

  // Reusable scratch objects (zero per-frame allocations)
  private _camTarget = new THREE.Vector3();
  private _desiredCamPos = new THREE.Vector3();
  private _desiredLookAt = new THREE.Vector3();
  private _skyColor = new THREE.Color();
  private _fogColor = new THREE.Color();
  private _hemiSky = new THREE.Color();
  private _hemiGround = new THREE.Color();
  private _sunColor = new THREE.Color();
  private _projVec = new THREE.Vector3();
  private _camInitialized = false;

  // Frame scheduling
  private rafHandle: number | null = null;
  private timerHandle: number | null = null;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.enableShadows = !this.isSoftwareGl;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = this.enableShadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8bc8e8);
    this.scene.fog = new THREE.Fog(0x9bd0ec, 38, 92);

    // Steep top-down 2D-style perspective camera
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 160);
    this.camera.position.set(38, 28, 42);

    // Studio IBL environment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    roomEnv.dispose();
    pmrem.dispose();

    // Shared procedural textures
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextureCache(maxAniso);
    [
      this.textures.meadow,
      this.textures.roca,
      this.textures.plaza,
      this.textures.dirt,
      this.textures.soccer,
      this.textures.wood,
      this.textures.workshop,
      this.textures.tile,
      this.textures.studio,
    ].forEach((t) => this.keepTextures.add(t));

    // Primary Lights
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x4d7c3f, 0.9);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4dc, 1.45);
    this.sunLight.position.set(18, 28, 14);
    if (this.enableShadows) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      this.sunLight.shadow.camera.near = 2;
      this.sunLight.shadow.camera.far = 75;
      const d = 22;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0008;
    }
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.interiorLight = new THREE.PointLight(0xffe7bd, 0, 36, 1.1);
    this.scene.add(this.interiorLight);

    this.scene.add(this.worldRoot);
    this.scene.add(this.dynamicRoot);

    // Nearest interactable golden ring on ground
    this.nearestRing = new THREE.Mesh(
      new THREE.RingGeometry(0.74, 0.92, 28),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      })
    );
    this.nearestRing.rotation.x = -Math.PI / 2;
    this.nearestRing.visible = false;
    this.scene.add(this.nearestRing);

    // Pre-allocate burst particles pool
    const burstGeo = new THREE.SphereGeometry(0.09, 6, 6);
    for (let i = 0; i < 42; i++) {
      const m = new THREE.Mesh(
        burstGeo,
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 1 })
      );
      m.visible = false;
      this.scene.add(m);
      this.burstPool.push(m);
    }

    // 3D Rain streaks (LineSegments)
    this.rainPositions = new Float32Array(this.rainCount * 6);
    for (let i = 0; i < this.rainCount; i++) {
      const rx = (Math.random() - 0.5) * 44;
      const ry = Math.random() * 20;
      const rz = (Math.random() - 0.5) * 34;
      this.rainPositions[i * 6] = rx;
      this.rainPositions[i * 6 + 1] = ry;
      this.rainPositions[i * 6 + 2] = rz;
      this.rainPositions[i * 6 + 3] = rx - 0.14;
      this.rainPositions[i * 6 + 4] = ry - 0.85;
      this.rainPositions[i * 6 + 5] = rz + 0.12;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainLines = new THREE.LineSegments(
      rainGeo,
      new THREE.LineBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.65 })
    );
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);

    // 3D Mist / Pollen Motes
    this.mistPositions = new Float32Array(this.mistCount * 3);
    for (let i = 0; i < this.mistCount; i++) {
      this.mistPositions[i * 3] = (Math.random() - 0.5) * 42;
      this.mistPositions[i * 3 + 1] = 0.6 + Math.random() * 6;
      this.mistPositions[i * 3 + 2] = (Math.random() - 0.5) * 32;
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute('position', new THREE.BufferAttribute(this.mistPositions, 3));
    this.mistPoints = new THREE.Points(
      mistGeo,
      new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.22, transparent: true, opacity: 0.35 })
    );
    this.mistPoints.frustumCulled = false;
    this.scene.add(this.mistPoints);

    // 3D Night Fireflies
    this.fireflyPositions = new Float32Array(this.fireflyCount * 3);
    for (let i = 0; i < this.fireflyCount; i++) {
      this.fireflyPositions[i * 3] = (Math.random() - 0.5) * 34;
      this.fireflyPositions[i * 3 + 1] = 0.4 + Math.random() * 2.2;
      this.fireflyPositions[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute('position', new THREE.BufferAttribute(this.fireflyPositions, 3));
    this.fireflyPoints = new THREE.Points(
      ffGeo,
      new THREE.PointsMaterial({ color: 0xfde047, size: 0.24, transparent: true, opacity: 0.85 })
    );
    this.fireflyPoints.frustumCulled = false;
    this.fireflyPoints.visible = false;
    this.scene.add(this.fireflyPoints);

    // Context Loss / Restore
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);

    // Resize Observer
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
  };

  private onContextRestored = () => {
    this.handleResize();
  };

  public handleResize() {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  public scheduleNextFrame(cb: (now: number) => void) {
    if (this.disposed) return;
    this.cancelScheduledFrame();
    if (this.isSoftwareGl) {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (sync) {
          gl.flush();
          const checkSync = () => {
            if (this.disposed) return;
            const status = gl.clientWaitSync(sync, 0, 0);
            if (status === gl.TIMEOUT_EXPIRED) {
              this.timerHandle = window.setTimeout(checkSync, 16);
            } else {
              gl.deleteSync(sync);
              this.timerHandle = window.setTimeout(() => cb(performance.now()), 80);
            }
          };
          this.timerHandle = window.setTimeout(checkSync, 80);
          return;
        }
      }
      this.timerHandle = window.setTimeout(() => cb(performance.now()), 80);
    } else {
      this.rafHandle = requestAnimationFrame(cb);
    }
  }

  public cancelScheduledFrame() {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    if (this.timerHandle !== null) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
  }

  public snapCameraToPlayer(playerX: number, playerY: number, sceneId: SceneId) {
    const px = to3DX(playerX);
    const pz = to3DZ(playerY);
    const isInterior = sceneId.startsWith('interior_');
    const h = isInterior ? 17.5 : 27.5;
    const zOff = isInterior ? 8.2 : 12.8;
    this._camTarget.set(px, 0.7, pz);
    this.camera.position.set(px, h, pz + zOff);
    this.camera.lookAt(this._camTarget);
    this._camInitialized = true;
  }

  private clearCurrentSceneContent() {
    disposeObjectSubtree(this.worldRoot, this.keepTextures);
    this.worldRoot.clear();
    disposeObjectSubtree(this.dynamicRoot, this.keepTextures);
    this.dynamicRoot.clear();

    this.buildingAssets = [];
    this.lanternBulbs = [];
    this.lanternLights = [];
    this.interiorWindowMats = [];
    this.fountainRipple = null;
    this.treeGroups = [];
    this.portalGroups = [];
    this.festivalFlags = [];
    this.npcRigs.clear();
    this.animalGroups.clear();
    this.relicGroups.clear();
  }

  private rebuildScene(state: RenderFrameState) {
    this.clearCurrentSceneContent();
    this.activeSceneId = state.scene.id;
    this.activeFestivalMode = state.festivalMode;

    if (state.scene.id === 'povoado_principal') {
      this.buildMainVillage(state);
    } else if (state.scene.kind === 'interior') {
      this.buildInteriorScene(state);
    } else {
      this.buildRocaScene(state);
    }

    // Portals for current scene
    for (const portal of state.portals) {
      const pMesh = createPortalMarkerMesh(portal);
      this.worldRoot.add(pMesh);
      this.portalGroups.push(pMesh);
    }

    // Relics for current scene
    for (const relic of state.relics) {
      if (state.collectedRelicIds.includes(relic.id)) continue;
      const rMesh = createRelicMesh();
      rMesh.position.set(to3DX(relic.x), 0, to3DZ(relic.y));
      this.dynamicRoot.add(rMesh);
      this.relicGroups.set(relic.id, rMesh);
    }

    this.snapCameraToPlayer(state.playerX, state.playerY, state.scene.id);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildMainVillage(state: RenderFrameState) {
    const ww = WORLD_WIDTH * WORLD_TO_3D;
    const wh = WORLD_HEIGHT * WORLD_TO_3D;

    // Extended surrounding countryside meadow so no world edge void ever shows
    const groundGeo = new THREE.PlaneGeometry(ww + 160, wh + 140);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: this.textures.meadow,
      roughness: 0.94,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(ww / 2, 0, wh / 2);
    ground.receiveShadow = this.enableShadows;
    this.worldRoot.add(ground);

    // Dirt Roads radiating from Praça
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.textures.dirt,
      roughness: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const shoulderMat = new THREE.MeshStandardMaterial({
      color: 0x9c7853,
      roughness: 0.95,
    });

    for (const road of WORLD_ROADS) {
      const rw = road.width * WORLD_TO_3D;
      for (let i = 0; i < road.points.length - 1; i++) {
        const a = road.points[i];
        const b = road.points[i + 1];
        const ax = to3DX(a.x);
        const az = to3DZ(a.y);
        const bx = to3DX(b.x);
        const bz = to3DZ(b.y);
        const dx = bx - ax;
        const dz = bz - az;
        const len = Math.hypot(dx, dz);
        const ang = Math.atan2(dx, dz);

        const seg = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.04, len + rw * 0.45), roadMat);
        seg.position.set((ax + bx) / 2, 0.02, (az + bz) / 2);
        seg.rotation.y = ang;
        seg.receiveShadow = this.enableShadows;

        const shoulder = new THREE.Mesh(
          new THREE.BoxGeometry(rw + 0.45, 0.025, len + rw * 0.65),
          shoulderMat
        );
        shoulder.position.set((ax + bx) / 2, 0.01, (az + bz) / 2);
        shoulder.rotation.y = ang;
        this.worldRoot.add(shoulder, seg);
      }
    }

    // Praça Central cobblestones + curb
    const px = (PLAZA_RECT.x + PLAZA_RECT.width / 2) * WORLD_TO_3D;
    const pz = (PLAZA_RECT.y + PLAZA_RECT.height / 2) * WORLD_TO_3D;
    const pw = PLAZA_RECT.width * WORLD_TO_3D;
    const pd = PLAZA_RECT.height * WORLD_TO_3D;

    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(pw + 0.7, 0.08, pd + 0.7),
      new THREE.MeshStandardMaterial({ color: 0x948675, roughness: 0.88 })
    );
    curb.position.set(px, 0.02, pz);
    curb.receiveShadow = this.enableShadows;

    const plazaFloor = new THREE.Mesh(
      new THREE.BoxGeometry(pw, 0.08, pd),
      new THREE.MeshStandardMaterial({ map: this.textures.plaza, roughness: 0.86 })
    );
    plazaFloor.position.set(px, 0.04, pz);
    plazaFloor.receiveShadow = this.enableShadows;
    this.worldRoot.add(curb, plazaFloor);

    // 4 Flowerbeds around Praça Fountain
    const bedOffsets = [
      { bx: PLAZA_RECT.x + 135, by: PLAZA_RECT.y + 130 },
      { bx: PLAZA_RECT.x + PLAZA_RECT.width - 135, by: PLAZA_RECT.y + 130 },
      { bx: PLAZA_RECT.x + 135, by: PLAZA_RECT.y + PLAZA_RECT.height - 130 },
      { bx: PLAZA_RECT.x + PLAZA_RECT.width - 135, by: PLAZA_RECT.y + PLAZA_RECT.height - 130 },
    ];
    const flowerHexes = [0xfbbf24, 0xf87171, 0xf472b6, 0xffffff];
    for (const bed of bedOffsets) {
      const bx = to3DX(bed.bx);
      const bz = to3DZ(bed.by);
      const border = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.18, 3.8),
        new THREE.MeshStandardMaterial({ color: 0x785a3c, roughness: 0.9 })
      );
      border.position.set(bx, 0.09, bz);
      const turf = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.2, 3.4),
        new THREE.MeshStandardMaterial({ color: 0x4d823b, roughness: 0.92 })
      );
      turf.position.set(bx, 0.1, bz);
      this.worldRoot.add(border, turf);

      for (let f = 0; f < 6; f++) {
        const fx = bx - 1.2 + (f % 3) * 1.2;
        const fz = bz - 0.8 + Math.floor(f / 3) * 1.6;
        const flw = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.18, 0),
          new THREE.MeshStandardMaterial({ color: flowerHexes[f % flowerHexes.length], roughness: 0.6 })
        );
        flw.position.set(fx, 0.26, fz);
        this.worldRoot.add(flw);
      }
    }

    // Praça Wooden Benches
    const benchPositions = [
      { x: PLAZA_RECT.x + 300, y: PLAZA_RECT.y + 110 },
      { x: PLAZA_RECT.x + 300, y: PLAZA_RECT.y + PLAZA_RECT.height - 110 },
    ];
    for (const bp of benchPositions) {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.14, 0.65),
        new THREE.MeshStandardMaterial({ color: 0x7c4a2d, roughness: 0.82 })
      );
      seat.position.set(to3DX(bp.x), 0.36, to3DZ(bp.y));
      seat.castShadow = this.enableShadows;
      const legL = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.36, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 })
      );
      legL.position.set(to3DX(bp.x) - 1.0, 0.18, to3DZ(bp.y));
      const legR = legL.clone();
      legR.position.x = to3DX(bp.x) + 1.0;
      this.worldRoot.add(seat, legL, legR);
    }

    // Praça Fountain
    const fountain = createFountainGroup(PLAZA_FOUNTAIN.x, PLAZA_FOUNTAIN.y, this.enableShadows);
    this.fountainRipple = fountain.rippleRing;
    this.worldRoot.add(fountain.group);

    // Festival Bunting Flags
    if (state.festivalMode) {
      const flagColors = [0xef4444, 0xfacc15, 0x3b82f6, 0x22c55e, 0xf97316];
      for (let i = 0; i < 16; i++) {
        const flag = new THREE.Mesh(
          new THREE.ConeGeometry(0.24, 0.45, 3),
          new THREE.MeshStandardMaterial({ color: flagColors[i % flagColors.length], roughness: 0.6 })
        );
        flag.rotation.x = Math.PI;
        flag.position.set(to3DX(PLAZA_RECT.x + 35 + i * 36), 2.8, to3DZ(PLAZA_RECT.y + 40));
        this.worldRoot.add(flag);
        this.festivalFlags.push(flag);
      }
    }

    // Street Lantern Posts
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.5, roughness: 0.5 });
    for (const lp of STREET_LANTERN_POSITIONS) {
      const lx = to3DX(lp.x);
      const lz = to3DZ(lp.y);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.5, 8), ironMat);
      post.position.set(lx, 1.25, lz);
      post.castShadow = this.enableShadows;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.25, 6), ironMat);
      cap.position.set(lx, 2.65, lz);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xf59e0b,
        emissiveIntensity: 0,
        roughness: 0.3,
      });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), bulbMat);
      bulb.position.set(lx, 2.42, lz);
      const pLight = new THREE.PointLight(0xffb84d, 0, 12, 1.8);
      pLight.position.set(lx, 2.35, lz);
      this.worldRoot.add(post, cap, bulb, pLight);
      this.lanternBulbs.push(bulbMat);
      this.lanternLights.push(pLight);
    }

    // Soccer Field + 3D Goalposts & Ball
    const sx = (SOCCER_FIELD_RECT.x + SOCCER_FIELD_RECT.width / 2) * WORLD_TO_3D;
    const sz = (SOCCER_FIELD_RECT.y + SOCCER_FIELD_RECT.height / 2) * WORLD_TO_3D;
    const sw = SOCCER_FIELD_RECT.width * WORLD_TO_3D;
    const sd = SOCCER_FIELD_RECT.height * WORLD_TO_3D;
    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(sw, sd),
      new THREE.MeshStandardMaterial({ map: this.textures.soccer, roughness: 0.88 })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(sx, 0.025, sz);
    pitch.receiveShadow = this.enableShadows;
    this.worldRoot.add(pitch);

    const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    for (const gx of [sx - sw / 2 + 0.25, sx + sw / 2 - 0.25]) {
      const postA = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8), postMat);
      postA.position.set(gx, 0.75, sz - 1.4);
      const postB = postA.clone();
      postB.position.z = sz + 1.4;
      const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.85, 8), postMat);
      crossbar.rotation.x = Math.PI / 2;
      crossbar.position.set(gx, 1.5, sz);
      this.worldRoot.add(postA, postB, crossbar);
    }
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 })
    );
    ball.position.set(sx, 0.24, sz);
    ball.castShadow = this.enableShadows;
    this.worldRoot.add(ball);

    // Carroça & Village Well
    this.worldRoot.add(createCarrocaMesh(PARKED_CARROCA.x, PARKED_CARROCA.y, this.enableShadows));
    this.worldRoot.add(createVillageWellMesh(VILLAGE_WELL.x, VILLAGE_WELL.y, this.enableShadows));

    // Buildings & Radio Tower
    for (const b of WORLD_BUILDINGS) {
      const built = createBuildingMesh(b, this.enableShadows);
      this.worldRoot.add(built.group);
      this.buildingAssets.push(built);
    }

    // Trees
    for (const t of WORLD_TREES) {
      const tree = createTreeMesh(t, this.enableShadows);
      this.worldRoot.add(tree);
      this.treeGroups.push(tree);
    }

    // Signposts around Praça
    const signs = [
      { x: 885, y: 765, text: '↖ Escola' },
      { x: 1515, y: 765, text: '↗ Campo' },
      { x: 875, y: 1090, text: '← Igreja' },
      { x: 885, y: 1345, text: '↙ Roça / Mercadinho' },
      { x: 1515, y: 1345, text: '↘ Vila Sul' },
      { x: 1535, y: 1000, text: '→ Torre de Rádio' },
      { x: 155, y: 1845, text: '↙ Roça Antiga' },
    ];
    for (const s of signs) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 1.0, 6),
        new THREE.MeshStandardMaterial({ color: 0x5c331c, roughness: 0.85 })
      );
      post.position.set(to3DX(s.x), 0.5, to3DZ(s.y));
      const plate = createNameplateSprite(s.text, undefined, '#451a03', 'rgba(254, 243, 199, 0.94)', 2.7);
      plate.position.set(to3DX(s.x), 1.32, to3DZ(s.y));
      this.worldRoot.add(post, plate);
    }
  }

  private buildRocaScene(state: RenderFrameState) {
    const { scene } = state;
    const rw = scene.width * WORLD_TO_3D;
    const rd = scene.height * WORLD_TO_3D;

    const groundGeo = new THREE.PlaneGeometry(rw + 100, rd + 100);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ map: this.textures.roca, roughness: 0.94 })
    );
    ground.position.set(rw / 2, 0, rd / 2);
    ground.receiveShadow = this.enableShadows;
    this.worldRoot.add(ground);

    // Dirt road leading east back to Povoado Barriga
    const roadMat = new THREE.MeshStandardMaterial({ map: this.textures.dirt, roughness: 0.92 });
    const pts = [
      { x: 370, y: 450 },
      { x: 740, y: 500 },
      { x: 1385, y: 500 },
    ];
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = to3DX(pts[i].x);
      const az = to3DZ(pts[i].y);
      const bx = to3DX(pts[i + 1].x);
      const bz = to3DZ(pts[i + 1].y);
      const len = Math.hypot(bx - ax, bz - az);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.04, len + 0.8), roadMat);
      seg.position.set((ax + bx) / 2, 0.02, (az + bz) / 2);
      seg.rotation.y = Math.atan2(bx - ax, bz - az);
      seg.receiveShadow = this.enableShadows;
      this.worldRoot.add(seg);
    }

    for (const item of scene.furniture) {
      this.worldRoot.add(createFurnitureMesh(item, this.enableShadows));
    }

    if (scene.trees) {
      for (const t of scene.trees) {
        const tree = createTreeMesh(t, this.enableShadows);
        this.worldRoot.add(tree);
        this.treeGroups.push(tree);
      }
    }
  }

  private buildInteriorScene(state: RenderFrameState) {
    const { scene } = state;
    const rw = scene.width * WORLD_TO_3D;
    const rd = scene.height * WORLD_TO_3D;

    const floorTex =
      scene.floorTheme === 'wood'
        ? this.textures.wood
        : scene.floorTheme === 'workshop'
        ? this.textures.workshop
        : scene.floorTheme === 'studio'
        ? this.textures.studio
        : this.textures.tile;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(rw, rd),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.82 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(rw / 2, 0, rd / 2);
    floor.receiveShadow = this.enableShadows;
    this.worldRoot.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({
      color: scene.wallColor ?? '#eadbc0',
      roughness: 0.85,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: scene.trimColor ?? '#6f4225',
      roughness: 0.78,
    });

    // Back wall (-Z, tall) & Side walls (medium height) & low front curb (+Z so camera view is unobstructed)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(rw + 0.5, 2.8, 0.35), wallMat);
    backWall.position.set(rw / 2, 1.4, 0);
    backWall.receiveShadow = this.enableShadows;
    const backTrim = new THREE.Mesh(new THREE.BoxGeometry(rw + 0.55, 0.25, 0.4), trimMat);
    backTrim.position.set(rw / 2, 2.85, 0);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.0, rd), wallMat);
    leftWall.position.set(0, 1.0, rd / 2);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.0, rd), wallMat);
    rightWall.position.set(rw, 1.0, rd / 2);

    const frontCurbL = new THREE.Mesh(new THREE.BoxGeometry(rw * 0.4, 0.55, 0.3), trimMat);
    frontCurbL.position.set(rw * 0.2, 0.275, rd);
    const frontCurbR = frontCurbL.clone();
    frontCurbR.position.x = rw * 0.8;

    this.worldRoot.add(backWall, backTrim, leftWall, rightWall, frontCurbL, frontCurbR);

    // Back windows tinted dynamically with time of day
    for (const wx of [rw * 0.22, rw * 0.78]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.35, 0.14), trimMat);
      frame.position.set(wx, 1.55, 0.2);
      const paneMat = new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        emissive: 0x000000,
        roughness: 0.25,
      });
      const pane = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.05, 0.16), paneMat);
      pane.position.set(wx, 1.55, 0.21);
      this.worldRoot.add(frame, pane);
      this.interiorWindowMats.push(paneMat);
    }

    for (const item of scene.furniture) {
      this.worldRoot.add(createFurnitureMesh(item, this.enableShadows));
    }

    this.interiorLight.position.set(rw / 2, 6.5, rd / 2);
  }

  private syncCharactersAndEntities(state: RenderFrameState) {
    // 1. Cleilson (rebuild only when stageId changes or missing)
    if (!this.playerRig || this.currentStageId !== state.stageId) {
      if (this.playerRig) {
        this.dynamicRoot.remove(this.playerRig.group);
        disposeObjectSubtree(this.playerRig.group, this.keepTextures);
      }
      this.playerRig = createCleilsonRig(state.stageId, this.enableShadows);
      this.currentStageId = state.stageId;
      this.dynamicRoot.add(this.playerRig.group);
    }

    const px = to3DX(state.playerX);
    const pz = to3DZ(state.playerY);
    this.playerRig.group.position.set(px, 0, pz);

    // Smooth yaw toward movement direction
    const targetYaw = dirToYaw(state.playerDir);
    const curYaw = this.playerRig.group.rotation.y;
    let deltaYaw = targetYaw - curYaw;
    while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
    while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
    this.playerRig.group.rotation.y = curYaw + deltaYaw * 0.28;

    // Walk animation
    if (state.isMoving) {
      const swing = Math.sin(state.time * 13) * 0.55;
      this.playerRig.leftLeg.rotation.x = swing;
      this.playerRig.rightLeg.rotation.x = -swing;
      this.playerRig.leftArm.rotation.x = -swing * 0.7;
      this.playerRig.rightArm.rotation.x = swing * 0.5;
      this.playerRig.bodyPivot.position.y = Math.abs(Math.sin(state.time * 13)) * 0.06;
    } else {
      this.playerRig.leftLeg.rotation.x *= 0.75;
      this.playerRig.rightLeg.rotation.x *= 0.75;
      this.playerRig.leftArm.rotation.x *= 0.75;
      this.playerRig.rightArm.rotation.x *= 0.75;
      this.playerRig.bodyPivot.position.y = Math.sin(state.time * 2.5) * 0.015;
    }

    // 2. NPCs in active scene
    const activeNpcIds = new Set(state.npcs.map((n) => n.id));
    for (const [id, rig] of this.npcRigs.entries()) {
      if (!activeNpcIds.has(id)) {
        this.dynamicRoot.remove(rig.group);
        disposeObjectSubtree(rig.group, this.keepTextures);
        this.npcRigs.delete(id);
      }
    }

    for (const npc of state.npcs) {
      let rig = this.npcRigs.get(npc.id);
      if (!rig) {
        rig = createNPCRig(npc, this.enableShadows);
        this.dynamicRoot.add(rig.group);
        this.npcRigs.set(npc.id, rig);
      }
      rig.group.position.set(to3DX(npc.x), 0, to3DZ(npc.y));
      rig.bodyPivot.rotation.y = dirToYaw(npc.facing);

      if (npc.isMoving) {
        const sw = Math.sin(state.time * 10 + npc.x * 0.03) * 0.45;
        rig.leftLeg.rotation.x = sw;
        rig.rightLeg.rotation.x = -sw;
        rig.leftArm.rotation.x = -sw * 0.6;
        rig.rightArm.rotation.x = sw * 0.6;
      } else {
        rig.leftLeg.rotation.x = 0;
        rig.rightLeg.rotation.x = 0;
        rig.leftArm.rotation.x = 0;
        rig.rightArm.rotation.x = 0;
      }

      if (rig.questBadge) {
        const hasQuest = state.highlightNpcIds.includes(npc.id);
        rig.questBadge.visible = hasQuest;
        if (hasQuest) {
          rig.questBadge.position.y = 2.82 + Math.sin(state.time * 4.5) * 0.14;
          rig.questBadge.rotation.y = state.time * 2.2;
        }
      }
    }

    // 3. Animals
    const activeAnimalIds = new Set(state.animals.map((a) => a.id));
    for (const [id, grp] of this.animalGroups.entries()) {
      if (!activeAnimalIds.has(id)) {
        this.dynamicRoot.remove(grp);
        disposeObjectSubtree(grp, this.keepTextures);
        this.animalGroups.delete(id);
      }
    }
    for (const a of state.animals) {
      let grp = this.animalGroups.get(a.id);
      if (!grp) {
        grp = createAnimalMesh(a, this.enableShadows);
        this.dynamicRoot.add(grp);
        this.animalGroups.set(a.id, grp);
      }
      grp.position.set(to3DX(a.x), Math.abs(Math.sin(state.time * 7 + a.x)) * 0.04, to3DZ(a.y));
      if (Math.hypot(a.vx, a.vy) > 1) {
        grp.rotation.y = Math.atan2(a.vx, a.vy);
      }
      const tail = grp.userData.tail as THREE.Mesh | undefined;
      if (tail) {
        tail.rotation.y = Math.sin(state.time * 14) * 0.45;
      }
    }

    // 4. Relics (hide collected ones)
    for (const [id, grp] of this.relicGroups.entries()) {
      if (state.collectedRelicIds.includes(id)) {
        this.dynamicRoot.remove(grp);
        disposeObjectSubtree(grp, this.keepTextures);
        this.relicGroups.delete(id);
      } else {
        const gem = grp.userData.gem as THREE.Mesh | undefined;
        if (gem) {
          gem.rotation.y = state.time * 2.2;
          gem.position.y = 0.65 + Math.sin(state.time * 3.5) * 0.12;
        }
      }
    }

    // 5. Burst & footstep particles
    for (let i = 0; i < this.burstPool.length; i++) {
      const m = this.burstPool[i];
      const p = state.particles[i];
      if (!p) {
        m.visible = false;
      } else {
        m.visible = true;
        m.position.set(to3DX(p.x), 0.25 + (1 - p.life / p.maxLife) * 0.5, to3DZ(p.y));
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.color.set(p.color);
        mat.opacity = Math.max(0, p.life / p.maxLife);
        m.scale.setScalar(Math.max(0.4, p.size / 3));
      }
    }

    // 6. Nearest interactable ground pulse ring
    if (state.nearestInteractable) {
      this.nearestRing.visible = true;
      this.nearestRing.position.set(
        to3DX(state.nearestInteractable.x),
        0.06,
        to3DZ(state.nearestInteractable.y + 6)
      );
      const pulse = 1 + Math.sin(state.time * 6) * 0.1;
      this.nearestRing.scale.setScalar(pulse);
    } else {
      this.nearestRing.visible = false;
    }
  }

  private updateEnvironmentAndLighting(state: RenderFrameState, dt: number) {
    const isInterior = state.scene.kind === 'interior';
    const dayInfo = getDaylightPhaseInfo(state.worldHour);
    const nf = dayInfo.nightFactor;
    const df = dayInfo.duskFactor;
    const wx = state.weather;
    const wi = state.weatherIntensity;

    if (isInterior) {
      this._skyColor.set('#140e09');
      this.scene.background = this._skyColor;
      if (this.scene.fog instanceof THREE.Fog) {
        this.scene.fog.color.copy(this._skyColor);
        this.scene.fog.near = 28;
        this.scene.fog.far = 65;
      }
      this.hemiLight.color.set('#fef3c7');
      this.hemiLight.groundColor.set('#4b2e18');
      this.hemiLight.intensity = 1.05;
      this.sunLight.intensity = 0.75;
      this.sunLight.color.set('#fff3d6');
      this.interiorLight.intensity = 1.5;

      const winHex =
        dayInfo.phaseKey === 'night'
          ? '#1e293b'
          : dayInfo.phaseKey === 'dusk' || dayInfo.phaseKey === 'dawn'
          ? '#fb923c'
          : '#bae6fd';
      for (const wm of this.interiorWindowMats) {
        wm.color.set(winHex);
        wm.emissive.set(winHex);
        wm.emissiveIntensity = dayInfo.phaseKey === 'night' ? 0.2 : 0.45;
      }

      if (this.playerRig?.lampLight && this.playerRig?.lampBulb) {
        this.playerRig.lampLight.intensity = 0;
        (this.playerRig.lampBulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      }

      this.rainLines.visible = false;
      this.mistPoints.visible = false;
      this.fireflyPoints.visible = false;
      return;
    }

    this.interiorLight.intensity = 0;

    // Sky & Fog colors blended across Day -> Dusk/Dawn -> Night + Weather overcast
    this._skyColor.set('#8bc8e8');
    if (df > 0.01) {
      this._skyColor.lerp(this._fogColor.set('#d97736'), df * 0.72);
    }
    if (nf > 0.01) {
      this._skyColor.lerp(this._fogColor.set('#0e162e'), nf * 0.92);
    }
    if (wx === 'CLOUDY') {
      this._skyColor.lerp(this._fogColor.set('#7a8796'), 0.42 * wi);
    } else if (wx === 'RAINY') {
      this._skyColor.lerp(this._fogColor.set('#3f4f63'), 0.6 * wi);
    }
    this.scene.background = this._skyColor;

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this._skyColor);
      this.scene.fog.near = wx === 'RAINY' ? 28 : 42;
      this.scene.fog.far = wx === 'RAINY' ? 74 : 98;
    }

    // Hemisphere & Directional sun/moon light
    this._hemiSky.set('#dbeafe').lerp(this._fogColor.set('#3b4c7a'), nf * 0.85);
    this._hemiGround.set('#4d7c3f').lerp(this._fogColor.set('#141c2b'), nf * 0.82);
    this.hemiLight.color.copy(this._hemiSky);
    this.hemiLight.groundColor.copy(this._hemiGround);
    const weatherDim = wx === 'RAINY' ? 0.68 : wx === 'CLOUDY' ? 0.84 : 1.0;
    this.hemiLight.intensity = (0.98 - nf * 0.45) * weatherDim;

    this._sunColor.set('#fff5dc');
    if (df > 0.01) this._sunColor.lerp(this._fogColor.set('#fb923c'), df * 0.8);
    if (nf > 0.01) this._sunColor.lerp(this._fogColor.set('#93c5fd'), nf);
    this.sunLight.color.copy(this._sunColor);
    this.sunLight.intensity = (1.55 - nf * 1.02 + df * 0.2) * weatherDim;

    // Move shadow-casting directional light cleanly around player
    const px = to3DX(state.playerX);
    const pz = to3DZ(state.playerY);
    const sunAngle = ((state.worldHour - 6) / 12) * Math.PI;
    const sunXOffset = Math.cos(sunAngle) * -14;
    this.sunLight.position.set(px + sunXOffset + 6, 26, pz + 12);
    this.sunLight.target.position.set(px, 0, pz);
    this.sunLight.target.updateMatrixWorld();

    // Window emissive glow at dusk/night
    for (const ba of this.buildingAssets) {
      for (const wm of ba.windowMaterials) {
        wm.emissiveIntensity = nf > 0.25 ? 0.9 * nf : 0;
        wm.color.set(nf > 0.25 ? '#fde047' : '#bae6fd');
      }
      if (ba.beaconMat && ba.beaconLight && ba.waveRings) {
        const blink = Math.sin(state.time * (state.radioBroadcasting ? 8 : 3.5)) > 0;
        ba.beaconMat.emissiveIntensity = blink ? 1.8 : 0.25;
        ba.beaconLight.intensity = blink ? 1.8 : 0.2;
        ba.waveRings.forEach((ring, idx) => {
          const ph = (state.time * (state.radioBroadcasting ? 1.3 : 0.65) + idx / 3) % 1;
          ring.scale.setScalar(0.5 + ph * (state.radioBroadcasting ? 4.2 : 2.5));
          const rmat = ring.material as THREE.MeshBasicMaterial;
          rmat.color.set(state.radioBroadcasting ? '#facc15' : '#f87171');
          rmat.opacity = (1 - ph) * 0.72;
        });
      }
    }

    // Street lanterns & Cleilson handheld lampião
    const lanternIntensity = nf > 0.25 ? Math.min(1, (nf - 0.25) / 0.45) : 0;
    for (let i = 0; i < this.lanternBulbs.length; i++) {
      this.lanternBulbs[i].emissiveIntensity = lanternIntensity * 1.6;
      this.lanternLights[i].intensity = lanternIntensity * 2.8;
    }

    if (this.playerRig?.lampLight && this.playerRig?.lampBulb) {
      const lampOn = nf > 0.3 ? Math.min(1, (nf - 0.3) / 0.4) : 0;
      this.playerRig.lampLight.intensity = lampOn * 2.4;
      (this.playerRig.lampBulb.material as THREE.MeshStandardMaterial).emissiveIntensity =
        lampOn * 1.6;
    }

    // Trees gentle breeze & Fountain water ripple
    for (const tree of this.treeGroups) {
      const pivot = tree.userData.canopyPivot as THREE.Group | undefined;
      const phase = (tree.userData.phase as number) || 0;
      if (pivot) {
        const windAmp = wx === 'RAINY' ? 0.045 : 0.02;
        pivot.rotation.z = Math.sin(state.time * 1.6 + phase) * windAmp;
      }
    }
    if (this.fountainRipple) {
      const rp = (state.time * 0.8) % 1;
      this.fountainRipple.scale.setScalar(0.7 + rp * 2.1);
      (this.fountainRipple.material as THREE.MeshBasicMaterial).opacity = (1 - rp) * 0.6;
    }

    for (let i = 0; i < this.portalGroups.length; i++) {
      const ring = this.portalGroups[i].userData.ring as THREE.Mesh | undefined;
      if (ring) {
        ring.scale.setScalar(1 + Math.sin(state.time * 4 + i) * 0.1);
      }
    }

    // Weather 3D Rain Streaks
    if (wx === 'RAINY') {
      this.rainLines.visible = true;
      this.rainLines.position.set(px, 0, pz);
      (this.rainLines.material as THREE.LineBasicMaterial).opacity = 0.62 * wi;
      for (let i = 0; i < this.rainCount; i++) {
        let ry = this.rainPositions[i * 6 + 1] - dt * 26;
        let rx = this.rainPositions[i * 6] - dt * 3.8;
        if (ry < 0) {
          ry = 18 + Math.random() * 4;
          rx = (Math.random() - 0.5) * 44;
        }
        this.rainPositions[i * 6] = rx;
        this.rainPositions[i * 6 + 1] = ry;
        this.rainPositions[i * 6 + 3] = rx - 0.14;
        this.rainPositions[i * 6 + 4] = ry - 0.85;
      }
      (this.rainLines.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    } else {
      this.rainLines.visible = false;
    }

    // Mist / Sun Pollen Motes
    this.mistPoints.visible = true;
    this.mistPoints.position.set(px, 0, pz);
    const mistMat = this.mistPoints.material as THREE.PointsMaterial;
    if (wx === 'CLOUDY') {
      mistMat.color.set('#e2e8f0');
      mistMat.opacity = 0.38 * wi;
    } else if (wx === 'RAINY') {
      mistMat.color.set('#cbd5e1');
      mistMat.opacity = 0.28 * wi;
    } else {
      mistMat.color.set('#fef08a');
      mistMat.opacity = (1 - nf) * 0.25 * wi;
    }
    for (let i = 0; i < this.mistCount; i++) {
      this.mistPositions[i * 3] += dt * (wx === 'CLOUDY' ? 1.6 : 0.45);
      if (this.mistPositions[i * 3] > 21) this.mistPositions[i * 3] = -21;
    }
    (this.mistPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Night Fireflies
    if (nf > 0.35) {
      this.fireflyPoints.visible = true;
      this.fireflyPoints.position.set(px, 0, pz);
      (this.fireflyPoints.material as THREE.PointsMaterial).opacity =
        0.5 + Math.sin(state.time * 4) * 0.35;
      for (let i = 0; i < this.fireflyCount; i++) {
        this.fireflyPositions[i * 3] += Math.sin(state.time * 1.2 + i) * dt * 0.6;
        this.fireflyPositions[i * 3 + 1] =
          0.6 + Math.abs(Math.sin(state.time * 1.4 + i * 0.7)) * 1.4;
      }
      (this.fireflyPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    } else {
      this.fireflyPoints.visible = false;
    }
  }

  public renderFrame(state: RenderFrameState, dt: number) {
    if (this.disposed) return;

    if (
      this.activeSceneId !== state.scene.id ||
      this.activeFestivalMode !== state.festivalMode
    ) {
      this.rebuildScene(state);
    }

    this.syncCharactersAndEntities(state);
    this.updateEnvironmentAndLighting(state, dt);

    // Steep top-down 2D-style overhead camera damped follow
    const px = to3DX(state.playerX);
    const pz = to3DZ(state.playerY);
    const isInterior = state.scene.kind === 'interior';
    const camHeight = isInterior ? 17.5 : 27.5;
    const camSouthOffset = isInterior ? 8.2 : 12.8;

    this._desiredCamPos.set(px, camHeight, pz + camSouthOffset);
    this._desiredLookAt.set(px, 0.7, pz);

    if (!this._camInitialized) {
      this.camera.position.copy(this._desiredCamPos);
      this._camTarget.copy(this._desiredLookAt);
      this._camInitialized = true;
    } else {
      const lambda = 9.5;
      this.camera.position.x = THREE.MathUtils.damp(
        this.camera.position.x,
        this._desiredCamPos.x,
        lambda,
        dt
      );
      this.camera.position.y = THREE.MathUtils.damp(
        this.camera.position.y,
        this._desiredCamPos.y,
        lambda,
        dt
      );
      this.camera.position.z = THREE.MathUtils.damp(
        this.camera.position.z,
        this._desiredCamPos.z,
        lambda,
        dt
      );
      this._camTarget.x = THREE.MathUtils.damp(
        this._camTarget.x,
        this._desiredLookAt.x,
        lambda,
        dt
      );
      this._camTarget.y = THREE.MathUtils.damp(
        this._camTarget.y,
        this._desiredLookAt.y,
        lambda,
        dt
      );
      this._camTarget.z = THREE.MathUtils.damp(
        this._camTarget.z,
        this._desiredLookAt.z,
        lambda,
        dt
      );
    }

    this.camera.lookAt(this._camTarget);
    this.renderer.render(this.scene, this.camera);
  }

  public getObjectiveCompassProjection(
    targetX: number,
    targetY: number
  ): CompassProjection | null {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return null;

    this._projVec.set(to3DX(targetX), 1.0, to3DZ(targetY));
    this._projVec.project(this.camera);

    const inFront = this._projVec.z < 1;
    let sx = (this._projVec.x * 0.5 + 0.5) * w;
    let sy = (-this._projVec.y * 0.5 + 0.5) * h;

    if (!inFront) {
      sx = w - sx;
      sy = h - sy;
    }

    const margin = 56;
    if (
      inFront &&
      sx >= margin &&
      sx <= w - margin &&
      sy >= margin &&
      sy <= h - margin
    ) {
      return { visible: false, edgeX: sx, edgeY: sy, angleRad: 0 };
    }

    const cx = w / 2;
    const cy = h / 2;
    const angleRad = Math.atan2(sy - cy, sx - cx);
    const edgeX = Math.max(margin, Math.min(w - margin, sx));
    const edgeY = Math.max(margin + 30, Math.min(h - margin - 20, sy));
    return { visible: true, edgeX, edgeY, angleRad };
  }

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelScheduledFrame();
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.clearCurrentSceneContent();
    if (this.playerRig) {
      disposeObjectSubtree(this.playerRig.group, this.keepTextures);
      this.playerRig = null;
    }
    disposeObjectSubtree(this.scene, this.keepTextures);
    this.textures.dispose();
    this.envRT.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
