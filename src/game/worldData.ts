import {
  CollectibleRelic,
  CornerMarker,
  InteractiveNPC,
  NPCScheduleSlot,
  RoamingAnimal,
  SceneId,
  WorldBuilding,
} from './types';

export const WORLD_WIDTH = 3600;
export const WORLD_HEIGHT = 2150;

export const PLAZA_RECT = {
  x: 900,
  y: 780,
  width: 600,
  height: 540,
};

export const PLAZA_FOUNTAIN = {
  x: 1200,
  y: 1050,
  radius: 52,
};

export const SOCCER_FIELD_RECT = {
  x: 1740,
  y: 200,
  width: 520,
  height: 320,
};

export interface RoadSegment {
  id: string;
  label: string;
  points: { x: number; y: number }[];
  width: number;
  surface: 'stone' | 'dirt';
}

export const WORLD_ROADS: RoadSegment[] = [
  // Canto Noroeste -> Escola Municipal
  {
    id: 'road_nw',
    label: 'Rua da Escola',
    points: [
      { x: 925, y: 805 },
      { x: 760, y: 620 },
      { x: 520, y: 470 },
      { x: 480, y: 390 },
    ],
    width: 82,
    surface: 'dirt',
  },
  // Canto Nordeste -> Campo de Futebol
  {
    id: 'road_ne',
    label: 'Rua do Campo',
    points: [
      { x: 1475, y: 805 },
      { x: 1640, y: 630 },
      { x: 1840, y: 550 },
      { x: 1990, y: 550 },
    ],
    width: 82,
    surface: 'dirt',
  },
  // Canto Sudoeste -> Estrada da Roça Antiga
  {
    id: 'road_sw',
    label: 'Estrada da Roça Antiga',
    points: [
      { x: 925, y: 1295 },
      { x: 760, y: 1470 },
      { x: 540, y: 1650 },
      { x: 240, y: 1820 },
      { x: 40, y: 1910 },
    ],
    width: 88,
    surface: 'dirt',
  },
  // Canto Sudeste -> Rua da Vila Sul
  {
    id: 'road_se',
    label: 'Rua da Vila Sul',
    points: [
      { x: 1475, y: 1295 },
      { x: 1640, y: 1480 },
      { x: 1740, y: 1720 },
      { x: 1890, y: 1820 },
    ],
    width: 80,
    surface: 'dirt',
  },
  // Meio da Praça, Lateral Direita -> Avenida da Torre de Rádio (até o fim do povoado)
  {
    id: 'road_radio',
    label: 'Avenida da Torre',
    points: [
      { x: 1500, y: 1050 },
      { x: 2050, y: 1050 },
      { x: 2650, y: 1050 },
      { x: 3230, y: 1050 },
    ],
    width: 96,
    surface: 'dirt',
  },
  // Acesso Lateral Esquerda da Praça -> Igreja Matriz de Barriga
  {
    id: 'road_church',
    label: 'Adro da Igreja',
    points: [
      { x: 900, y: 1090 },
      { x: 768, y: 1095 },
    ],
    width: 72,
    surface: 'stone',
  },
];

export const CORNER_MARKERS: CornerMarker[] = [
  {
    id: 'corner_nw',
    cornerName: 'Canto Noroeste da Praça',
    streetName: 'Rua da Escola',
    x: 905,
    y: 785,
    radius: 75,
  },
  {
    id: 'corner_ne',
    cornerName: 'Canto Nordeste da Praça',
    streetName: 'Rua do Campo',
    x: 1495,
    y: 785,
    radius: 75,
  },
  {
    id: 'corner_sw',
    cornerName: 'Canto Sudoeste da Praça',
    streetName: 'Estrada da Roça Antiga',
    x: 905,
    y: 1315,
    radius: 75,
  },
  {
    id: 'corner_se',
    cornerName: 'Canto Sudeste da Praça',
    streetName: 'Rua da Vila Sul',
    x: 1495,
    y: 1315,
    radius: 75,
  },
];

