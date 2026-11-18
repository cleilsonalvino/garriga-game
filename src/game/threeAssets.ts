import * as THREE from 'three';
import {
  InteractiveNPC,
  LifeStageId,
  RoamingAnimal,
  SceneFurniture,
  ScenePortal,
  WorldBuilding,
} from './types';
import { WorldTree } from './worldData';

// 30 2D simulation pixels = 1.0 3D meter/unit
export const WORLD_TO_3D = 1 / 30;

export function to3DX(x: number): number {
  return x * WORLD_TO_3D;
}

export function to3DZ(y: number): number {
  return y * WORLD_TO_3D;
}

export function dirToYaw(dir: 'down' | 'up' | 'left' | 'right'): number {
  switch (dir) {
    case 'down':
      return 0; // +Z facing camera
    case 'up':
      return Math.PI; // -Z facing away
    case 'right':
      return Math.PI / 2; // +X
    case 'left':
      return -Math.PI / 2; // -X
  }
}

// ---------- Shared Procedural Textures (with SRGBColorSpace & Anisotropy) ----------

export interface ProceduralTextureCache {
  meadow: THREE.CanvasTexture;
  roca: THREE.CanvasTexture;
  plaza: THREE.CanvasTexture;
  dirt: THREE.CanvasTexture;
  soccer: THREE.CanvasTexture;
  wood: THREE.CanvasTexture;
  workshop: THREE.CanvasTexture;
  tile: THREE.CanvasTexture;
  studio: THREE.CanvasTexture;
  maxAnisotropy: number;
  dispose: () => void;
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  anisotropy: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextureCache(
  maxAnisotropy: number
): ProceduralTextureCache {
  const aniso = Math.min(8, Math.max(1, maxAnisotropy));

  // 1. Meadow grass
  const meadowC = document.createElement('canvas');
  meadowC.width = 256;
  meadowC.height = 256;
  const mctx = meadowC.getContext('2d')!;
  mctx.fillStyle = '#588c44';
  mctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    const gx = (i * 73) % 256;
    const gy = (i * 139) % 256;
    mctx.fillStyle = i % 3 === 0 ? '#649c4d' : i % 3 === 1 ? '#4d7e3a' : '#70a856';
    mctx.fillRect(gx, gy, 6, 4);
    if (i % 19 === 0) {
      mctx.fillStyle = '#facc15';
      mctx.fillRect(gx + 1, gy + 1, 3, 3);
    }
  }
  const meadow = finalizeTexture(meadowC, 42, 32, aniso);

  // 2. Roca soil/grass
  const rocaC = document.createElement('canvas');
  rocaC.width = 256;
  rocaC.height = 256;
  const rctx = rocaC.getContext('2d')!;
  rctx.fillStyle = '#50823e';
  rctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const gx = (i * 97) % 256;
    const gy = (i * 59) % 256;
    rctx.fillStyle = i % 2 === 0 ? '#457335' : '#61964a';
    rctx.fillRect(gx, gy, 8, 5);
  }
  const roca = finalizeTexture(rocaC, 22, 16, aniso);

  // 3. Cobblestone Praça
  const plazaC = document.createElement('canvas');
  plazaC.width = 256;
  plazaC.height = 256;
  const pctx = plazaC.getContext('2d')!;
  pctx.fillStyle = '#cfc0aa';
  pctx.fillRect(0, 0, 256, 256);
  const stoneW = 32;
  const stoneH = 24;
  for (let row = 0; row < 12; row++) {
    const offset = (row % 2) * (stoneW / 2);
    for (let col = -1; col < 9; col++) {
      const sx = col * stoneW + offset;
      const sy = row * stoneH;
      const shade = ((row * 7 + col * 11) % 3) * 6;
      pctx.fillStyle = `rgb(${212 - shade}, ${195 - shade}, ${170 - shade})`;
      pctx.fillRect(sx + 1.5, sy + 1.5, stoneW - 3, stoneH - 3);
    }
  }
  const plaza = finalizeTexture(plazaC, 8, 7, aniso);

  // 4. Dirt road
  const dirtC = document.createElement('canvas');
  dirtC.width = 128;
  dirtC.height = 128;
  const dctx = dirtC.getContext('2d')!;
  dctx.fillStyle = '#c4986a';
  dctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 140; i++) {
    const px = (i * 53) % 128;
    const py = (i * 89) % 128;
    dctx.fillStyle = i % 2 === 0 ? '#b48758' : '#d2a87b';
    dctx.fillRect(px, py, 5, 3);
  }
  const dirt = finalizeTexture(dirtC, 4, 4, aniso);

  // 5. Striped Soccer Pitch with white chalk lines
  const socC = document.createElement('canvas');
  socC.width = 512;
  socC.height = 320;
  const sctx = socC.getContext('2d')!;
  const stripeW = 512 / 8;
  for (let i = 0; i < 8; i++) {
    sctx.fillStyle = i % 2 === 0 ? '#2f8f3c' : '#277a32';
    sctx.fillRect(i * stripeW, 0, stripeW + 1, 320);
  }
  sctx.strokeStyle = 'rgba(255,255,255,0.92)';
  sctx.lineWidth = 4;
  sctx.strokeRect(14, 14, 512 - 28, 320 - 28);
  sctx.beginPath();
  sctx.moveTo(256, 14);
  sctx.lineTo(256, 306);
  sctx.stroke();
  sctx.beginPath();
  sctx.arc(256, 160, 44, 0, Math.PI * 2);
  sctx.stroke();
  sctx.strokeRect(14, 92, 68, 136);
  sctx.strokeRect(512 - 82, 92, 68, 136);
  const soccer = finalizeTexture(socC, 1, 1, aniso);

  // 6. Wood planks (Casa)
  const woodC = document.createElement('canvas');
  woodC.width = 256;
  woodC.height = 256;
  const wctx = woodC.getContext('2d')!;
  wctx.fillStyle = '#a47247';
  wctx.fillRect(0, 0, 256, 256);
  for (let py = 0; py < 256; py += 32) {
    wctx.fillStyle = py % 64 === 0 ? '#9c6b41' : '#ac794d';
    wctx.fillRect(0, py + 1, 256, 30);
    wctx.fillStyle = '#6f4726';
    wctx.fillRect(0, py, 256, 2);
  }
  const wood = finalizeTexture(woodC, 4, 3, aniso);

  // 7. Workshop floor
  const workC = document.createElement('canvas');
  workC.width = 256;
  workC.height = 256;
  const wkctx = workC.getContext('2d')!;
  wkctx.fillStyle = '#865d37';
  wkctx.fillRect(0, 0, 256, 256);
  for (let py = 0; py < 256; py += 32) {
    wkctx.fillStyle = py % 64 === 0 ? '#7d5531' : '#8e643c';
    wkctx.fillRect(0, py + 1, 256, 30);
    wkctx.fillStyle = '#54371d';
    wkctx.fillRect(0, py, 256, 2);
  }
  const workshop = finalizeTexture(workC, 4, 3, aniso);

  // 8. Tile checkerboard (Escola & Mercearia)
  const tileC = document.createElement('canvas');
  tileC.width = 128;
  tileC.height = 128;
  const tctx = tileC.getContext('2d')!;
  tctx.fillStyle = '#dfd2bc';
  tctx.fillRect(0, 0, 128, 128);
  tctx.fillStyle = '#d0bfa2';
  tctx.fillRect(0, 0, 64, 64);
  tctx.fillRect(64, 64, 64, 64);
  const tile = finalizeTexture(tileC, 7, 5, aniso);

  // 9. Studio floor (Rádio)
  const studC = document.createElement('canvas');
  studC.width = 128;
  studC.height = 128;
  const stctx = studC.getContext('2d')!;
  stctx.fillStyle = '#334155';
  stctx.fillRect(0, 0, 128, 128);
  stctx.fillStyle = '#3c4b62';
  stctx.fillRect(0, 0, 64, 64);
  stctx.fillRect(64, 64, 64, 64);
  const studio = finalizeTexture(studC, 6, 4, aniso);

  return {
    meadow,
    roca,
    plaza,
    dirt,
    soccer,
    wood,
    workshop,
    tile,
    studio,
    maxAnisotropy: aniso,
    dispose: () => {
      meadow.dispose();
      roca.dispose();
      plaza.dispose();
      dirt.dispose();
      soccer.dispose();
      wood.dispose();
      workshop.dispose();
      tile.dispose();
      studio.dispose();
    },
  };
}

