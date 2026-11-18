export type GameScreen =
  | 'TITLE'
  | 'PROLOGUE'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY';

export type WeatherType = 'CLEAR' | 'CLOUDY' | 'RAINY';

export type LifeStageId =
  | 'INFANCIA'
  | 'PRE_ADOLESCENCIA'
  | 'JUVENTUDE'
  | 'ADULTO';

export type StatKey = 'coragem' | 'sabedoria' | 'agilidade' | 'carisma';

export interface PlayerStats {
  coragem: number;
  sabedoria: number;
  agilidade: number;
  carisma: number;
}

export interface AgeStageInfo {
  id: LifeStageId;
  label: string;
  ageRange: string;
  subtitle: string;
  description: string;
  minLevel: number;
}

export interface LevelThreshold {
  level: number;
  xpRequired: number;
  age: number;
  stageId: LifeStageId;
  title: string;
}

export type ActiveMiniGame =
  | 'SCHOOL_QUIZ'
  | 'SOCCER_PENALTY'
  | 'RADIO_TUNER'
  | 'CHICKEN_HERD';

export type QuestId =
  | 'q1_chegada'
  | 'q2_escola'
  | 'q3_futebol'
  | 'q4_torre_radio'
  | 'q5_festival'
  | 'sq_galinhas'
  | 'sq_reliquias';

export interface QuestObjective {
  id: string;
  description: string;
  targetX: number;
  targetY: number;
  areaName: string;
  completed: boolean;
}

export interface QuestDefinition {
  id: QuestId;
  chapterLabel: string;
  title: string;
  summary: string;
  isMain: boolean;
  xpReward: number;
  coinReward: number;
  statBoost?: Partial<PlayerStats>;
  recommendedLevel: number;
  objectives: Omit<QuestObjective, 'completed'>[];
}

export type AchievementId =
  | 'ach_carroca'
  | 'ach_praca_cantos'
  | 'ach_escola'
  | 'ach_futebol'
  | 'ach_torre_radio'
  | 'ach_crescimento'
  | 'ach_adulto'
  | 'ach_reliquias'
  | 'ach_caramelo'
  | 'ach_artilheiro'
  | 'ach_sinal_limpo'
  | 'ach_lenda';

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  category: 'História' | 'Exploração' | 'Habilidade' | 'Vida no Povoado';
  xpBonus: number;
  iconKey:
    | 'wagon'
    | 'compass'
    | 'book'
    | 'trophy'
    | 'radio'
    | 'sprout'
    | 'crown'
    | 'gem'
    | 'heart'
    | 'star'
    | 'signal'
    | 'award';
}

export interface DialogueChoice {
  label: string;
  nextLineIndex?: number;
  statGain?: Partial<PlayerStats>;
  xpGain?: number;
  coinGain?: number;
  triggerMiniGame?: ActiveMiniGame;
  completeObjectiveId?: string;
  advanceFlag?: string;
  closeAfter?: boolean;
}

export interface DialogueLine {
  speaker: string;
  role: string;
  avatarColor: string;
  text: string;
  choices?: DialogueChoice[];
}

export type SceneId =
  | 'povoado_principal'
  | 'roca_antiga'
  | 'interior_casa_cleilson'
  | 'interior_escola'
  | 'interior_mercearia'
  | 'interior_oficina'
  | 'interior_estacao_radio'
  | 'interior_igreja';

export interface ScenePortal {
  id: string;
  fromSceneId: SceneId;
  toSceneId: SceneId;
  x: number;
  y: number;
  radius: number;
  targetX: number;
  targetY: number;
  targetFacing: 'down' | 'up' | 'left' | 'right';
  label: string;
  kind: 'door' | 'exit' | 'road';
}

export interface SceneFurniture {
  id: string;
  kind:
    | 'bed'
    | 'table'
    | 'rug'
    | 'counter'
    | 'shelf'
    | 'desk'
    | 'chalkboard'
    | 'radio_console'
    | 'workbench'
    | 'sofa'
    | 'stove'
    | 'plant'
    | 'farmhouse'
    | 'corn_patch'
    | 'creek_bridge'
    | 'fence'
    | 'well'
    | 'pew'
    | 'altar';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  label?: string;
  solid?: boolean;
}

export interface SceneInteractable {
  id: string;
  sceneId: SceneId;
  x: number;
  y: number;
  radius: number;
  label: string;
  actionType: 'rest_bed' | 'inspect' | 'minigame';
  miniGame?: ActiveMiniGame;
  speaker?: string;
  role?: string;
  avatarColor?: string;
  inspectText?: string;
}

export interface SceneDefinition {
  id: SceneId;
  name: string;
  subtitle: string;
  kind: 'outdoor' | 'interior';
  width: number;
  height: number;
  floorTheme: 'meadow' | 'roca' | 'wood' | 'tile' | 'studio' | 'workshop';
  wallColor?: string;
  trimColor?: string;
  furniture: SceneFurniture[];
  interactables: SceneInteractable[];
  trees?: { x: number; y: number; radius: number; variant: 'mango' | 'ipe' | 'palm' }[];
}

export interface InteractiveNPC {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  radius: number;
  shirtColor: string;
  pantsColor: string;
  hairColor: string;
  hatColor?: string;
  skinTone: string;
  facing: 'down' | 'up' | 'left' | 'right';
  area: string;
  sceneId: SceneId;
  wanderRadius?: number;
  isMoving?: boolean;
}

export interface NPCScheduleSlot {
  startHour: number;
  endHour: number;
  sceneId?: SceneId;
  waypoints: { x: number; y: number }[];
}

export interface WorldBuilding {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  roofColor: string;
  wallColor: string;
  trimColor: string;
  doorX: number;
  doorY: number;
  kind: 'house' | 'school' | 'shop' | 'workshop' | 'radio_shack' | 'radio_tower' | 'church';
  interiorSceneId?: SceneId;
}

export interface CornerMarker {
  id: string;
  cornerName: string;
  streetName: string;
  x: number;
  y: number;
  radius: number;
}

export interface CollectibleRelic {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  area: string;
  sceneId: SceneId;
  xpReward: number;
}

export interface RoamingAnimal {
  id: string;
  kind: 'dog' | 'chicken' | 'cow';
  name: string;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  timer: number;
  color: string;
  sceneId?: SceneId;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface ToastNotification {
  id: string;
  kind: 'achievement' | 'level' | 'age' | 'quest' | 'relic';
  title: string;
  subtitle: string;
}

export interface GameSaveState {
  version: number;
  hasSeenPrologue: boolean;
  currentSceneId: SceneId;
  playerX: number;
  playerY: number;
  lastOutdoorX: number;
  lastOutdoorY: number;
  xp: number;
  level: number;
  coins: number;
  stats: PlayerStats;
  activeQuestId: QuestId;
  completedQuestIds: QuestId[];
  completedObjectiveIds: string[];
  visitedCorners: string[];
  visitedScenes: SceneId[];
  collectedRelics: string[];
  unlockedAchievements: AchievementId[];
  storyFlags: Record<string, boolean>;
  chickensRescued: number;
  bestSoccerScore: number;
  radioMissionsDone: number;
  pettedCaramelo: boolean;
  muted: boolean;
  worldHour: number;
  weather: WeatherType;
}