export const WORLD_BUILDINGS: WorldBuilding[] = [
  {
    id: 'casa_cleilson',
    name: 'Casa do Cleilson',
    subtitle: 'Novo lar na Praça Central',
    x: 1060,
    y: 635,
    width: 190,
    height: 130,
    roofColor: '#b4532a',
    wallColor: '#f7ebd2',
    trimColor: '#7c4a2d',
    doorX: 1155,
    doorY: 775,
    kind: 'house',
    interiorSceneId: 'interior_casa_cleilson',
  },
  {
    id: 'casa_vizinho',
    name: 'Coreto & Casa da Praça',
    subtitle: 'Morada tradicional',
    x: 1295,
    y: 650,
    width: 140,
    height: 115,
    roofColor: '#9c4221',
    wallColor: '#efe2c8',
    trimColor: '#6d4c3d',
    doorX: 1365,
    doorY: 775,
    kind: 'house',
  },
  {
    id: 'escola',
    name: 'Escola Municipal de Barriga',
    subtitle: 'Ensino & Gincanas do Prof. Edinário',
    x: 330,
    y: 190,
    width: 280,
    height: 170,
    roofColor: '#2c5e8a',
    wallColor: '#f6f2e9',
    trimColor: '#1e3a5f',
    doorX: 470,
    doorY: 375,
    kind: 'school',
    interiorSceneId: 'interior_escola',
  },
  {
    id: 'igreja',
    name: 'Igreja Matriz de Barriga',
    subtitle: 'Zelada por Nosmalda · Praça Oeste',
    x: 675,
    y: 940,
    width: 185,
    height: 140,
    roofColor: '#b91c1c',
    wallColor: '#f8fafc',
    trimColor: '#78350f',
    doorX: 768,
    doorY: 1090,
    kind: 'church',
    interiorSceneId: 'interior_igreja',
  },
  {
    id: 'mercearia',
    name: 'Mercadinho do Uel',
    subtitle: 'Pão doce, broa e discos',
    x: 560,
    y: 1340,
    width: 175,
    height: 125,
    roofColor: '#a8442a',
    wallColor: '#fae5c3',
    trimColor: '#78350f',
    doorX: 650,
    doorY: 1475,
    kind: 'shop',
    interiorSceneId: 'interior_mercearia',
  },
  {
    id: 'oficina_chico',
    name: 'Oficina & Galinheiro do Seu Chico',
    subtitle: 'Consertos da Vila Sul',
    x: 1680,
    y: 1580,
    width: 185,
    height: 130,
    roofColor: '#6b4423',
    wallColor: '#e9dcc5',
    trimColor: '#4b3621',
    doorX: 1770,
    doorY: 1720,
    kind: 'workshop',
    interiorSceneId: 'interior_oficina',
  },
  {
    id: 'radio_shack',
    name: 'Estação Rádio Barriga 98.5 FM',
    subtitle: 'Cabine de Transmissão',
    x: 3110,
    y: 880,
    width: 170,
    height: 125,
    roofColor: '#991b1b',
    wallColor: '#e5e7eb',
    trimColor: '#374151',
    doorX: 3195,
    doorY: 1015,
    kind: 'radio_shack',
    interiorSceneId: 'interior_estacao_radio',
  },
  {
    id: 'radio_tower',
    name: 'Torre de Transmissão de Rádio',
    subtitle: 'Fim do Povoado · Missões de Rádio',
    x: 3320,
    y: 830,
    width: 110,
    height: 155,
    roofColor: '#dc2626',
    wallColor: '#f8fafc',
    trimColor: '#991b1b',
    doorX: 3375,
    doorY: 1005,
    kind: 'radio_tower',
  },
];