// ---------- Crisp Nameplate & Sign Sprite ----------

export function createNameplateSprite(
  text: string,
  subtext?: string,
  accentColor = '#fde68a',
  bgColor = 'rgba(22, 16, 11, 0.84)',
  worldWidth = 4.2
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 512;
  canvas.height = subtext ? 128 : 84;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = 'rgba(212, 155, 66, 0.72)';
  ctx.lineWidth = 4;

  const padX = 24;
  const padY = 12;
  ctx.beginPath();
  ctx.roundRect(padX, padY, canvas.width - padX * 2, canvas.height - padY * 2, 18);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentColor;
  ctx.font = '700 32px "Plus Jakarta Sans", system-ui, sans-serif';
  if (subtext) {
    ctx.fillText(text, canvas.width / 2, canvas.height * 0.38);
    ctx.fillStyle = '#e7d6bd';
    ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(subtext, canvas.width / 2, canvas.height * 0.68);
  } else {
    ctx.fillText(text, canvas.width / 2, canvas.height * 0.52);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const aspect = canvas.height / canvas.width;
  sprite.scale.set(worldWidth, worldWidth * aspect, 1);
  return sprite;
}

// ---------- Composite Character Builders ----------

export interface CharacterRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  questBadge?: THREE.Group;
  lampBulb?: THREE.Mesh;
  lampLight?: THREE.PointLight;
  stageId?: LifeStageId;
}

function createContactShadow(radius: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 18);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = 0.025;
  return m;
}

export function createCleilsonRig(
  stageId: LifeStageId,
  enableShadows: boolean
): CharacterRig {
  const group = new THREE.Group();
  const scale =
    stageId === 'INFANCIA'
      ? 0.86
      : stageId === 'PRE_ADOLESCENCIA'
      ? 0.96
      : stageId === 'JUVENTUDE'
      ? 1.06
      : 1.14;

  const shirtHex =
    stageId === 'INFANCIA'
      ? 0x38bdf8
      : stageId === 'PRE_ADOLESCENCIA'
      ? 0xf59e0b
      : stageId === 'JUVENTUDE'
      ? 0x2563eb
      : 0x0d9488;
  const pantsHex =
    stageId === 'INFANCIA'
      ? 0x854d0e
      : stageId === 'PRE_ADOLESCENCIA'
      ? 0x334155
      : stageId === 'JUVENTUDE'
      ? 0x1e3a8a
      : 0x1e293b;

  group.add(createContactShadow(0.45 * scale));

  const bodyPivot = new THREE.Group();
  bodyPivot.scale.setScalar(scale);
  group.add(bodyPivot);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd99b6c, roughness: 0.72 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.65 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.78 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.82 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1c1917 });

  // Articulated legs
  const makeLeg = (xOff: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOff, 0.56, 0);
    const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), pantsMat);
    legMesh.position.y = -0.25;
    legMesh.castShadow = enableShadows;
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.3), shoeMat);
    shoe.position.set(0, -0.5, 0.04);
    legPivot.add(legMesh, shoe);
    bodyPivot.add(legPivot);
    return legPivot;
  };
  const leftLeg = makeLeg(-0.15);
  const rightLeg = makeLeg(0.15);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.64, 0.34), shirtMat);
  torso.position.y = 0.9;
  torso.castShadow = enableShadows;
  torso.receiveShadow = enableShadows;
  bodyPivot.add(torso);

  // Backpack in pre-teen stage
  if (stageId === 'PRE_ADOLESCENCIA') {
    const packMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.75 });
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.2), packMat);
    pack.position.set(0, 0.9, -0.24);
    pack.castShadow = enableShadows;
    bodyPivot.add(pack);
  }

  // Arms
  const makeArm = (xOff: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOff, 1.15, 0);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.2), shirtMat);
    sleeve.position.y = -0.14;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), skinMat);
    hand.position.y = -0.34;
    armPivot.add(sleeve, hand);
    bodyPivot.add(armPivot);
    return armPivot;
  };
  const leftArm = makeArm(-0.39);
  const rightArm = makeArm(0.39);

  // Handheld lampião on right hand
  const lampGroup = new THREE.Group();
  lampGroup.position.set(0, -0.42, 0.14);
  const lampCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 })
  );
  lampCap.position.y = 0.1;
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.0,
    roughness: 0.3,
  });
  const lampBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 10), lampBulbMat);
  const lampLight = new THREE.PointLight(0xffb84d, 0, 10, 1.8);
  lampLight.position.set(0, 0.1, 0);
  lampGroup.add(lampCap, lampBulb, lampLight);
  rightArm.add(lampGroup);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 14, 12), skinMat);
  head.position.y = 1.54;
  head.castShadow = enableShadows;
  bodyPivot.add(head);

  // Eyes (+Z is forward face)
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), eyeMat);
  eyeL.position.set(-0.1, 1.54, 0.28);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  bodyPivot.add(eyeL, eyeR);

  // Age-specific hair / hat / beard
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x291c14, roughness: 0.85 });
  if (stageId === 'INFANCIA') {
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.82 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.06, 16), strawMat);
    brim.position.y = 1.76;
    brim.castShadow = enableShadows;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.31, 0.2, 14), strawMat);
    crown.position.y = 1.88;
    const ribbon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.305, 0.315, 0.05, 14),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 })
    );
    ribbon.position.y = 1.81;
    bodyPivot.add(brim, crown, ribbon);
  } else if (stageId === 'PRE_ADOLESCENCIA') {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.325, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hair.position.y = 1.58;
    bodyPivot.add(hair);
  } else if (stageId === 'JUVENTUDE') {
    const capMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 });
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      capMat
    );
    dome.position.y = 1.59;
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.05, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 })
    );
    visor.position.set(0, 1.66, 0.26);
    bodyPivot.add(dome, visor);
  } else {
    // Adulto: full hair + neat beard
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.325, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hair.position.y = 1.58;
    const beard = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x3b2f2f, roughness: 0.9 })
    );
    beard.position.set(0, 1.46, 0.11);
    bodyPivot.add(hair, beard);
  }

  return {
    group,
    bodyPivot,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    lampBulb,
    lampLight,
    stageId,
  };
}