export const INITIAL_NPCS: InteractiveNPC[] = [
  {
    id: 'dona_maria',
    name: 'Eleonora',
    role: 'Mãe do Cleilson',
    x: 1110,
    y: 810,
    radius: 22,
    shirtColor: '#e07a5f',
    pantsColor: '#5c4d7d',
    hairColor: '#3d2b1f',
    skinTone: '#d9a077',
    facing: 'down',
    area: 'Praça Central',
    sceneId: 'povoado_principal',
  },
  {
    id: 'seu_antonio',
    name: 'Meda',
    role: 'Pai do Cleilson',
    x: 1210,
    y: 825,
    radius: 22,
    shirtColor: '#4a7c59',
    pantsColor: '#4a5568',
    hairColor: '#4a3728',
    hatColor: '#d4a373',
    skinTone: '#c68b63',
    facing: 'down',
    area: 'Praça Central',
    sceneId: 'povoado_principal',
  },
  {
    id: 'dona_carmem',
    name: 'Uel',
    role: 'Dono do Mercadinho',
    x: 685,
    y: 1495,
    radius: 22,
    shirtColor: '#d97706',
    pantsColor: '#78350f',
    hairColor: '#292524',
    skinTone: '#d9a077',
    facing: 'down',
    area: 'Rua da Roça Antiga',
    sceneId: 'povoado_principal',
  },
  {
    id: 'professora_beatriz',
    name: 'Edinário',
    role: 'Professor da Escola Municipal',
    x: 470,
    y: 410,
    radius: 22,
    shirtColor: '#2563eb',
    pantsColor: '#1e293b',
    hairColor: '#1e293b',
    skinTone: '#d49a70',
    facing: 'down',
    area: 'Escola Municipal',
    sceneId: 'povoado_principal',
  },
  {
    id: 'pedrinho',
    name: 'Pedrinho',
    role: 'Colega de Escola',
    x: 560,
    y: 430,
    radius: 20,
    shirtColor: '#16a34a',
    pantsColor: '#334155',
    hairColor: '#5c3c24',
    skinTone: '#d49a70',
    facing: 'left',
    area: 'Escola Municipal',
    sceneId: 'povoado_principal',
  },
  {
    id: 'ze_bola',
    name: 'Vitor',
    role: 'Goleiro & Capitão do Campo',
    x: 1990,
    y: 555,
    radius: 22,
    shirtColor: '#eab308',
    pantsColor: '#15803d',
    hairColor: '#1f2937',
    skinTone: '#b97b52',
    facing: 'down',
    area: 'Campo de Futebol',
    sceneId: 'povoado_principal',
  },
  {
    id: 'seu_chico',
    name: 'Seu Chico',
    role: 'Artesão da Vila Sul',
    x: 1790,
    y: 1750,
    radius: 22,
    shirtColor: '#92400e',
    pantsColor: '#3f3f46',
    hairColor: '#d1d5db',
    hatColor: '#a16207',
    skinTone: '#c68b63',
    facing: 'down',
    area: 'Vila Sul',
    sceneId: 'povoado_principal',
  },
  {
    id: 'seu_geraldo',
    name: 'Seu Geraldo',
    role: 'Radialista da Torre',
    x: 3255,
    y: 1030,
    radius: 22,
    shirtColor: '#b91c1c',
    pantsColor: '#1f2937',
    hairColor: '#9ca3af',
    skinTone: '#d9a077',
    facing: 'left',
    area: 'Torre de Transmissão de Rádio',
    sceneId: 'povoado_principal',
  },
  {
    id: 'tio_benedito',
    name: 'Danilo',
    role: 'Cuidador da Roça e das Vacas',
    x: 470,
    y: 425,
    radius: 22,
    shirtColor: '#ca8a04',
    pantsColor: '#57534e',
    hairColor: '#292524',
    hatColor: '#a16207',
    skinTone: '#c68b63',
    facing: 'down',
    area: 'Sítio da Roça Antiga',
    sceneId: 'roca_antiga',
  },
  {
    id: 'matheus',
    name: 'Matheus',
    role: 'Designer do Povoado',
    x: 1320,
    y: 945,
    radius: 22,
    shirtColor: '#0d9488',
    pantsColor: '#1e293b',
    hairColor: '#1c1917',
    skinTone: '#d9a077',
    facing: 'down',
    area: 'Praça Central',
    sceneId: 'povoado_principal',
  },
  {
    id: 'ramon',
    name: 'Ramon',
    role: 'Designer & Ilustrador',
    x: 1365,
    y: 985,
    radius: 22,
    shirtColor: '#6366f1',
    pantsColor: '#334155',
    hairColor: '#291c14',
    skinTone: '#c68b63',
    facing: 'left',
    area: 'Praça Central',
    sceneId: 'povoado_principal',
  },
  {
    id: 'nosmalda',
    name: 'Nosmalda',
    role: 'Zeladora da Igreja Matriz',
    x: 785,
    y: 1110,
    radius: 22,
    shirtColor: '#7e22ce',
    pantsColor: '#312e81',
    hairColor: '#6b7280',
    skinTone: '#d9a077',
    facing: 'right',
    area: 'Igreja Matriz de Barriga',
    sceneId: 'povoado_principal',
  },
];

export interface WorldTree {
  x: number;
  y: number;
  radius: number;
  variant: 'mango' | 'ipe' | 'palm';
}

export const WORLD_TREES: WorldTree[] = [
  // Praça corners & frame
  { x: 855, y: 745, radius: 26, variant: 'ipe' },
  { x: 1545, y: 745, radius: 26, variant: 'ipe' },
  { x: 855, y: 1355, radius: 26, variant: 'mango' },
  { x: 1545, y: 1355, radius: 26, variant: 'mango' },
  { x: 1010, y: 920, radius: 22, variant: 'ipe' },
  { x: 1390, y: 920, radius: 22, variant: 'ipe' },
  { x: 1010, y: 1180, radius: 22, variant: 'ipe' },
  { x: 1390, y: 1180, radius: 22, variant: 'ipe' },

  // NW School area
  { x: 250, y: 310, radius: 28, variant: 'mango' },
  { x: 660, y: 260, radius: 26, variant: 'ipe' },
  { x: 620, y: 540, radius: 24, variant: 'palm' },

  // NE Soccer field surroundings
  { x: 1650, y: 240, radius: 28, variant: 'mango' },
  { x: 2330, y: 230, radius: 28, variant: 'ipe' },
  { x: 2330, y: 510, radius: 26, variant: 'palm' },

  // SW Estrada da Roça
  { x: 420, y: 1470, radius: 28, variant: 'mango' },
  { x: 350, y: 1880, radius: 26, variant: 'palm' },
  { x: 160, y: 1680, radius: 28, variant: 'mango' },

  // SE Vila Sul
  { x: 1520, y: 1690, radius: 28, variant: 'mango' },
  { x: 1960, y: 1650, radius: 26, variant: 'ipe' },
  { x: 1850, y: 1950, radius: 26, variant: 'palm' },

  // East Road to Radio Tower (Avenida da Torre)
  { x: 1750, y: 950, radius: 24, variant: 'ipe' },
  { x: 1980, y: 1150, radius: 25, variant: 'mango' },
  { x: 2250, y: 940, radius: 26, variant: 'palm' },
  { x: 2520, y: 1160, radius: 26, variant: 'ipe' },
  { x: 2790, y: 945, radius: 25, variant: 'mango' },
  { x: 2990, y: 1160, radius: 26, variant: 'palm' },
  { x: 3450, y: 940, radius: 28, variant: 'ipe' },
  { x: 3420, y: 1180, radius: 26, variant: 'mango' },
];