export function createNPCRig(npc: InteractiveNPC, enableShadows: boolean): CharacterRig {
  const group = new THREE.Group();
  group.add(createContactShadow(0.42));

  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const skinMat = new THREE.MeshStandardMaterial({ color: npc.skinTone, roughness: 0.75 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: npc.shirtColor, roughness: 0.68 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: npc.pantsColor, roughness: 0.78 });
  const hairMat = new THREE.MeshStandardMaterial({ color: npc.hairColor, roughness: 0.85 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1c1917 });

  const makeLeg = (xOff: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOff, 0.52, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.48, 0.2), pantsMat);
    leg.position.y = -0.24;
    leg.castShadow = enableShadows;
    legPivot.add(leg);
    bodyPivot.add(legPivot);
    return legPivot;
  };
  const leftLeg = makeLeg(-0.14);
  const rightLeg = makeLeg(0.14);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.6, 0.32), shirtMat);
  torso.position.y = 0.86;
  torso.castShadow = enableShadows;
  torso.receiveShadow = enableShadows;
  bodyPivot.add(torso);

  const makeArm = (xOff: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOff, 1.1, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.18), shirtMat);
    arm.position.y = -0.21;
    armPivot.add(arm);
    bodyPivot.add(armPivot);
    return armPivot;
  };
  const leftArm = makeArm(-0.36);
  const rightArm = makeArm(0.36);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 12), skinMat);
  head.position.y = 1.48;
  head.castShadow = enableShadows;
  bodyPivot.add(head);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), eyeMat);
  eyeL.position.set(-0.09, 1.49, 0.26);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.09;
  bodyPivot.add(eyeL, eyeR);

  if (npc.hatColor) {
    const hatMat = new THREE.MeshStandardMaterial({ color: npc.hatColor, roughness: 0.78 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.47, 0.05, 16), hatMat);
    brim.position.y = 1.69;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.19, 14), hatMat);
    crown.position.y = 1.8;
    bodyPivot.add(brim, crown);
  } else {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.305, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hair.position.y = 1.52;
    bodyPivot.add(hair);
  }

  // Nameplate sprite floating neatly above NPC
  const nameplate = createNameplateSprite(npc.name, undefined, '#fff5e1', 'rgba(20, 15, 10, 0.76)', 2.8);
  nameplate.position.set(0, 2.25, 0);
  group.add(nameplate);

  // Floating golden quest badge (!)
  const questBadge = new THREE.Group();
  questBadge.position.set(0, 2.8, 0);
  const badgeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  const exclStem = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 8), badgeMat);
  exclStem.rotation.x = Math.PI;
  exclStem.position.y = 0.18;
  const exclDot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), badgeMat);
  exclDot.position.y = -0.08;
  questBadge.add(exclStem, exclDot);
  questBadge.visible = false;
  group.add(questBadge);

  return {
    group,
    bodyPivot,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    questBadge,
  };
}

// ---------- Buildings & Radio Tower ----------

export interface BuildingAssets {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
  beaconMat?: THREE.MeshStandardMaterial;
  beaconLight?: THREE.PointLight;
  waveRings?: THREE.Mesh[];
}