export const WORLD_RELICS: CollectibleRelic[] = [
  {
    id: 'relic_piao',
    name: 'Pião de Madeira da Roça',
    description: 'Um pião entalhado pelo pai de Cleilson antes da mudança.',
    x: 295,
    y: 1735,
    area: 'Estrada da Roça Antiga',
    sceneId: 'povoado_principal',
    xpReward: 45,
  },
  {
    id: 'relic_caderno',
    name: 'Caderno de Desenhos',
    description: 'Esquecido perto das árvores da Escola Municipal.',
    x: 270,
    y: 440,
    area: 'Escola Municipal',
    sceneId: 'povoado_principal',
    xpReward: 45,
  },
  {
    id: 'relic_chuteira',
    name: 'Meião da Sorte',
    description: 'Deixado atrás do gol leste do Campo de Futebol.',
    x: 2295,
    y: 360,
    area: 'Campo de Futebol',
    sceneId: 'povoado_principal',
    xpReward: 50,
  },
  {
    id: 'relic_moeda_praca',
    name: 'Moeda Antiga da Fonte',
    description: 'Brilhando entre os paralelepípedos da Praça Central.',
    x: 1320,
    y: 1210,
    area: 'Praça Central',
    sceneId: 'povoado_principal',
    xpReward: 40,
  },
  {
    id: 'relic_ferradura',
    name: 'Ferradura Dourada',
    description: 'Relíquia de sorte guardada atrás da oficina do Seu Chico.',
    x: 1930,
    y: 1770,
    area: 'Rua da Vila Sul',
    sceneId: 'povoado_principal',
    xpReward: 50,
  },
  {
    id: 'relic_valvula',
    name: 'Válvula Rara de Rádio',
    description: 'Peça clássica da primeira transmissão de Povoado Barriga.',
    x: 2880,
    y: 1125,
    area: 'Avenida da Torre',
    sceneId: 'povoado_principal',
    xpReward: 60,
  },
  {
    id: 'relic_retrato_casa',
    name: 'Caixinha de Lembranças',
    description: 'Guardada perto do fogão a lenha dentro da Casa do Cleilson.',
    x: 645,
    y: 225,
    area: 'Casa do Cleilson (Interior)',
    sceneId: 'interior_casa_cleilson',
    xpReward: 55,
  },
  {
    id: 'relic_bule_roca',
    name: 'Bule de Ágata da Varanda',
    description: 'Esquecido ao lado da antiga casa de taipa no Sítio da Roça Antiga.',
    x: 205,
    y: 350,
    area: 'Sítio da Roça Antiga',
    sceneId: 'roca_antiga',
    xpReward: 65,
  },
];

export const INITIAL_ANIMALS: RoamingAnimal[] = [
  {
    id: 'caramelo',
    kind: 'dog',
    name: 'Caramelo',
    homeX: 1270,
    homeY: 1090,
    x: 1270,
    y: 1090,
    vx: 0,
    vy: 0,
    timer: 1,
    color: '#d98a3c',
    sceneId: 'povoado_principal',
  },
  {
    id: 'galinha_1',
    kind: 'chicken',
    name: 'Galinha Pintadinha',
    homeX: 1620,
    homeY: 1690,
    x: 1620,
    y: 1690,
    vx: 0,
    vy: 0,
    timer: 0.5,
    color: '#f8fafc',
    sceneId: 'povoado_principal',
  },
  {
    id: 'galinha_2',
    kind: 'chicken',
    name: 'Galinha Carijó',
    homeX: 1890,
    homeY: 1640,
    x: 1890,
    y: 1640,
    vx: 0,
    vy: 0,
    timer: 1.2,
    color: '#d6b48c',
    sceneId: 'povoado_principal',
  },
  {
    id: 'galinha_3',
    kind: 'chicken',
    name: 'Galinha Ruiva',
    homeX: 1710,
    homeY: 1840,
    x: 1710,
    y: 1840,
    vx: 0,
    vy: 0,
    timer: 2.0,
    color: '#c25934',
    sceneId: 'povoado_principal',
  },
  {
    id: 'galinha_roca',
    kind: 'chicken',
    name: 'Galinha da Roça',
    homeX: 520,
    homeY: 465,
    x: 520,
    y: 465,
    vx: 0,
    vy: 0,
    timer: 1.5,
    color: '#fef3c7',
    sceneId: 'roca_antiga',
  },
  {
    id: 'vaca_mimosa',
    kind: 'cow',
    name: 'Vaca Mimosa',
    homeX: 650,
    homeY: 360,
    x: 650,
    y: 360,
    vx: 0,
    vy: 0,
    timer: 1.8,
    color: '#f8fafc',
    sceneId: 'roca_antiga',
  },
  {
    id: 'vaca_estrela',
    kind: 'cow',
    name: 'Vaca Estrela',
    homeX: 745,
    homeY: 430,
    x: 745,
    y: 430,
    vx: 0,
    vy: 0,
    timer: 2.3,
    color: '#e7e5e4',
    sceneId: 'roca_antiga',
  },
];