export function createBuildingMesh(
  b: WorldBuilding,
  enableShadows: boolean
): BuildingAssets {
  const group = new THREE.Group();
  const w = b.width * WORLD_TO_3D;
  const d = b.height * WORLD_TO_3D;
  const cx = (b.x + b.width / 2) * WORLD_TO_3D;
  const cz = (b.y + b.height / 2) * WORLD_TO_3D;
  group.position.set(cx, 0, cz);

  if (b.kind === 'radio_tower') {
    // Concrete pad
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.9, 0.25, d * 0.75),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 })
    );
    pad.position.y = 0.125;
    pad.receiveShadow = enableShadows;
    group.add(pad);

    // 4-leg multi-tier red/white lattice tower
    const towerH = 11.5;
    const segments = 6;
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5, metalness: 0.3 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.25 });

    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const y0 = 0.25 + t0 * towerH;
      const y1 = 0.25 + t1 * towerH;
      const r0 = 1.25 * (1 - t0 * 0.82);
      const r1 = 1.25 * (1 - t1 * 0.82);
      const segMat = i % 2 === 0 ? redMat : whiteMat;
      const segH = y1 - y0;
      const midY = (y0 + y1) / 2;

      // 4 slanted corner legs
      const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ];
      for (const [sx, sz] of corners) {
        const p0 = new THREE.Vector3(sx * r0, y0, sz * r0);
        const p1 = new THREE.Vector3(sx * r1, y1, sz * r1);
        const legVec = p1.clone().sub(p0);
        const legLen = legVec.length();
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, legLen, 6), segMat);
        leg.position.copy(p0).addScaledVector(legVec, 0.5);
        leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), legVec.normalize());
        leg.castShadow = enableShadows;
        group.add(leg);
      }

      // Horizontal collar frame
      const collar = new THREE.Mesh(new THREE.BoxGeometry(r1 * 2.05, 0.08, r1 * 2.05), segMat);
      collar.position.y = y1;
      group.add(collar);

      // Subtle central core brace
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, segH, 6), segMat);
      brace.position.y = midY;
      group.add(brace);
    }

    // Mast spire
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.06, 2.1, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.3 })
    );
    spire.position.y = 0.25 + towerH + 1.05;
    group.add(spire);

    // Blinking beacon
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), beaconMat);
    beacon.position.y = 0.25 + towerH + 2.15;
    const beaconLight = new THREE.PointLight(0xef4444, 1.5, 14, 2);
    beaconLight.position.copy(beacon.position);
    group.add(beacon, beaconLight);

    // Expanding radio wave torus rings
    const waveRings: THREE.Mesh[] = [];
    for (let r = 0; r < 3; r++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.55,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.045, 8, 28), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = beacon.position.y - 0.1;
      group.add(ring);
      waveRings.push(ring);
    }

    const plate = createNameplateSprite(b.name, undefined, '#fde68a', 'rgba(22, 16, 11, 0.85)', 4.8);
    plate.position.set(0, 5.8, d * 0.55);
    group.add(plate);

    return {
      group,
      windowMaterials: [],
      beaconMat,
      beaconLight,
      waveRings,
    };
  }

  // Standard composite building (plinth + walls + gable roof + door + windows + accents)
  const wallH = b.kind === 'school' ? 2.8 : 2.35;
  const plinthH = 0.24;
  const plinthMat = new THREE.MeshStandardMaterial({ color: b.trimColor, roughness: 0.85 });
  const wallMat = new THREE.MeshStandardMaterial({ color: b.wallColor, roughness: 0.78 });
  const roofMat = new THREE.MeshStandardMaterial({ color: b.roofColor, roughness: 0.68 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c331c, roughness: 0.75 });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.0,
    roughness: 0.25,
    metalness: 0.1,
  });

  // Stone plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, plinthH, d + 0.18), plinthMat);
  plinth.position.y = plinthH / 2;
  plinth.receiveShadow = enableShadows;
  plinth.castShadow = enableShadows;
  group.add(plinth);

  // Main walls
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
  walls.position.y = plinthH + wallH / 2;
  walls.castShadow = enableShadows;
  walls.receiveShadow = enableShadows;
  group.add(walls);

  // Corner timber pilasters
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, wallH, 0.18), plinthMat);
      post.position.set(sx * (w / 2 - 0.06), plinthH + wallH / 2, sz * (d / 2 - 0.06));
      group.add(post);
    }
  }

  // Pitched Gable Roof (two angled slopes + triangular gable end caps + ridge beam)
  const roofOverhang = 0.42;
  const roofRise = b.kind === 'school' ? 1.55 : 1.25;
  const halfDepth = d / 2 + roofOverhang;
  const slopeLen = Math.hypot(halfDepth, roofRise);
  const slopeAngle = Math.atan2(roofRise, halfDepth);
  const roofBaseY = plinthH + wallH;

  const slopeGeo = new THREE.BoxGeometry(w + roofOverhang * 2, 0.18, slopeLen + 0.1);
  const frontSlope = new THREE.Mesh(slopeGeo, roofMat);
  frontSlope.position.set(0, roofBaseY + roofRise / 2, halfDepth / 2);
  frontSlope.rotation.x = slopeAngle;
  frontSlope.castShadow = enableShadows;
  frontSlope.receiveShadow = enableShadows;

  const backSlope = new THREE.Mesh(slopeGeo, roofMat);
  backSlope.position.set(0, roofBaseY + roofRise / 2, -halfDepth / 2);
  backSlope.rotation.x = -slopeAngle;
  backSlope.castShadow = enableShadows;
  backSlope.receiveShadow = enableShadows;

  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(w + roofOverhang * 2 + 0.06, 0.2, 0.24),
    plinthMat
  );
  ridge.position.set(0, roofBaseY + roofRise, 0);
  ridge.castShadow = enableShadows;
  group.add(frontSlope, backSlope, ridge);

  // Triangular gable side walls filling the roof peaks
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-d / 2, 0);
  gableShape.lineTo(d / 2, 0);
  gableShape.lineTo(0, roofRise);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: w - 0.04, bevelEnabled: false });
  gableGeo.rotateY(Math.PI / 2);
  const gableMesh = new THREE.Mesh(gableGeo, wallMat);
  gableMesh.position.set(-(w - 0.04) / 2, roofBaseY - 0.02, 0);
  group.add(gableMesh);

  // Front Door (+Z face)
  const doorOffsetX = b.doorX * WORLD_TO_3D - cx;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.55, 0.14), woodMat);
  door.position.set(doorOffsetX, plinthH + 0.78, d / 2 + 0.03);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.7, roughness: 0.25 })
  );
  knob.position.set(doorOffsetX + 0.34, plinthH + 0.78, d / 2 + 0.12);
  group.add(door, knob);

  // Windows on front face
  for (const wx of [-w * 0.3, w * 0.3]) {
    if (Math.abs(wx - doorOffsetX) < 0.9) continue;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.8, 0.1), plinthMat);
    frame.position.set(wx, plinthH + 1.25, d / 2 + 0.02);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.62, 0.12), winMat);
    pane.position.set(wx, plinthH + 1.25, d / 2 + 0.03);
    group.add(frame, pane);
  }

  // Building-specific details
  if (b.kind === 'school') {
    // Bell belfry & golden bell
    const belfry = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), wallMat);
    belfry.position.set(0, roofBaseY + roofRise + 0.3, 0);
    const belfryRoof = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.5, 4), roofMat);
    belfryRoof.rotation.y = Math.PI / 4;
    belfryRoof.position.set(0, roofBaseY + roofRise + 0.88, 0);
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.2, 0.25, 10),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.75, roughness: 0.25 })
    );
    bell.position.set(0, roofBaseY + roofRise + 0.25, 0);
    group.add(belfry, belfryRoof, bell);
  } else if (b.kind === 'shop') {
    // Striped front awning
    for (let i = 0; i < 6; i++) {
      const stripW = (w - 0.6) / 6;
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(stripW, 0.1, 0.85),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0xdc2626 : 0xfef3c7,
          roughness: 0.7,
        })
      );
      strip.position.set(-(w - 0.6) / 2 + stripW * (i + 0.5), plinthH + 1.65, d / 2 + 0.4);
      strip.rotation.x = 0.28;
      group.add(strip);
    }
  } else if (b.kind === 'radio_shack') {
    // Roof antenna + dish
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.4 })
    );
    mast.position.set(-w * 0.25, roofBaseY + roofRise + 0.4, 0);
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, side: THREE.DoubleSide })
    );
    dish.position.set(-w * 0.25, roofBaseY + roofRise + 1.05, 0.1);
    dish.rotation.x = Math.PI * 0.65;
    group.add(mast, dish);
  } else if (b.kind === 'church') {
    // Church bell tower, golden cross, and front stained-glass rose window
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 1.4), wallMat);
    tower.position.set(0, roofBaseY + 1.0, d * 0.22);
    tower.castShadow = enableShadows;
    const spireRoof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.45, 4), roofMat);
    spireRoof.rotation.y = Math.PI / 4;
    spireRoof.position.set(0, roofBaseY + 2.8, d * 0.22);
    spireRoof.castShadow = enableShadows;

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.75,
      roughness: 0.25,
    });
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.12), goldMat);
    crossV.position.set(0, roofBaseY + 3.85, d * 0.22);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.12), goldMat);
    crossH.position.set(0, roofBaseY + 3.98, d * 0.22);

    const roseFrame = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.14, 16),
      plinthMat
    );
    roseFrame.rotation.x = Math.PI / 2;
    roseFrame.position.set(0, roofBaseY + 0.35, d / 2 + 0.04);
    const roseGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.16, 16),
      winMat
    );
    roseGlass.rotation.x = Math.PI / 2;
    roseGlass.position.set(0, roofBaseY + 0.35, d / 2 + 0.05);

    group.add(tower, spireRoof, crossV, crossH, roseFrame, roseGlass);
  }

  // Name banner sprite cleanly perched above roof
  const plate = createNameplateSprite(b.name, undefined, '#fef3c7', 'rgba(22, 16, 11, 0.84)', 4.6);
  plate.position.set(0, roofBaseY + roofRise + 1.35, 0);
  group.add(plate);

  return { group, windowMaterials: [winMat] };
}

// ---------- Trees, Carroça, Well, Fountain, Animals, Relics ----------

export function createTreeMesh(t: WorldTree, enableShadows: boolean): THREE.Group {
  const group = new THREE.Group();
  const r = t.radius * WORLD_TO_3D;
  group.position.set(to3DX(t.x), 0, to3DZ(t.y));

  group.add(createContactShadow(r * 1.1));

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 1.55, 8), trunkMat);
  trunk.position.y = 0.775;
  trunk.castShadow = enableShadows;
  trunk.receiveShadow = enableShadows;
  group.add(trunk);

  const canopyPivot = new THREE.Group();
  canopyPivot.position.y = 1.45;
  group.add(canopyPivot);

  if (t.variant === 'ipe') {
    const m1 = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.8 });
    const m2 = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.75 });
    const mainBall = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 1.05, 1), m1);
    mainBall.position.y = 0.65;
    mainBall.castShadow = enableShadows;
    const subA = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.7, 1), m2);
    subA.position.set(-r * 0.45, 0.95, r * 0.25);
    const subB = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.65, 1), m2);
    subB.position.set(r * 0.48, 0.78, -r * 0.22);
    canopyPivot.add(mainBall, subA, subB);
  } else if (t.variant === 'palm') {
    trunk.scale.y = 1.45;
    trunk.position.y = 1.12;
    canopyPivot.position.y = 2.15;
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.78 });
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI * 2) / 6;
      const frondGroup = new THREE.Group();
      frondGroup.rotation.y = ang;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, r * 1.45), frondMat);
      frond.position.set(0, 0.05, r * 0.7);
      frond.rotation.x = 0.35;
      frond.castShadow = enableShadows;
      frondGroup.add(frond);
      canopyPivot.add(frondGroup);
    }
    const cocoMat = new THREE.MeshStandardMaterial({ color: 0x5c331c, roughness: 0.8 });
    for (let c = 0; c < 3; c++) {
      const coco = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), cocoMat);
      coco.position.set(Math.cos(c * 2.1) * 0.16, -0.06, Math.sin(c * 2.1) * 0.16);
      canopyPivot.add(coco);
    }
  } else {
    const m1 = new THREE.MeshStandardMaterial({ color: 0x2d6a3e, roughness: 0.82 });
    const m2 = new THREE.MeshStandardMaterial({ color: 0x3f8a4e, roughness: 0.78 });
    const mainBall = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 1.1, 1), m1);
    mainBall.position.y = 0.62;
    mainBall.castShadow = enableShadows;
    const subA = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.72, 1), m2);
    subA.position.set(-r * 0.42, 0.92, 0.18);
    const subB = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.64, 1), m2);
    subB.position.set(r * 0.45, 0.72, -0.2);
    canopyPivot.add(mainBall, subA, subB);
  }

  group.userData.canopyPivot = canopyPivot;
  group.userData.phase = t.x * 0.015;
  return group;
}