// Parked family wagon near the SW road entrance
export const PARKED_CARROCA = {
  x: 320,
  y: 1785,
};

export const VILLAGE_WELL = {
  x: 1620,
  y: 1785,
  radius: 26,
};

export function getAreaNameAt(x: number, y: number): string {
  if (x >= 620 && x <= 890 && y >= 880 && y <= 1180) {
    return 'Igreja Matriz de Barriga';
  }
  if (
    x >= PLAZA_RECT.x - 40 &&
    x <= PLAZA_RECT.x + PLAZA_RECT.width + 40 &&
    y >= PLAZA_RECT.y - 160 &&
    y <= PLAZA_RECT.y + PLAZA_RECT.height + 40
  ) {
    return 'Praça Central';
  }
  if (x < 780 && y < 640) return 'Escola Municipal';
  if (x > 1620 && y < 650) return 'Campo de Futebol';
  if (x < 850 && y > 1250) return 'Estrada da Roça Antiga';
  if (x > 1450 && y > 1400) return 'Rua da Vila Sul';
  if (x > 2950 && y > 720 && y < 1300) return 'Torre de Transmissão de Rádio';
  if (x > 1500 && y >= 860 && y <= 1240) return 'Avenida da Torre';
  return 'Arredores de Povoado Barriga';
}

export function isPointOnRoadOrPlaza(x: number, y: number): 'stone' | 'dirt' | 'grass' {
  if (
    x >= PLAZA_RECT.x &&
    x <= PLAZA_RECT.x + PLAZA_RECT.width &&
    y >= PLAZA_RECT.y &&
    y <= PLAZA_RECT.y + PLAZA_RECT.height
  ) {
    return 'stone';
  }

  for (const road of WORLD_ROADS) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const dist = pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y);
      if (dist <= road.width * 0.55) {
        return road.surface;
      }
    }
  }
  return 'grass';
}