export function createCarrocaMesh(
  x: number,
  y: number,
  enableShadows: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(to3DX(x), 0, to3DZ(y));
  group.add(createContactShadow(1.65));

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a6338, roughness: 0.82 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c331c, roughness: 0.85 });
  const horseMat = new THREE.MeshStandardMaterial({ color: 0x7c4a2d, roughness: 0.78 });

  // Wagon bed & side rails
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.25, 1.15), woodMat);
  bed.position.set(-0.4, 0.62, 0);
  bed.castShadow = enableShadows;
  group.add(bed);

  for (const sz of [-0.52, 0.52]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 0.08), darkWoodMat);
    rail.position.set(-0.4, 0.95, sz);
    rail.castShadow = enableShadows;
    group.add(rail);
  }
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 1.12), darkWoodMat);
  backRail.position.set(-1.42, 0.95, 0);
  group.add(backRail);

  // Luggage sacks
  const sackA = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.42, 0.55),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 })
  );
  sackA.position.set(-0.85, 0.96, -0.15);
  sackA.castShadow = enableShadows;
  const sackB = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.36, 0.48),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.8 })
  );
  sackB.position.set(-0.15, 0.92, 0.16);
  sackB.castShadow = enableShadows;
  group.add(sackA, sackB);

  // 4 Spoked Wheels
  for (const wx of [-1.0, 0.2]) {
    for (const wz of [-0.66, 0.66]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 16), darkWoodMat);
      wheel.position.set(wx, 0.44, wz);
      wheel.castShadow = enableShadows;
      const spokeA = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.05), woodMat);
      spokeA.position.copy(wheel.position);
      const spokeB = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.05), woodMat);
      spokeB.position.copy(wheel.position);
      group.add(wheel, spokeA, spokeB);
    }
  }

  // Harness poles
  for (const pz of [-0.32, 0.32]) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.07, 0.07), darkWoodMat);
    pole.position.set(1.25, 0.68, pz);
    group.add(pole);
  }

  // Horse composite
  const horseBody = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.62, 0.55), horseMat);
  horseBody.position.set(2.05, 0.95, 0);
  horseBody.castShadow = enableShadows;
  const horseNeck = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.56, 0.32), horseMat);
  horseNeck.position.set(2.58, 1.32, 0);
  horseNeck.rotation.z = -0.35;
  const horseHead = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.28), horseMat);
  horseHead.position.set(2.8, 1.54, 0);
  group.add(horseBody, horseNeck, horseHead);

  for (const lx of [1.62, 2.42]) {
    for (const lz of [-0.18, 0.18]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.66, 0.14), horseMat);
      leg.position.set(lx, 0.33, lz);
      group.add(leg);
    }
  }

  return group;
}

export function createVillageWellMesh(
  x: number,
  y: number,
  enableShadows: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(to3DX(x), 0, to3DZ(y));
  group.add(createContactShadow(0.9));

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.82, 0.65, 16), stoneMat);
  rim.position.y = 0.325;
  rim.castShadow = enableShadows;
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 16),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.55;

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c331c, roughness: 0.8 });
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.35, 0.12), woodMat);
  postL.position.set(-0.66, 0.95, 0);
  const postR = postL.clone();
  postR.position.x = 0.66;

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.05, 0.65, 4),
    new THREE.MeshStandardMaterial({ color: 0xb4532a, roughness: 0.75 })
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 1.85;
  roof.castShadow = enableShadows;

  group.add(rim, water, postL, postR, roof);
  return group;
}

export function createFountainGroup(
  x: number,
  y: number,
  enableShadows: boolean
): { group: THREE.Group; rippleRing: THREE.Mesh } {
  const group = new THREE.Group();
  group.position.set(to3DX(x), 0, to3DZ(y));

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.8 });
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.55, 24), stoneMat);
  basin.position.y = 0.275;
  basin.castShadow = enableShadows;
  basin.receiveShadow = enableShadows;

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(1.52, 24),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.1 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.56;

  const rippleRing = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.54, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
  );
  rippleRing.rotation.x = -Math.PI / 2;
  rippleRing.position.y = 0.58;

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 1.1, 14), stoneMat);
  pedestal.position.y = 0.78;
  pedestal.castShadow = enableShadows;
  const topBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.28, 0.28, 16), stoneMat);
  topBowl.position.y = 1.32;
  const spout = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.8 })
  );
  spout.position.y = 1.54;

  group.add(basin, water, rippleRing, pedestal, topBowl, spout);
  return { group, rippleRing };
}

export function createAnimalMesh(
  a: RoamingAnimal,
  enableShadows: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(to3DX(a.x), 0, to3DZ(a.y));
  group.add(
    createContactShadow(a.kind === 'cow' ? 0.68 : a.kind === 'dog' ? 0.34 : 0.22)
  );

  if (a.kind === 'cow') {
    const whiteMat = new THREE.MeshStandardMaterial({ color: a.color, roughness: 0.8 });
    const spotMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xf4a4a4, roughness: 0.72 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.55 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.54, 1.08), whiteMat);
    body.position.set(0, 0.62, 0);
    body.castShadow = enableShadows;
    body.receiveShadow = enableShadows;

    const spotA = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 0.38), spotMat);
    spotA.position.set(0, 0.68, -0.14);
    const spotB = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.28), spotMat);
    spotB.position.set(0.14, 0.56, 0.3);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.44), whiteMat);
    head.position.set(0, 0.84, 0.66);
    head.castShadow = enableShadows;

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.16), snoutMat);
    snout.position.set(0, 0.75, 0.92);

    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 6), hornMat);
    hornL.position.set(-0.18, 1.08, 0.62);
    hornL.rotation.z = 0.35;
    const hornR = hornL.clone();
    hornR.position.x = 0.18;
    hornR.rotation.z = -0.35;

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), spotMat);
    tail.position.set(0, 0.56, -0.58);
    tail.rotation.x = 0.22;
    group.userData.tail = tail;

    for (const lx of [-0.22, 0.22]) {
      for (const lz of [-0.38, 0.38]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.14), whiteMat);
        leg.position.set(lx, 0.19, lz);
        group.add(leg);
      }
    }

    group.add(body, spotA, spotB, head, snout, hornL, hornR, tail);
  } else if (a.kind === 'dog') {
    const coatMat = new THREE.MeshStandardMaterial({ color: a.color, roughness: 0.78 });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.56), coatMat);
    body.position.set(0, 0.32, 0);
    body.castShadow = enableShadows;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.28), coatMat);
    head.position.set(0, 0.48, 0.3);
    const snout = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.12, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x5c331c, roughness: 0.8 })
    );
    snout.position.set(0, 0.44, 0.46);
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.08), coatMat);
    earL.position.set(-0.14, 0.54, 0.28);
    const earR = earL.clone();
    earR.position.x = 0.14;
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.1), collarMat);
    collar.position.set(0, 0.42, 0.22);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.24), coatMat);
    tail.position.set(0, 0.42, -0.34);
    tail.rotation.x = 0.6;
    group.userData.tail = tail;

    for (const lx of [-0.12, 0.12]) {
      for (const lz of [-0.18, 0.18]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), coatMat);
        leg.position.set(lx, 0.1, lz);
        group.add(leg);
      }
    }
    group.add(body, head, snout, earL, earR, collar, tail);
  } else {
    const featherMat = new THREE.MeshStandardMaterial({ color: a.color, roughness: 0.78 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), featherMat);
    body.scale.set(0.95, 0.85, 1.2);
    body.position.set(0, 0.22, 0);
    body.castShadow = enableShadows;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), featherMat);
    head.position.set(0, 0.36, 0.16);
    const comb = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.08, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 })
    );
    comb.position.set(0, 0.46, 0.16);
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.1, 6),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 })
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.35, 0.28);
    group.add(body, head, comb, beak);
  }

  return group;
}

export function createRelicMesh(): THREE.Group {
  const group = new THREE.Group();
  const gemMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    metalness: 0.4,
    roughness: 0.2,
  });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), gemMat);
  gem.position.y = 0.62;
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.48, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.05;
  group.add(gem, halo);
  group.userData.gem = gem;
  return group;
}

export function createPortalMarkerMesh(portal: ScenePortal): THREE.Group {
  const group = new THREE.Group();
  group.position.set(to3DX(portal.x), 0.03, to3DZ(portal.y));

  if (portal.kind === 'exit') {
    const mat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const rug = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.9), mat);
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(2.34, 0.04, 1.04),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xf59e0b, emissiveIntensity: 0.4 })
    );
    border.position.y = -0.01;
    const plate = createNameplateSprite('SAÍDA', undefined, '#fef3c7', 'rgba(120, 53, 15, 0.9)', 2.1);
    plate.position.set(0, 0.65, 0);
    group.add(border, rug, plate);
  } else if (portal.kind === 'road') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.05, 28),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 24),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      })
    );
    disc.rotation.x = -Math.PI / 2;
    const plate = createNameplateSprite(portal.label, undefined, '#fffbeb', 'rgba(22, 16, 11, 0.85)', 4.2);
    plate.position.set(0, 1.15, 0);
    group.add(disc, ring, plate);
    group.userData.ring = ring;
  } else {
    // Door mat indicator
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.65, 22),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.z = 0.2;
    group.add(ring);
    group.userData.ring = ring;
  }
  return group;
}

// ---------- Scene Furniture & Roça Expansion Props ----------