function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export const NPC_ROUTINES: Record<string, NPCScheduleSlot[]> = {
  dona_maria: [
    {
      startHour: 6,
      endHour: 12.5,
      waypoints: [
        { x: 1110, y: 810 },
        { x: 1180, y: 845 },
      ],
    },
    {
      startHour: 12.5,
      endHour: 17.5,
      waypoints: [
        { x: 1110, y: 1030 },
        { x: 960, y: 1230 },
        { x: 745, y: 1475 },
        { x: 960, y: 1230 },
      ],
    },
    {
      startHour: 17.5,
      endHour: 20.5,
      sceneId: 'povoado_principal',
      waypoints: [
        { x: 1110, y: 810 },
        { x: 1140, y: 825 },
      ],
    },
    {
      startHour: 20.5,
      endHour: 6,
      sceneId: 'interior_casa_cleilson',
      waypoints: [
        { x: 520, y: 210 },
        { x: 465, y: 390 },
      ],
    },
  ],
  seu_antonio: [
    {
      startHour: 6,
      endHour: 12,
      waypoints: [
        { x: 1210, y: 825 },
        { x: 1420, y: 1050 },
        { x: 1450, y: 1270 },
      ],
    },
    {
      startHour: 12,
      endHour: 18,
      waypoints: [
        { x: 1285, y: 985 },
        { x: 1285, y: 1125 },
      ],
    },
    {
      startHour: 18,
      endHour: 21,
      sceneId: 'povoado_principal',
      waypoints: [{ x: 1210, y: 820 }],
    },
    {
      startHour: 21,
      endHour: 6,
      sceneId: 'interior_casa_cleilson',
      waypoints: [
        { x: 255, y: 365 },
        { x: 310, y: 380 },
      ],
    },
  ],
  professora_beatriz: [
    {
      startHour: 6,
      endHour: 13,
      waypoints: [
        { x: 470, y: 410 },
        { x: 530, y: 415 },
      ],
    },
    {
      startHour: 13,
      endHour: 18.5,
      waypoints: [
        { x: 520, y: 470 },
        { x: 760, y: 620 },
        { x: 925, y: 805 },
        { x: 1095, y: 1045 },
        { x: 1280, y: 1135 },
      ],
    },
    {
      startHour: 18.5,
      endHour: 6,
      waypoints: [
        { x: 925, y: 805 },
        { x: 760, y: 620 },
        { x: 470, y: 410 },
      ],
    },
  ],
  pedrinho: [
    {
      startHour: 6,
      endHour: 12,
      waypoints: [
        { x: 560, y: 430 },
        { x: 420, y: 440 },
      ],
    },
    {
      startHour: 12,
      endHour: 18,
      waypoints: [
        { x: 760, y: 620 },
        { x: 940, y: 825 },
        { x: 1125, y: 1155 },
        { x: 1315, y: 995 },
      ],
    },
    {
      startHour: 18,
      endHour: 6,
      waypoints: [
        { x: 1350, y: 815 },
        { x: 1290, y: 860 },
      ],
    },
  ],
  ze_bola: [
    {
      startHour: 6,
      endHour: 11.5,
      waypoints: [
        { x: 1030, y: 870 },
        { x: 1365, y: 870 },
        { x: 1365, y: 1210 },
        { x: 1030, y: 1210 },
      ],
    },
    {
      startHour: 11.5,
      endHour: 18.5,
      waypoints: [
        { x: 1640, y: 630 },
        { x: 1990, y: 555 },
        { x: 1990, y: 415 },
      ],
    },
    {
      startHour: 18.5,
      endHour: 6,
      waypoints: [
        { x: 1475, y: 805 },
        { x: 1320, y: 1040 },
      ],
    },
  ],
  dona_carmem: [
    {
      startHour: 6,
      endHour: 17.5,
      waypoints: [
        { x: 685, y: 1495 },
        { x: 635, y: 1510 },
      ],
    },
    {
      startHour: 17.5,
      endHour: 6,
      waypoints: [
        { x: 760, y: 1470 },
        { x: 940, y: 1255 },
        { x: 685, y: 1495 },
      ],
    },
  ],
  seu_chico: [
    {
      startHour: 6,
      endHour: 17,
      waypoints: [
        { x: 1790, y: 1750 },
        { x: 1665, y: 1775 },
      ],
    },
    {
      startHour: 17,
      endHour: 6,
      waypoints: [
        { x: 1640, y: 1480 },
        { x: 1465, y: 1265 },
        { x: 1325, y: 1150 },
      ],
    },
  ],
  seu_geraldo: [
    {
      startHour: 6,
      endHour: 10.5,
      waypoints: [
        { x: 1370, y: 960 },
        { x: 1445, y: 1050 },
      ],
    },
    {
      startHour: 10.5,
      endHour: 6,
      waypoints: [
        { x: 1950, y: 1050 },
        { x: 2650, y: 1050 },
        { x: 3255, y: 1030 },
        { x: 3295, y: 1030 },
      ],
    },
  ],
  tio_benedito: [
    {
      startHour: 6,
      endHour: 24,
      sceneId: 'roca_antiga',
      waypoints: [
        { x: 470, y: 425 },
        { x: 615, y: 405 },
        { x: 495, y: 515 },
      ],
    },
  ],
  matheus: [
    {
      startHour: 6,
      endHour: 13,
      sceneId: 'povoado_principal',
      waypoints: [
        { x: 1320, y: 945 },
        { x: 1355, y: 805 },
        { x: 1275, y: 910 },
      ],
    },
    {
      startHour: 13,
      endHour: 20,
      sceneId: 'povoado_principal',
      waypoints: [
        { x: 1265, y: 1050 },
        { x: 1090, y: 1050 },
        { x: 1200, y: 1170 },
      ],
    },
    {
      startHour: 20,
      endHour: 6,
      sceneId: 'povoado_principal',
      waypoints: [
        { x: 1345, y: 800 },
        { x: 1320, y: 890 },
      ],
    },
  ],
  ramon: [
    {
      startHour: 6,
      endHour: 12.5,
      sceneId: 'povoado_principal',
      waypoints: [
        { x: 1365, y: 985 },
        { x: 1295, y: 1130 },
        { x: 1140, y: 1165 },
      ],
    },
    {
      startHour: 12.5,
      endHour: 18.5,
      sceneId: 'povoado_principal',
      waypoints: [
        { x: 960, y: 1245 },
        { x: 750, y: 1475 },
        { x: 960, y: 1245 },
      ],
    },
    {
      startHour: 18.5,
      endHour: 6,
      sceneId: 'povoado_principal',
      waypoints: [
        { x: 1380, y: 945 },
        { x: 1330, y: 970 },
      ],
    },
  ],
  nosmalda: [
    {
      startHour: 6,
      endHour: 11,
      sceneId: 'povoado_principal',
      waypoints: [
        { x: 785, y: 1110 },
        { x: 895, y: 1085 },
      ],
    },
    {
      startHour: 11,
      endHour: 17.5,
      sceneId: 'povoado_principal',
      waypoints: [
        { x: 940, y: 1085 },
        { x: 1095, y: 1065 },
        { x: 895, y: 1085 },
      ],
    },
    {
      startHour: 17.5,
      endHour: 6,
      sceneId: 'interior_igreja',
      waypoints: [
        { x: 375, y: 240 },
        { x: 435, y: 255 },
      ],
    },
  ],
};

export function getScheduledSlotForNPC(
  npcId: string,
  worldHour: number
): { sceneId: SceneId; waypoints: { x: number; y: number }[] } {
  const slots = NPC_ROUTINES[npcId];
  if (!slots || slots.length === 0) {
    return { sceneId: 'povoado_principal', waypoints: [] };
  }
  const h = ((worldHour % 24) + 24) % 24;

  for (const slot of slots) {
    if (slot.startHour < slot.endHour) {
      if (h >= slot.startHour && h < slot.endHour) {
        return {
          sceneId: slot.sceneId ?? 'povoado_principal',
          waypoints: slot.waypoints,
        };
      }
    } else {
      // Wraps midnight
      if (h >= slot.startHour || h < slot.endHour) {
        return {
          sceneId: slot.sceneId ?? 'povoado_principal',
          waypoints: slot.waypoints,
        };
      }
    }
  }
  return {
    sceneId: slots[0].sceneId ?? 'povoado_principal',
    waypoints: slots[0].waypoints,
  };
}

export function getScheduledWaypointsForNPC(
  npcId: string,
  worldHour: number
): { x: number; y: number }[] {
  return getScheduledSlotForNPC(npcId, worldHour).waypoints;
}