export function createFurnitureMesh(
  item: SceneFurniture,
  enableShadows: boolean
): THREE.Group {
  const group = new THREE.Group();
  const w = item.width * WORLD_TO_3D;
  const d = item.height * WORLD_TO_3D;
  const cx = (item.x + item.width / 2) * WORLD_TO_3D;
  const cz = (item.y + item.height / 2) * WORLD_TO_3D;
  group.position.set(cx, 0, cz);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x85522c, roughness: 0.78 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x4b2a14, roughness: 0.82 });

  if (item.kind === 'rug') {
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.04, d),
      new THREE.MeshStandardMaterial({ color: item.color ?? '#b4532a', roughness: 0.92 })
    );
    rug.position.y = 0.02;
    rug.receiveShadow = enableShadows;
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.35, 0.045, d - 0.35),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.85 })
    );
    trim.position.y = 0.022;
    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.5, 0.05, d - 0.5),
      new THREE.MeshStandardMaterial({ color: item.color ?? '#b4532a', roughness: 0.92 })
    );
    inner.position.y = 0.024;
    group.add(rug, trim, inner);
    return group;
  }

  if (item.kind === 'creek_bridge') {
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.05, d),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.1 })
    );
    water.position.y = 0.015;
    group.add(water);

    // Bridge spans over the road around y = 500 -> z offset relative to center
    const bridgeZ = 500 * WORLD_TO_3D - cz;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.22, 3.3), woodMat);
    deck.position.set(0, 0.16, bridgeZ);
    deck.castShadow = enableShadows;
    deck.receiveShadow = enableShadows;
    const railN = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.35, 0.14), darkWood);
    railN.position.set(0, 0.45, bridgeZ - 1.55);
    const railS = railN.clone();
    railS.position.z = bridgeZ + 1.55;
    group.add(deck, railN, railS);
    return group;
  }

  if (item.kind === 'corn_patch') {
    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.08, d),
      new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.95 })
    );
    soil.position.y = 0.04;
    soil.receiveShadow = enableShadows;
    group.add(soil);

    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x3f7d31, roughness: 0.8 });
    const cobMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.65 });
    const cols = Math.max(3, Math.floor(w / 1.1));
    const rows = Math.max(2, Math.floor(d / 1.0));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const sx = -w / 2 + 0.55 + (c / Math.max(1, cols - 1)) * (w - 1.1);
        const sz = -d / 2 + 0.55 + (r / Math.max(1, rows - 1)) * (d - 1.1);
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.3, 6), stalkMat);
        stalk.position.set(sx, 0.68, sz);
        stalk.castShadow = enableShadows;
        const cob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), cobMat);
        cob.position.set(sx + 0.1, 0.95, sz + 0.06);
        group.add(stalk, cob);
      }
    }
    return group;
  }

  if (item.kind === 'farmhouse') {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe7d2b5, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.72 });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d), wallMat);
    walls.position.y = 1.1;
    walls.castShadow = enableShadows;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.4, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.9;
    roof.castShadow = enableShadows;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.45, 0.12), darkWood);
    door.position.set(0, 0.725, d / 2 + 0.02);
    const winMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.3 });
    const winL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 0.12), winMat);
    winL.position.set(-w * 0.28, 1.25, d / 2 + 0.02);
    const winR = winL.clone();
    winR.position.x = w * 0.28;
    group.add(walls, roof, door, winL, winR);
    return group;
  }

  if (item.kind === 'well') {
    const well = createVillageWellMesh(item.x + item.width / 2, item.y + item.height / 2, enableShadows);
    well.position.set(0, 0, 0);
    return well;
  }

  if (item.kind === 'fence') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.1), woodMat);
    bar.position.y = 0.58;
    const barLow = bar.clone();
    barLow.position.y = 0.3;
    group.add(bar, barLow);
    const count = Math.max(3, Math.floor(w / 0.8));
    for (let i = 0; i < count; i++) {
      const px = -w / 2 + (i / (count - 1)) * w;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.14), darkWood);
      post.position.set(px, 0.4, 0);
      post.castShadow = enableShadows;
      group.add(post);
    }
    return group;
  }

  if (item.kind === 'bed') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, d), darkWood);
    frame.position.y = 0.21;
    frame.castShadow = enableShadows;
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.16, 0.22, d - 0.16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 })
    );
    mattress.position.y = 0.48;
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.64, 0.25, d - 0.14),
      new THREE.MeshStandardMaterial({ color: item.color ?? '#2563eb', roughness: 0.8 })
    );
    blanket.position.set(w * 0.16, 0.5, 0);
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.22, 0.14, d * 0.55),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
    );
    pillow.position.set(-w * 0.32, 0.64, 0);
    group.add(frame, mattress, blanket, pillow);
    return group;
  }

  if (item.kind === 'table' || item.kind === 'desk' || item.kind === 'counter' || item.kind === 'workbench') {
    const h = item.kind === 'counter' ? 1.05 : 0.82;
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.14, d),
      item.kind === 'counter' ? darkWood : woodMat
    );
    top.position.y = h;
    top.castShadow = enableShadows;
    top.receiveShadow = enableShadows;
    group.add(top);
    for (const lx of [-w / 2 + 0.16, w / 2 - 0.16]) {
      for (const lz of [-d / 2 + 0.16, d / 2 - 0.16]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, 0.14), darkWood);
        leg.position.set(lx, h / 2, lz);
        group.add(leg);
      }
    }
    if (item.kind === 'table') {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.2, 0.26, 10),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 })
      );
      pot.position.set(-0.3, h + 0.2, 0);
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.08, 0.14, 10),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 })
      );
      cup.position.set(0.45, h + 0.14, -0.1);
      group.add(pot, cup);
    }
    return group;
  }

  if (item.kind === 'chalkboard') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, 1.45, 0.2), darkWood);
    frame.position.y = 1.45;
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(w, 1.22, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 })
    );
    board.position.y = 1.45;
    const plate = createNameplateSprite('Gincana do Saber', undefined, '#dcfce7', 'rgba(20, 83, 45, 0.92)', 3.6);
    plate.position.set(0, 1.5, 0.25);
    group.add(frame, board, plate);
    return group;
  }

  if (item.kind === 'radio_console') {
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.92, d),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.2 })
    );
    desk.position.y = 0.46;
    desk.castShadow = enableShadows;
    const vu = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.26, 0.22, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.8 })
    );
    vu.position.set(-w * 0.25, 1.0, 0);
    const dial = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.34, 0.18, 0.36),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.7 })
    );
    dial.position.set(w * 0.1, 1.0, 0);
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.2 })
    );
    led.position.set(w * 0.38, 1.05, 0);
    group.add(desk, vu, dial, led);
    return group;
  }

  if (item.kind === 'stove') {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.96, d),
      new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.55, metalness: 0.3 })
    );
    body.position.y = 0.48;
    body.castShadow = enableShadows;
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 1.8, 10),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.4 })
    );
    pipe.position.set(w * 0.3, 1.7, -d * 0.2);
    const embers = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.2, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 1.2 })
    );
    embers.position.set(-w * 0.15, 0.35, d / 2 + 0.02);
    group.add(body, pipe, embers);
    return group;
  }

  if (item.kind === 'sofa') {
    const mat = new THREE.MeshStandardMaterial({ color: item.color ?? '#9a3412', roughness: 0.85 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, d), mat);
    seat.position.y = 0.24;
    seat.castShadow = enableShadows;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.55, 0.28), mat);
    back.position.set(0, 0.65, -d / 2 + 0.14);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, d), mat);
    armL.position.set(-w / 2 + 0.12, 0.42, 0);
    const armR = armL.clone();
    armR.position.x = w / 2 - 0.12;
    group.add(seat, back, armL, armR);
    return group;
  }

  if (item.kind === 'shelf') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 1.85, d), darkWood);
    frame.position.y = 0.925;
    frame.castShadow = enableShadows;
    group.add(frame);
    const bookColors = [0xf59e0b, 0xef4444, 0x38bdf8, 0x22c55e];
    const count = Math.max(3, Math.floor(w / 0.55));
    for (let i = 0; i < count; i++) {
      const bx = -w / 2 + 0.35 + (i / Math.max(1, count - 1)) * (w - 0.7);
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.45, d + 0.06),
        new THREE.MeshStandardMaterial({ color: bookColors[i % bookColors.length], roughness: 0.7 })
      );
      book.position.set(bx, 1.35, 0.03);
      group.add(book);
    }
    return group;
  }

  if (item.kind === 'pew') {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d * 0.72), woodMat);
    seat.position.set(0, 0.42, 0.08);
    seat.castShadow = enableShadows;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.56, 0.14), darkWood);
    back.position.set(0, 0.68, d * 0.32);
    back.castShadow = enableShadows;
    for (const lx of [-w / 2 + 0.2, w / 2 - 0.2]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, d * 0.82), darkWood);
      side.position.set(lx, 0.325, 0.06);
      group.add(side);
    }
    group.add(seat, back);
    return group;
  }

  if (item.kind === 'altar') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, d), darkWood);
    base.position.y = 0.5;
    base.castShadow = enableShadows;
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.08, 0.16, d + 0.08),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 })
    );
    cloth.position.y = 1.02;
    const runner = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.28, 0.18, d + 0.12),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 })
    );
    runner.position.y = 1.02;
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      metalness: 0.7,
      roughness: 0.25,
    });
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.08), goldMat);
    crossV.position.set(0, 1.38, -0.1);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.08), goldMat);
    crossH.position.set(0, 1.48, -0.1);
    for (const cxOff of [-w * 0.32, w * 0.32]) {
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 0.32, 8),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 })
      );
      candle.position.set(cxOff, 1.24, 0.12);
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      flame.position.set(cxOff, 1.44, 0.12);
      group.add(candle, flame);
    }
    group.add(base, cloth, runner, crossV, crossH);
    return group;
  }

  // plant
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.25, 0.46, 12),
    new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 })
  );
  pot.position.y = 0.23;
  pot.castShadow = enableShadows;
  const leaves = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.45, 1),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 })
  );
  leaves.position.y = 0.72;
  leaves.castShadow = enableShadows;
  group.add(pot, leaves);
  return group;
}
