import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { PrologueCutscene } from './components/PrologueCutscene';
import { GameHUD } from './components/GameHUD';
import { DialogueBox } from './components/DialogueBox';
import { MiniGameModal, MiniGameResult } from './components/MiniGames';
import {
  AchievementsModal,
  JournalModal,
  PauseModal,
  ToastOverlay,
  VictoryModal,
  WorldMapModal,
} from './components/Modals';
import { soundEngine } from './game/audio';
import { World3DController } from './game/threeWorld';
import {
  findPortalBetween,
  getPortalsForScene,
  getSceneById,
} from './game/scenes';
import {
  ACHIEVEMENTS,
  AGE_STAGES,
  getLevelInfoFromXP,
  getNPCDialogue,
  MAIN_QUEST_ORDER,
  QUESTS,
} from './game/storyData';
import {
  AchievementId,
  ActiveMiniGame,
  DialogueChoice,
  DialogueLine,
  GameSaveState,
  GameScreen,
  InteractiveNPC,
  Particle,
  PlayerStats,
  QuestId,
  RoamingAnimal,
  SceneId,
  SceneInteractable,
  ScenePortal,
  ToastNotification,
  WeatherType,
} from './game/types';
import {
  CORNER_MARKERS,
  getAreaNameAt,
  getScheduledSlotForNPC,
  INITIAL_ANIMALS,
  INITIAL_NPCS,
  isPointOnRoadOrPlaza,
  PARKED_CARROCA,
  PLAZA_FOUNTAIN,
  VILLAGE_WELL,
  WORLD_BUILDINGS,
  WORLD_HEIGHT,
  WORLD_RELICS,
  WORLD_TREES,
  WORLD_WIDTH,
} from './game/worldData';

const SAVE_STORAGE_KEY = 'povoado_barriga_cleilson_v1';

function createInitialSave(muted = false): GameSaveState {
  return {
    version: 1,
    hasSeenPrologue: false,
    currentSceneId: 'povoado_principal',
    playerX: 1155,
    playerY: 855, // Right in front of Casa do Cleilson on the Praça Central
    lastOutdoorX: 1155,
    lastOutdoorY: 855,
    xp: 0,
    level: 1,
    coins: 10,
    stats: {
      coragem: 2,
      sabedoria: 2,
      agilidade: 2,
      carisma: 2,
    },
    activeQuestId: 'q1_chegada',
    completedQuestIds: [],
    completedObjectiveIds: [],
    visitedCorners: [],
    visitedScenes: ['povoado_principal'],
    collectedRelics: [],
    unlockedAchievements: [],
    storyFlags: {},
    chickensRescued: 0,
    bestSoccerScore: 0,
    radioMissionsDone: 0,
    pettedCaramelo: false,
    muted,
    worldHour: 8.5,
    weather: 'CLEAR',
  };
}

function loadSavedGame(): GameSaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameSaveState>;
    if (parsed && parsed.version === 1 && typeof parsed.xp === 'number') {
      const base = createInitialSave(Boolean(parsed.muted));
      return {
        ...base,
        ...parsed,
        currentSceneId: parsed.currentSceneId ?? 'povoado_principal',
        lastOutdoorX:
          typeof parsed.lastOutdoorX === 'number'
            ? parsed.lastOutdoorX
            : typeof parsed.playerX === 'number'
            ? parsed.playerX
            : 1155,
        lastOutdoorY:
          typeof parsed.lastOutdoorY === 'number'
            ? parsed.lastOutdoorY
            : typeof parsed.playerY === 'number'
            ? parsed.playerY
            : 855,
        visitedScenes: Array.isArray(parsed.visitedScenes)
          ? parsed.visitedScenes
          : ['povoado_principal'],
        worldHour: typeof parsed.worldHour === 'number' ? parsed.worldHour : 8.5,
        weather:
          parsed.weather === 'CLOUDY' || parsed.weather === 'RAINY'
            ? parsed.weather
            : 'CLEAR',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const [initialSaved] = useState<GameSaveState | null>(() => loadSavedGame());
  const [save, setSave] = useState<GameSaveState>(
    () => initialSaved ?? createInitialSave(false)
  );
  const [hasExistingSave, setHasExistingSave] = useState<boolean>(
    () => Boolean(initialSaved && initialSaved.hasSeenPrologue)
  );

  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [activeDialogue, setActiveDialogue] = useState<DialogueLine[] | null>(
    null
  );
  const [activeMiniGame, setActiveMiniGame] = useState<ActiveMiniGame | null>(
    null
  );
  const [activeModal, setActiveModal] = useState<
    'journal' | 'achievements' | 'map' | null
  >(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 900 || 'ontouchstart' in window;
  });

  // Live lightweight HUD snapshot updated from game loop only when values change
  const [hudLive, setHudLive] = useState<{
    areaName: string;
    nearestPrompt: string | null;
    objectiveDistanceMeters: number | null;
    worldHour: number;
    weather: WeatherType;
  }>({
    areaName: 'Praça Central',
    nearestPrompt: null,
    objectiveDistanceMeters: null,
    worldHour: save.worldHour,
    weather: save.weather,
  });

  // Mutable simulation refs (isolated from React re-renders)
  const threeMountRef = useRef<HTMLDivElement | null>(null);
  const world3DRef = useRef<World3DController | null>(null);
  const transitionFadeRef = useRef<HTMLDivElement | null>(null);
  const compassArrowRef = useRef<HTMLDivElement | null>(null);
  const saveRef = useRef<GameSaveState>(save);
  const screenRef = useRef<GameScreen>(screen);
  const overlayOpenRef = useRef<boolean>(false);

  const currentSceneIdRef = useRef<SceneId>(save.currentSceneId);
  const playerPosRef = useRef({
    x: save.playerX,
    y: save.playerY,
    dir: 'down' as 'down' | 'up' | 'left' | 'right',
    isMoving: false,
  });
  const transitionRef = useRef<{
    active: boolean;
    phase: 'out' | 'in';
    alpha: number;
    portal: ScenePortal | null;
  }>({
    active: false,
    phase: 'out',
    alpha: 0,
    portal: null,
  });

  const worldHourRef = useRef<number>(save.worldHour);
  const hourAdvanceAnimRef = useRef<number>(0);
  const weatherRef = useRef<WeatherType>(save.weather);
  const weatherTimerRef = useRef<number>(12 + Math.random() * 10);
  const weatherIntensityRef = useRef<number>(1);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef({ dx: 0, dy: 0 });
  const touchRunRef = useRef(false);
  const npcsRef = useRef<InteractiveNPC[]>(
    INITIAL_NPCS.map((n) => ({ ...n, isMoving: false }))
  );
  const npcRoutineStateRef = useRef<
    Record<string, { wpIdx: number; pauseTimer: number }>
  >({});
  const animalsRef = useRef<RoamingAnimal[]>(
    INITIAL_ANIMALS.map((a) => ({ ...a }))
  );
  const particlesRef = useRef<Particle[]>([]);
  const nearestActionRef = useRef<{
    type: 'npc' | 'caramelo' | 'carroca' | 'radio_tower' | 'portal' | 'scene_interactable';
    id: string;
    x: number;
    y: number;
    label: string;
    portal?: ScenePortal;
    interactable?: SceneInteractable;
  } | null>(null);

  useEffect(() => {
    saveRef.current = save;
    soundEngine.setMuted(save.muted);
    if (save.hasSeenPrologue) {
      try {
        localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(save));
        setHasExistingSave(true);
      } catch {
        // ignore storage quota errors
      }
    }
  }, [save]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    overlayOpenRef.current = Boolean(
      activeDialogue || activeMiniGame || activeModal || screen !== 'PLAYING'
    );
  }, [activeDialogue, activeMiniGame, activeModal, screen]);

  const pushToast = useCallback(
    (
      kind: ToastNotification['kind'],
      title: string,
      subtitle: string
    ) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, kind, title, subtitle }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const spawnBurst = useCallback((x: number, y: number, color: string, count = 16) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 45 + Math.random() * 90;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.65 + Math.random() * 0.35,
        maxLife: 1.0,
        size: 3 + Math.random() * 2.5,
        color,
      });
    }
  }, []);

  // Unified state mutation helper handling XP, Levels, Age progression, Quests & Achievements
  const applyProgressionUpdate = useCallback(
    (updater: (prev: GameSaveState) => GameSaveState) => {
      setSave((prev) => {
        const next = updater(prev);

        // Unlock Achievement helper inside pure reducer
        const grantAch = (id: AchievementId) => {
          if (!next.unlockedAchievements.includes(id)) {
            const def = ACHIEVEMENTS.find((a) => a.id === id);
            next.unlockedAchievements = [...next.unlockedAchievements, id];
            if (def) {
              next.xp += def.xpBonus;
              window.setTimeout(() => {
                soundEngine.playAchievement();
                pushToast('achievement', `Conquista: ${def.title}`, `+${def.xpBonus} XP`);
              }, 80);
            }
          }
        };

        // Check Quest Completion -> Advance Chapter
        const activeQ = QUESTS[next.activeQuestId];
        if (activeQ && activeQ.isMain) {
          const allDone = activeQ.objectives.every((o) =>
            next.completedObjectiveIds.includes(o.id)
          );
          if (allDone && !next.completedQuestIds.includes(activeQ.id)) {
            next.completedQuestIds = [...next.completedQuestIds, activeQ.id];
            next.xp += activeQ.xpReward;
            next.coins += activeQ.coinReward;
            if (activeQ.statBoost) {
              const updatedStats: PlayerStats = { ...next.stats };
              (Object.keys(activeQ.statBoost) as (keyof PlayerStats)[]).forEach(
                (k) => {
                  updatedStats[k] += activeQ.statBoost?.[k] ?? 0;
                }
              );
              next.stats = updatedStats;
            }

            const curIdx = MAIN_QUEST_ORDER.indexOf(activeQ.id);
            const nextQuestId: QuestId | undefined =
              curIdx >= 0 && curIdx + 1 < MAIN_QUEST_ORDER.length
                ? MAIN_QUEST_ORDER[curIdx + 1]
                : undefined;

            if (nextQuestId) {
              next.activeQuestId = nextQuestId;
              const upcoming = QUESTS[nextQuestId];
              window.setTimeout(() => {
                pushToast(
                  'quest',
                  `Capítulo Concluído: ${activeQ.title}`,
                  `Novo: ${upcoming.title}`
                );
              }, 160);
            } else if (activeQ.id === 'q5_festival') {
              grantAch('ach_lenda');
              window.setTimeout(() => {
                setScreen('VICTORY');
              }, 500);
            }
          }
        }

        // Check Achievements based on state
        if (next.visitedCorners.length >= 4) grantAch('ach_praca_cantos');
        if (next.collectedRelics.length >= WORLD_RELICS.length) {
          grantAch('ach_reliquias');
        }
        if (next.pettedCaramelo) grantAch('ach_caramelo');
        if (next.bestSoccerScore >= 5) grantAch('ach_artilheiro');
        if (next.radioMissionsDone >= 1) grantAch('ach_torre_radio');
        if (next.radioMissionsDone >= 3) grantAch('ach_sinal_limpo');

        // Check Level & Age Progression
        const prevLvl = getLevelInfoFromXP(prev.xp).current;
        const newLvl = getLevelInfoFromXP(next.xp).current;
        next.level = newLvl.level;

        if (newLvl.stageId === 'JUVENTUDE' || newLvl.stageId === 'ADULTO') {
          grantAch('ach_crescimento');
        }
        if (newLvl.stageId === 'ADULTO') {
          grantAch('ach_adulto');
        }

        // Re-check final level after achievement bonuses
        const finalLvl = getLevelInfoFromXP(next.xp).current;
        next.level = finalLvl.level;

        if (finalLvl.stageId !== prevLvl.stageId) {
          const st = AGE_STAGES[finalLvl.stageId];
          window.setTimeout(() => {
            soundEngine.playAgeUp();
            spawnBurst(playerPosRef.current.x, playerPosRef.current.y, '#fbbf24', 24);
            pushToast(
              'age',
              `Cleilson cresceu: ${finalLvl.age} anos!`,
              `Nova fase: ${st.label} (${st.subtitle})`
            );
          }, 220);
        } else if (finalLvl.level > prevLvl.level) {
          window.setTimeout(() => {
            soundEngine.playLevelUp();
            spawnBurst(playerPosRef.current.x, playerPosRef.current.y, '#38bdf8', 18);
            pushToast(
              'level',
              `Subiu para o Nível ${finalLvl.level}!`,
              `Cleilson agora tem ${finalLvl.age} anos · ${finalLvl.title}`
            );
          }, 180);
        }

        return next;
      });
    },
    [pushToast, spawnBurst]
  );

  const startSceneTransition = useCallback((portal: ScenePortal) => {
    if (transitionRef.current.active) return;
    const destScene = getSceneById(portal.toSceneId);
    soundEngine.playDoorTransition(destScene.kind === 'interior');
    transitionRef.current = {
      active: true,
      phase: 'out',
      alpha: 0,
      portal,
    };
  }, []);

  const handleInteract = useCallback(() => {
    if (
      screenRef.current !== 'PLAYING' ||
      overlayOpenRef.current ||
      transitionRef.current.active
    ) {
      return;
    }
    const target = nearestActionRef.current;
    if (!target) return;

    if (target.type === 'portal' && target.portal) {
      startSceneTransition(target.portal);
      return;
    }

    soundEngine.playSelect();

    if (target.type === 'scene_interactable' && target.interactable) {
      const item = target.interactable;
      if (item.actionType === 'rest_bed') {
        hourAdvanceAnimRef.current += 6;
        spawnBurst(playerPosRef.current.x, playerPosRef.current.y - 10, '#fbbf24', 12);
        pushToast(
          'quest',
          'Descanso Merecido',
          'Cleilson tirou um cochilo (+6 horas no relógio).'
        );
      } else if (item.actionType === 'minigame' && item.miniGame) {
        setActiveMiniGame(item.miniGame);
      } else if (item.actionType === 'inspect' && item.inspectText) {
        setActiveDialogue([
          {
            speaker: item.speaker ?? 'Observação',
            role: item.role ?? 'Povoado Barriga',
            avatarColor: item.avatarColor ?? '#d97706',
            text: item.inspectText,
          },
        ]);
      }
      return;
    }

    if (target.type === 'npc') {
      const lines = getNPCDialogue(target.id, saveRef.current);
      setActiveDialogue(lines);
    } else if (target.type === 'caramelo') {
      soundEngine.playDogBark();
      spawnBurst(target.x, target.y - 10, '#f472b6', 10);
      applyProgressionUpdate((prev) => ({
        ...prev,
        pettedCaramelo: true,
        xp: prev.pettedCaramelo ? prev.xp : prev.xp + 20,
      }));
      setActiveDialogue([
        {
          speaker: 'Caramelo',
          role: 'Cãozinho da Praça Central',
          avatarColor: '#d98a3c',
          text: 'Au au! Caramelo abana o rabo todo feliz com o carinho na Praça Central!',
        },
      ]);
    } else if (target.type === 'carroca') {
      soundEngine.playCartCreak();
      setActiveDialogue([
        {
          speaker: 'Carroça da Família',
          role: 'Lembrança da Roça Afastada',
          avatarColor: '#9a6338',
          text: 'A velha carroça de madeira que trouxe Cleilson e seus pais da roça até Povoado Barriga. As marcas das rodas contam o começo dessa história!',
        },
      ]);
    } else if (target.type === 'radio_tower') {
      setActiveMiniGame('RADIO_TUNER');
    }
  }, [applyProgressionUpdate, pushToast, spawnBurst, startSceneTransition]);

  // Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      soundEngine.unlock();
      const k = e.key.toLowerCase();

      if (e.key === 'Escape') {
        if (activeMiniGame) {
          setActiveMiniGame(null);
          return;
        }
        if (activeDialogue) {
          setActiveDialogue(null);
          return;
        }
        if (activeModal) {
          setActiveModal(null);
          return;
        }
        if (screenRef.current === 'PLAYING') {
          setScreen('PAUSED');
        } else if (screenRef.current === 'PAUSED') {
          setScreen('PLAYING');
        }
        return;
      }

      if (screenRef.current === 'PLAYING' && !overlayOpenRef.current) {
        if (k === 'm') {
          setActiveModal((m) => (m === 'map' ? null : 'map'));
          return;
        }
        if (k === 'c') {
          setActiveModal((m) => (m === 'achievements' ? null : 'achievements'));
          return;
        }
        if (k === 'j') {
          setActiveModal((m) => (m === 'journal' ? null : 'journal'));
          return;
        }
        if (k === 'e' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleInteract();
          return;
        }
      }

      heldKeysRef.current.add(k);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.key.toLowerCase());
    };

    const onBlur = () => {
      heldKeysRef.current.clear();
      joystickRef.current = { dx: 0, dy: 0 };
      touchRunRef.current = false;
    };

    const onPointerUnlock = () => {
      soundEngine.unlock();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPointerUnlock, { passive: true });
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', onPointerUnlock);
      window.removeEventListener('blur', onBlur);
    };
  }, [activeDialogue, activeMiniGame, activeModal, handleInteract]);

  // Main 3D WebGL Simulation & Render Loop
  useEffect(() => {
    if (screen !== 'PLAYING' && screen !== 'PAUSED' && screen !== 'VICTORY') {
      return;
    }

    const mountEl = threeMountRef.current;
    if (!mountEl) return;

    const world3D = new World3DController(mountEl);
    world3DRef.current = world3D;

    let stopped = false;
    let lastTime = performance.now();
    let hudSyncAcc = 0;

    const collidesWithWorld = (nx: number, ny: number): boolean => {
      if (nx < 36 || nx > WORLD_WIDTH - 36 || ny < 36 || ny > WORLD_HEIGHT - 36) {
        return true;
      }

      const pr = 14;
      // Plaza Fountain
      if (
        Math.hypot(nx - PLAZA_FOUNTAIN.x, ny - PLAZA_FOUNTAIN.y) <
        PLAZA_FOUNTAIN.radius + pr - 4
      ) {
        return true;
      }

      // Village Well
      if (
        Math.hypot(nx - VILLAGE_WELL.x, ny - VILLAGE_WELL.y) <
        VILLAGE_WELL.radius + pr - 4
      ) {
        return true;
      }

      // Buildings
      for (const b of WORLD_BUILDINGS) {
        if (
          nx + pr > b.x + 6 &&
          nx - pr < b.x + b.width - 6 &&
          ny + pr > b.y + b.height * 0.38 &&
          ny - pr < b.y + b.height - 4
        ) {
          return true;
        }
      }

      // Tree trunks
      for (const t of WORLD_TREES) {
        if (Math.hypot(nx - t.x, ny - t.y) < 12 + pr) {
          return true;
        }
      }

      return false;
    };

    const collidesWithCustomScene = (
      sceneId: SceneId,
      nx: number,
      ny: number
    ): boolean => {
      const sc = getSceneById(sceneId);
      const pr = 14;
      const minY = sc.kind === 'interior' ? 92 : 34;
      const margin = sc.kind === 'interior' ? 28 : 34;

      if (
        nx < margin ||
        nx > sc.width - margin ||
        ny < minY ||
        ny > sc.height - margin
      ) {
        return true;
      }

      for (const item of sc.furniture) {
        if (!item.solid) continue;
        if (
          nx + pr > item.x + 4 &&
          nx - pr < item.x + item.width - 4 &&
          ny + pr > item.y + 8 &&
          ny - pr < item.y + item.height - 2
        ) {
          return true;
        }
      }

      if (sc.trees) {
        for (const t of sc.trees) {
          if (Math.hypot(nx - t.x, ny - t.y) < 12 + pr) {
            return true;
          }
        }
      }

      return false;
    };

    const tick = (now: number) => {
      if (stopped) return;
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const timeSec = now / 1000;

      const curSave = saveRef.current;
      const paused = screenRef.current !== 'PLAYING' || overlayOpenRef.current;

      // Handle scene transition fade animation
      const tr = transitionRef.current;
      if (tr.active) {
        if (tr.phase === 'out') {
          tr.alpha = Math.min(1, tr.alpha + dt * 4.5);
          if (tr.alpha >= 1 && tr.portal) {
            const portal = tr.portal;
            const prevScene = getSceneById(currentSceneIdRef.current);
            const nextScene = getSceneById(portal.toSceneId);

            const nextOutdoorX =
              prevScene.id === 'povoado_principal'
                ? Math.round(playerPosRef.current.x)
                : curSave.lastOutdoorX;
            const nextOutdoorY =
              prevScene.id === 'povoado_principal'
                ? Math.round(playerPosRef.current.y)
                : curSave.lastOutdoorY;

            currentSceneIdRef.current = portal.toSceneId;
            playerPosRef.current = {
              x: portal.targetX,
              y: portal.targetY,
              dir: portal.targetFacing,
              isMoving: false,
            };
            particlesRef.current = [];

            // Snap 3D camera immediately for the new scene
            world3D.snapCameraToPlayer(portal.targetX, portal.targetY, portal.toSceneId);

            const isFirstVisit = !curSave.visitedScenes.includes(portal.toSceneId);
            setSave((prev) => ({
              ...prev,
              currentSceneId: portal.toSceneId,
              playerX: portal.targetX,
              playerY: portal.targetY,
              lastOutdoorX: nextOutdoorX,
              lastOutdoorY: nextOutdoorY,
              visitedScenes: prev.visitedScenes.includes(portal.toSceneId)
                ? prev.visitedScenes
                : [...prev.visitedScenes, portal.toSceneId],
            }));

            if (isFirstVisit && portal.toSceneId !== 'povoado_principal') {
              pushToast('quest', `Nova Área: ${nextScene.name}`, nextScene.subtitle);
            }
            tr.phase = 'in';
          }
        } else {
          tr.alpha = Math.max(0, tr.alpha - dt * 4.5);
          if (tr.alpha <= 0) {
            tr.active = false;
            tr.portal = null;
          }
        }
      }

      const activeScene = getSceneById(currentSceneIdRef.current);
      const scenePortals = getPortalsForScene(activeScene.id);

      // Advance dynamic Day/Night cycle (~24 in-game hours every 100 real seconds, plus smooth +4h/+6h glides)
      if (!paused) {
        if (hourAdvanceAnimRef.current > 0) {
          const step = Math.min(hourAdvanceAnimRef.current, dt * 14);
          hourAdvanceAnimRef.current -= step;
          worldHourRef.current = (worldHourRef.current + step) % 24;
        } else {
          worldHourRef.current = (worldHourRef.current + dt * 0.24) % 24;
        }

        // Dynamic Weather Timer (brisker 12–22s cycles, ~0.7s smooth blend)
        weatherTimerRef.current -= dt;
        if (weatherTimerRef.current <= 0) {
          weatherTimerRef.current = 12 + Math.random() * 10;
          const allWeathers: WeatherType[] = ['CLEAR', 'CLOUDY', 'RAINY'];
          const candidates = allWeathers.filter((w) => w !== weatherRef.current);
          const picked = candidates[Math.floor(Math.random() * candidates.length)];
          weatherRef.current = picked;
          weatherIntensityRef.current = 0.08;
          setSave((prev) => ({ ...prev, weather: picked }));
        } else if (weatherIntensityRef.current < 1) {
          weatherIntensityRef.current = Math.min(
            1,
            weatherIntensityRef.current + dt * 1.4
          );
        }
      }

      // Dynamic ambient soundscape reacting to hour of day, weather & interior shelter
      soundEngine.updateAmbience(dt, {
        active: !paused,
        worldHour: worldHourRef.current,
        weather: weatherRef.current,
        weatherIntensity: weatherIntensityRef.current,
        isInterior: activeScene.kind === 'interior',
      });

      // Movement input (paused during scene transition fade)
      let mx = joystickRef.current.dx;
      let my = joystickRef.current.dy;
      const keys = heldKeysRef.current;
      if (keys.has('w') || keys.has('arrowup')) my -= 1;
      if (keys.has('s') || keys.has('arrowdown')) my += 1;
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright')) mx += 1;

      const mag = Math.hypot(mx, my);
      if (!paused && !tr.active && mag > 0.08) {
        mx /= Math.max(1, mag);
        my /= Math.max(1, mag);

        const running = keys.has('shift') || touchRunRef.current;
        const speedBonus = curSave.stats.agilidade * 4;
        const speed = (running ? 295 : 195) + speedBonus;

        const nextX = playerPosRef.current.x + mx * speed * dt;
        const nextY = playerPosRef.current.y + my * speed * dt;

        const hits = (cx: number, cy: number) =>
          activeScene.id === 'povoado_principal'
            ? collidesWithWorld(cx, cy)
            : collidesWithCustomScene(activeScene.id, cx, cy);

        if (!hits(nextX, playerPosRef.current.y)) {
          playerPosRef.current.x = nextX;
        }
        if (!hits(playerPosRef.current.x, nextY)) {
          playerPosRef.current.y = nextY;
        }

        if (Math.abs(mx) > Math.abs(my)) {
          playerPosRef.current.dir = mx < 0 ? 'left' : 'right';
        } else {
          playerPosRef.current.dir = my < 0 ? 'up' : 'down';
        }
        playerPosRef.current.isMoving = true;

        const surface =
          activeScene.kind === 'interior'
            ? 'stone'
            : activeScene.id === 'povoado_principal'
            ? isPointOnRoadOrPlaza(playerPosRef.current.x, playerPosRef.current.y)
            : 'dirt';
        soundEngine.playFootstep(surface);

        if (Math.random() < 0.25) {
          particlesRef.current.push({
            x: playerPosRef.current.x + (Math.random() - 0.5) * 8,
            y: playerPosRef.current.y + 8,
            vx: -mx * 18,
            vy: -my * 12,
            life: 0.35,
            maxLife: 0.35,
            size: 2.5,
            color: surface === 'stone' ? '#e7e5e4' : '#d6b38b',
          });
        }
      } else {
        playerPosRef.current.isMoving = false;
      }

      // NPC Daily Routine Simulation (walk between Praça, Escola, Campo, and Casa)
      if (!paused) {
        for (const npc of npcsRef.current) {
          const slot = getScheduledSlotForNPC(npc.id, worldHourRef.current);
          if (npc.sceneId !== slot.sceneId) {
            npc.sceneId = slot.sceneId;
            if (slot.waypoints.length > 0) {
              npc.x = slot.waypoints[0].x;
              npc.y = slot.waypoints[0].y;
            }
            npc.isMoving = false;
            npcRoutineStateRef.current[npc.id] = { wpIdx: 0, pauseTimer: 1.5 };
            continue;
          }

          if (slot.waypoints.length === 0) {
            npc.isMoving = false;
            continue;
          }

          let rState = npcRoutineStateRef.current[npc.id];
          if (!rState) {
            rState = { wpIdx: 0, pauseTimer: 0 };
            npcRoutineStateRef.current[npc.id] = rState;
          }

          if (rState.pauseTimer > 0) {
            rState.pauseTimer -= dt;
            npc.isMoving = false;
            continue;
          }

          const targetWp = slot.waypoints[rState.wpIdx % slot.waypoints.length];
          const dx = targetWp.x - npc.x;
          const dy = targetWp.y - npc.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= 6) {
            npc.x = targetWp.x;
            npc.y = targetWp.y;
            npc.isMoving = false;
            rState.wpIdx = (rState.wpIdx + 1) % slot.waypoints.length;
            rState.pauseTimer =
              slot.waypoints.length > 1 ? 1.4 + (npc.name.length % 3) * 0.45 : 3.0;
          } else {
            const npcSpeed = 62;
            npc.x += (dx / dist) * npcSpeed * dt;
            npc.y += (dy / dist) * npcSpeed * dt;
            npc.isMoving = true;
            if (Math.abs(dx) > Math.abs(dy)) {
              npc.facing = dx < 0 ? 'left' : 'right';
            } else {
              npc.facing = dy < 0 ? 'up' : 'down';
            }
          }
        }
      } else {
        for (const npc of npcsRef.current) {
          npc.isMoving = false;
        }
      }

      // Roaming Animals update
      if (!paused) {
        for (const a of animalsRef.current) {
          if ((a.sceneId ?? 'povoado_principal') !== activeScene.id) continue;
          a.timer -= dt;
          if (a.timer <= 0) {
            a.timer = 1.4 + Math.random() * 2.2;
            const ang = Math.random() * Math.PI * 2;
            const spd = a.kind === 'dog' ? 35 : 24;
            a.vx = Math.cos(ang) * spd;
            a.vy = Math.sin(ang) * spd;
          }
          const nx = a.x + a.vx * dt;
          const ny = a.y + a.vy * dt;
          if (Math.hypot(nx - a.homeX, ny - a.homeY) < 95) {
            a.x = nx;
            a.y = ny;
          } else {
            a.vx *= -1;
            a.vy *= -1;
          }
        }
      }

      // Particles update
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0;
      });

      // Check 4 Corner Street Markers & Relics in active scene
      if (!paused && !tr.active) {
        if (activeScene.id === 'povoado_principal') {
          for (const marker of CORNER_MARKERS) {
            if (
              !curSave.visitedCorners.includes(marker.id) &&
              Math.hypot(
                playerPosRef.current.x - marker.x,
                playerPosRef.current.y - marker.y
              ) < marker.radius
            ) {
              soundEngine.playCollect();
              applyProgressionUpdate((prev) => {
                if (prev.visitedCorners.includes(marker.id)) return prev;
                const updatedCorners = [...prev.visitedCorners, marker.id];
                const completed = [...prev.completedObjectiveIds];
                if (
                  updatedCorners.length >= 4 &&
                  !completed.includes('obj_visit_corners')
                ) {
                  completed.push('obj_visit_corners');
                }
                return {
                  ...prev,
                  xp: prev.xp + 20,
                  visitedCorners: updatedCorners,
                  completedObjectiveIds: completed,
                };
              });
              pushToast(
                'quest',
                `${marker.cornerName} descoberto!`,
                `Acesso à ${marker.streetName}`
              );
            }
          }
        }

        // Check Relic Collection for current scene
        for (const relic of WORLD_RELICS) {
          if (
            relic.sceneId === activeScene.id &&
            !curSave.collectedRelics.includes(relic.id) &&
            Math.hypot(
              playerPosRef.current.x - relic.x,
              playerPosRef.current.y - relic.y
            ) < 34
          ) {
            soundEngine.playCollect();
            spawnBurst(relic.x, relic.y, '#fbbf24', 18);
            applyProgressionUpdate((prev) => {
              if (prev.collectedRelics.includes(relic.id)) return prev;
              return {
                ...prev,
                xp: prev.xp + relic.xpReward,
                collectedRelics: [...prev.collectedRelics, relic.id],
              };
            });
            pushToast('relic', `Relíquia: ${relic.name}`, `+${relic.xpReward} XP`);
          }
        }
      }

      // Filter NPCs, Animals & Relics for current scene
      const sceneNpcs = npcsRef.current.filter((n) => n.sceneId === activeScene.id);
      const sceneAnimals = animalsRef.current.filter(
        (a) => (a.sceneId ?? 'povoado_principal') === activeScene.id
      );
      const sceneRelics = WORLD_RELICS.filter((r) => r.sceneId === activeScene.id);

      // Find nearest interactable
      let bestDist = 74;
      let bestTarget: typeof nearestActionRef.current = null;

      for (const npc of sceneNpcs) {
        const d = Math.hypot(
          playerPosRef.current.x - npc.x,
          playerPosRef.current.y - npc.y
        );
        if (d < bestDist) {
          bestDist = d;
          bestTarget = {
            type: 'npc',
            id: npc.id,
            x: npc.x,
            y: npc.y,
            label: `Conversar com ${npc.name}`,
          };
        }
      }

      // Scene Interactables (Cama, Quadro-Negro, Console de Rádio, etc.)
      for (const item of activeScene.interactables) {
        const d = Math.hypot(
          playerPosRef.current.x - item.x,
          playerPosRef.current.y - item.y
        );
        if (d < item.radius && d < bestDist + 8) {
          bestDist = d;
          bestTarget = {
            type: 'scene_interactable',
            id: item.id,
            x: item.x,
            y: item.y,
            label: item.label,
            interactable: item,
          };
        }
      }

      // Scene Portals (Entrar nas casas, sair de interiores, viajar para outro mapa)
      for (const portal of scenePortals) {
        const d = Math.hypot(
          playerPosRef.current.x - portal.x,
          playerPosRef.current.y - portal.y
        );
        if (d < portal.radius && d < bestDist + 10) {
          bestDist = d;
          bestTarget = {
            type: 'portal',
            id: portal.id,
            x: portal.x,
            y: portal.y,
            label: portal.label,
            portal,
          };
        }
      }

      if (activeScene.id === 'povoado_principal') {
        // Caramelo the dog
        const caramelo = sceneAnimals.find((a) => a.id === 'caramelo');
        if (caramelo) {
          const d = Math.hypot(
            playerPosRef.current.x - caramelo.x,
            playerPosRef.current.y - caramelo.y
          );
          if (d < bestDist) {
            bestDist = d;
            bestTarget = {
              type: 'caramelo',
              id: 'caramelo',
              x: caramelo.x,
              y: caramelo.y,
              label: 'Acariciar Caramelo',
            };
          }
        }

        // Parked carroça
        const dCart = Math.hypot(
          playerPosRef.current.x - PARKED_CARROCA.x,
          playerPosRef.current.y - PARKED_CARROCA.y
        );
        if (dCart < 82 && dCart < bestDist + 10) {
          bestTarget = {
            type: 'carroca',
            id: 'carroca',
            x: PARKED_CARROCA.x,
            y: PARKED_CARROCA.y,
            label: 'Ver Carroça da Família',
          };
        }

        // Radio Tower direct console
        const tower = WORLD_BUILDINGS.find((b) => b.id === 'radio_tower');
        if (tower) {
          const dTower = Math.hypot(
            playerPosRef.current.x - tower.doorX,
            playerPosRef.current.y - tower.doorY
          );
          if (dTower < 78 && dTower < bestDist + 10) {
            bestTarget = {
              type: 'radio_tower',
              id: 'radio_tower',
              x: tower.doorX,
              y: tower.doorY,
              label: 'Usar Torre de Transmissão de Rádio',
            };
          }
        }
      }

      nearestActionRef.current = bestTarget;

      // Compute active objective target (live NPC position & cross-scene portal routing!)
      const curQ = QUESTS[curSave.activeQuestId];
      const nextObj =
        curQ?.objectives.find(
          (o) => !curSave.completedObjectiveIds.includes(o.id)
        ) ?? null;

      const highlightNpcIds: string[] = [];
      let liveObjTarget: { x: number; y: number; label: string } | null = null;
      if (nextObj) {
        let objNpcId: string | null = null;
        if (nextObj.id === 'obj_talk_maria') objNpcId = 'dona_maria';
        if (nextObj.id === 'obj_talk_carmem' || nextObj.id === 'obj_get_vinyl') {
          objNpcId = 'dona_carmem';
        }
        if (nextObj.id === 'obj_talk_pedrinho') objNpcId = 'pedrinho';
        if (
          nextObj.id === 'obj_complete_school_quiz' ||
          nextObj.id === 'obj_invite_school'
        ) {
          objNpcId = 'professora_beatriz';
        }
        if (
          nextObj.id === 'obj_challenge_ze_bola' ||
          nextObj.id === 'obj_win_soccer'
        ) {
          objNpcId = 'ze_bola';
        }
        if (
          nextObj.id === 'obj_meet_geraldo' ||
          nextObj.id === 'obj_tune_radio_storm' ||
          nextObj.id === 'obj_broadcast_festival'
        ) {
          objNpcId = 'seu_geraldo';
        }

        if (objNpcId) {
          highlightNpcIds.push(objNpcId);
        }

        const targetNpc = objNpcId
          ? npcsRef.current.find((n) => n.id === objNpcId)
          : null;
        const targetSceneId: SceneId = targetNpc
          ? targetNpc.sceneId
          : 'povoado_principal';
        const rawTargetX = targetNpc ? targetNpc.x : nextObj.targetX;
        const rawTargetY = targetNpc ? targetNpc.y : nextObj.targetY;

        if (targetSceneId === activeScene.id) {
          liveObjTarget = {
            x: rawTargetX,
            y: rawTargetY,
            label: nextObj.areaName,
          };
        } else {
          const directPortal = findPortalBetween(activeScene.id, targetSceneId);
          const fallbackExit = scenePortals.find(
            (p) => p.toSceneId === 'povoado_principal'
          );
          const guidePortal = directPortal ?? fallbackExit;
          if (guidePortal) {
            liveObjTarget = {
              x: guidePortal.x,
              y: guidePortal.y,
              label: guidePortal.label,
            };
          }
        }
      }

      const lvlInfo = getLevelInfoFromXP(curSave.xp).current;

      // Render 3D scene (Main Village, Interiors, or Sítio da Roça Antiga)
      world3D.renderFrame(
        {
          time: timeSec,
          cameraX: 0,
          cameraY: 0,
          playerX: playerPosRef.current.x,
          playerY: playerPosRef.current.y,
          playerDir: playerPosRef.current.dir,
          isMoving: playerPosRef.current.isMoving,
          stageId: lvlInfo.stageId,
          scene: activeScene,
          portals: scenePortals,
          npcs: sceneNpcs,
          animals: sceneAnimals,
          relics: sceneRelics,
          collectedRelicIds: curSave.collectedRelics,
          particles: particlesRef.current,
          highlightNpcIds,
          nearestInteractable: bestTarget
            ? { x: bestTarget.x, y: bestTarget.y, label: bestTarget.label }
            : null,
          objectiveTarget: liveObjTarget,
          radioBroadcasting: curSave.radioMissionsDone > 0,
          festivalMode: curSave.completedQuestIds.includes('q5_festival'),
          worldHour: worldHourRef.current,
          weather: weatherRef.current,
          weatherIntensity: weatherIntensityRef.current,
          transitionAlpha: tr.active ? tr.alpha : 0,
        },
        dt
      );

      // Update transition curtain opacity & offscreen objective compass arrow smoothly via refs
      if (transitionFadeRef.current) {
        transitionFadeRef.current.style.opacity = tr.active ? String(Math.min(1, tr.alpha)) : '0';
      }
      if (compassArrowRef.current) {
        const proj = liveObjTarget
          ? world3D.getObjectiveCompassProjection(liveObjTarget.x, liveObjTarget.y)
          : null;
        if (proj && proj.visible) {
          compassArrowRef.current.style.opacity = '1';
          compassArrowRef.current.style.transform = `translate3d(${proj.edgeX}px, ${proj.edgeY}px, 0) translate(-50%, -50%) rotate(${proj.angleRad}rad)`;
        } else {
          compassArrowRef.current.style.opacity = '0';
        }
      }

      // Periodically sync HUD snapshot & persist position/hour
      hudSyncAcc += dt;
      if (hudSyncAcc > 0.16) {
        hudSyncAcc = 0;
        const areaName =
          activeScene.id === 'povoado_principal'
            ? getAreaNameAt(playerPosRef.current.x, playerPosRef.current.y)
            : activeScene.kind === 'interior'
            ? `${activeScene.name} · Interior`
            : activeScene.name;
        const distMeters = liveObjTarget
          ? Math.round(
              Math.hypot(
                liveObjTarget.x - playerPosRef.current.x,
                liveObjTarget.y - playerPosRef.current.y
              ) / 14
            )
          : null;
        const promptText = bestTarget ? bestTarget.label : null;
        const roundedDisplayHour = Math.round(worldHourRef.current * 12) / 12;
        const currentWeather = weatherRef.current;

        setHudLive((prev) => {
          if (
            prev.areaName === areaName &&
            prev.nearestPrompt === promptText &&
            prev.objectiveDistanceMeters === distMeters &&
            prev.worldHour === roundedDisplayHour &&
            prev.weather === currentWeather
          ) {
            return prev;
          }
          return {
            areaName,
            nearestPrompt: promptText,
            objectiveDistanceMeters: distMeters,
            worldHour: roundedDisplayHour,
            weather: currentWeather,
          };
        });

        // Keep save position & clock fresh gently
        const hourDelta = Math.abs(worldHourRef.current - curSave.worldHour);
        if (
          Math.hypot(
            playerPosRef.current.x - curSave.playerX,
            playerPosRef.current.y - curSave.playerY
          ) > 45 ||
          hourDelta > 0.25
        ) {
          setSave((prev) => ({
            ...prev,
            playerX: Math.round(playerPosRef.current.x),
            playerY: Math.round(playerPosRef.current.y),
            worldHour: Number(worldHourRef.current.toFixed(2)),
          }));
        }
      }

      world3D.scheduleNextFrame(tick);
    };

    world3D.scheduleNextFrame(tick);
    return () => {
      stopped = true;
      world3DRef.current = null;
      soundEngine.updateAmbience(0.05, {
        active: false,
        worldHour: worldHourRef.current,
        weather: weatherRef.current,
        weatherIntensity: 0,
        isInterior: false,
      });
      world3D.dispose();
    };
  }, [screen, applyProgressionUpdate, pushToast, spawnBurst]);

  // Handlers
  const handleStartNew = () => {
    soundEngine.playSelect();
    const fresh = createInitialSave(save.muted);
    setSave(fresh);
    currentSceneIdRef.current = fresh.currentSceneId;
    transitionRef.current = { active: false, phase: 'out', alpha: 0, portal: null };
    worldHourRef.current = fresh.worldHour;
    hourAdvanceAnimRef.current = 0;
    weatherRef.current = fresh.weather;
    weatherIntensityRef.current = 1;
    weatherTimerRef.current = 12 + Math.random() * 10;
    npcsRef.current = INITIAL_NPCS.map((n) => ({ ...n, isMoving: false }));
    npcRoutineStateRef.current = {};
    playerPosRef.current = {
      x: fresh.playerX,
      y: fresh.playerY,
      dir: 'down',
      isMoving: false,
    };
    setActiveDialogue(null);
    setActiveMiniGame(null);
    setActiveModal(null);
    setScreen('PROLOGUE');
  };

  const handleContinue = () => {
    soundEngine.playSelect();
    currentSceneIdRef.current = save.currentSceneId;
    transitionRef.current = { active: false, phase: 'out', alpha: 0, portal: null };
    worldHourRef.current = save.worldHour;
    hourAdvanceAnimRef.current = 0;
    weatherRef.current = save.weather;
    weatherIntensityRef.current = 1;
    npcsRef.current = INITIAL_NPCS.map((n) => ({ ...n, isMoving: false }));
    npcRoutineStateRef.current = {};
    playerPosRef.current = {
      x: save.playerX,
      y: save.playerY,
      dir: 'down',
      isMoving: false,
    };
    setScreen('PLAYING');
  };

  const handlePrologueComplete = () => {
    applyProgressionUpdate((prev) => {
      const unlocked = prev.unlockedAchievements.includes('ach_carroca')
        ? prev.unlockedAchievements
        : [...prev.unlockedAchievements, 'ach_carroca' as AchievementId];
      return {
        ...prev,
        hasSeenPrologue: true,
        xp: prev.xp + 30,
        unlockedAchievements: unlocked,
      };
    });
    soundEngine.playAchievement();
    pushToast('achievement', 'Conquista: Pé na Estrada', 'Chegou de carroça a Povoado Barriga! +30 XP');
    setScreen('PLAYING');
  };

  const handleDialogueChoice = (choice: DialogueChoice) => {
    if (choice.xpGain || choice.coinGain || choice.statGain || choice.completeObjectiveId || choice.advanceFlag) {
      applyProgressionUpdate((prev) => {
        const nextStats = { ...prev.stats };
        if (choice.statGain) {
          (Object.keys(choice.statGain) as (keyof PlayerStats)[]).forEach((k) => {
            nextStats[k] += choice.statGain?.[k] ?? 0;
          });
        }
        const completed =
          choice.completeObjectiveId &&
          !prev.completedObjectiveIds.includes(choice.completeObjectiveId)
            ? [...prev.completedObjectiveIds, choice.completeObjectiveId]
            : prev.completedObjectiveIds;

        const flags = choice.advanceFlag
          ? { ...prev.storyFlags, [choice.advanceFlag]: true }
          : prev.storyFlags;

        return {
          ...prev,
          xp: prev.xp + (choice.xpGain ?? 0),
          coins: prev.coins + (choice.coinGain ?? 0),
          stats: nextStats,
          completedObjectiveIds: completed,
          storyFlags: flags,
        };
      });
    }

    if (choice.closeAfter) {
      setActiveDialogue(null);
    }
    if (choice.triggerMiniGame) {
      setActiveMiniGame(choice.triggerMiniGame);
    }
  };

  const handleMiniGameComplete = (res: MiniGameResult) => {
    setActiveMiniGame(null);

    if (res.game === 'SCHOOL_QUIZ') {
      if (res.won) {
        soundEngine.playCollect();
        applyProgressionUpdate((prev) => {
          const completed = prev.completedObjectiveIds.includes('obj_complete_school_quiz')
            ? prev.completedObjectiveIds
            : [...prev.completedObjectiveIds, 'obj_complete_school_quiz'];
          const achs = prev.unlockedAchievements.includes('ach_escola')
            ? prev.unlockedAchievements
            : [...prev.unlockedAchievements, 'ach_escola' as AchievementId];
          return {
            ...prev,
            xp: prev.xp + 55 + (res.perfect ? 25 : 0),
            coins: prev.coins + 20,
            stats: { ...prev.stats, sabedoria: prev.stats.sabedoria + 1 },
            completedObjectiveIds: completed,
            unlockedAchievements: achs,
          };
        });
        pushToast('quest', 'Gincana da Escola Vencida!', `Você acertou ${res.score}/4 questões!`);
      } else {
        pushToast('quest', 'Quase lá na Gincana!', 'Tente acertar pelo menos 2 questões.');
      }
    } else if (res.game === 'SOCCER_PENALTY') {
      if (res.won) {
        soundEngine.playGoal();
        applyProgressionUpdate((prev) => {
          const completed = prev.completedObjectiveIds.includes('obj_win_soccer')
            ? prev.completedObjectiveIds
            : [...prev.completedObjectiveIds, 'obj_win_soccer'];
          const achs = prev.unlockedAchievements.includes('ach_futebol')
            ? prev.unlockedAchievements
            : [...prev.unlockedAchievements, 'ach_futebol' as AchievementId];
          return {
            ...prev,
            xp: prev.xp + 65 + res.score * 6,
            coins: prev.coins + 25,
            bestSoccerScore: Math.max(prev.bestSoccerScore, res.score),
            stats: { ...prev.stats, agilidade: prev.stats.agilidade + 1 },
            completedObjectiveIds: completed,
            unlockedAchievements: achs,
          };
        });
        pushToast('quest', 'Vitória no Campo de Barriga!', `Você marcou ${res.score} gols em Vitor!`);
      } else {
        pushToast('quest', 'Vitor defendeu bem!', `Você marcou ${res.score}/5. Precisa de 3 gols para vencer.`);
      }
    } else if (res.game === 'RADIO_TUNER') {
      soundEngine.playRadioTune(true);
      applyProgressionUpdate((prev) => {
        const completed = [...prev.completedObjectiveIds];
        if (
          prev.activeQuestId === 'q4_torre_radio' &&
          !completed.includes('obj_tune_radio_storm')
        ) {
          completed.push('obj_tune_radio_storm');
        }
        if (
          prev.activeQuestId === 'q5_festival' &&
          prev.completedObjectiveIds.includes('obj_get_vinyl') &&
          prev.completedObjectiveIds.includes('obj_invite_school') &&
          !completed.includes('obj_broadcast_festival')
        ) {
          completed.push('obj_broadcast_festival');
        }
        return {
          ...prev,
          xp: prev.xp + 75 + (res.perfect ? 20 : 0),
          coins: prev.coins + 30,
          radioMissionsDone: prev.radioMissionsDone + 1,
          stats: { ...prev.stats, carisma: prev.stats.carisma + 1 },
          completedObjectiveIds: completed,
        };
      });
      pushToast('quest', 'Transmissão Concluída!', 'O sinal da Torre alcançou todo o Povoado Barriga!');
    } else if (res.game === 'CHICKEN_HERD') {
      if (res.won) {
        soundEngine.playCollect();
        applyProgressionUpdate((prev) => ({
          ...prev,
          xp: prev.xp + 50,
          coins: prev.coins + 25,
          chickensRescued: prev.chickensRescued + res.score,
          stats: { ...prev.stats, agilidade: prev.stats.agilidade + 1 },
        }));
        pushToast('quest', 'Galinhas Recolhidas!', `Seu Chico agradece (${res.score}/6)! +50 XP`);
      } else {
        pushToast('quest', 'Elas escaparam!', 'Recolha pelo menos 4 galinhas para ajudar Seu Chico.');
      }
    }
  };

  const currentQuest = QUESTS[save.activeQuestId];
  const nextObjective =
    currentQuest?.objectives.find(
      (o) => !save.completedObjectiveIds.includes(o.id)
    ) ?? null;

  const isFestivalBroadcastReady =
    save.activeQuestId === 'q5_festival' &&
    save.completedObjectiveIds.includes('obj_get_vinyl') &&
    save.completedObjectiveIds.includes('obj_invite_school');

  const savedLevelInfo = getLevelInfoFromXP(save.xp).current;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1b1612]">
      {screen === 'TITLE' && (
        <TitleScreen
          hasSave={hasExistingSave}
          savedLevel={savedLevelInfo.level}
          savedAge={savedLevelInfo.age}
          muted={save.muted}
          onToggleMute={() =>
            setSave((prev) => ({ ...prev, muted: !prev.muted }))
          }
          onStartNew={handleStartNew}
          onContinue={handleContinue}
        />
      )}

      {screen === 'PROLOGUE' && (
        <PrologueCutscene onComplete={handlePrologueComplete} />
      )}

      {(screen === 'PLAYING' || screen === 'PAUSED' || screen === 'VICTORY') && (
        <>
          <div
            ref={threeMountRef}
            className="w-full h-full block touch-none"
          />

          {/* Offscreen objective compass pointer */}
          <div
            ref={compassArrowRef}
            aria-hidden="true"
            className="pointer-events-none fixed top-0 left-0 z-10 opacity-0 transition-opacity duration-150"
          >
            <svg width="28" height="28" viewBox="-14 -14 28 28">
              <polygon
                points="12,0 -9,-8 -5,0 -9,8"
                fill="#f59e0b"
                stroke="#1b1612"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Scene transition fade curtain */}
          <div
            ref={transitionFadeRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-30 bg-[#120d09] opacity-0"
          />

          <GameHUD
            xp={save.xp}
            coins={save.coins}
            stats={save.stats}
            relicsCount={save.collectedRelics.length}
            totalRelics={WORLD_RELICS.length}
            areaName={hudLive.areaName}
            questChapter={
              save.completedQuestIds.includes('q5_festival')
                ? 'Epílogo'
                : currentQuest.chapterLabel
            }
            questTitle={
              save.completedQuestIds.includes('q5_festival')
                ? 'Modo Livre · Lenda do Povoado'
                : currentQuest.title
            }
            objectiveText={
              nextObjective
                ? nextObjective.description
                : 'Explore livremente, entre nas casas, encontre relíquias e faça missões!'
            }
            objectiveDistanceMeters={hudLive.objectiveDistanceMeters}
            unlockedCount={save.unlockedAchievements.length}
            totalAchievements={ACHIEVEMENTS.length}
            muted={save.muted}
            showTouchControls={showTouchControls}
            nearestPrompt={hudLive.nearestPrompt}
            onInteract={handleInteract}
            onJoystickMove={(dx, dy) => {
              joystickRef.current = { dx, dy };
            }}
            onTouchRunChange={(running) => {
              touchRunRef.current = running;
            }}
            onOpenJournal={() => {
              soundEngine.playSelect();
              setActiveModal('journal');
            }}
            onOpenAchievements={() => {
              soundEngine.playSelect();
              setActiveModal('achievements');
            }}
            onOpenMap={() => {
              soundEngine.playSelect();
              setActiveModal('map');
            }}
            onToggleMute={() =>
              setSave((prev) => ({ ...prev, muted: !prev.muted }))
            }
            onToggleTouchControls={() => setShowTouchControls((v) => !v)}
            onPause={() => {
              soundEngine.playSelect();
              setScreen('PAUSED');
            }}
            worldHour={hudLive.worldHour}
            onAdvanceTime={() => {
              soundEngine.playSelect();
              hourAdvanceAnimRef.current += 4;
            }}
            weather={hudLive.weather}
            onCycleWeather={() => {
              soundEngine.playSelect();
              const order: WeatherType[] = ['CLEAR', 'CLOUDY', 'RAINY'];
              const nextWeather =
                order[(order.indexOf(weatherRef.current) + 1) % order.length];
              weatherRef.current = nextWeather;
              weatherIntensityRef.current = 0.2;
              weatherTimerRef.current = 12 + Math.random() * 10;
              setHudLive((prev) => ({ ...prev, weather: nextWeather }));
              setSave((prev) => ({ ...prev, weather: nextWeather }));
            }}
          />
        </>
      )}

      {activeDialogue && (
        <DialogueBox
          lines={activeDialogue}
          onChoice={handleDialogueChoice}
          onClose={() => setActiveDialogue(null)}
        />
      )}

      {activeMiniGame && (
        <MiniGameModal
          game={activeMiniGame}
          isFestivalBroadcast={isFestivalBroadcastReady}
          onComplete={handleMiniGameComplete}
          onCancel={() => setActiveMiniGame(null)}
        />
      )}

      {activeModal === 'journal' && (
        <JournalModal save={save} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'achievements' && (
        <AchievementsModal save={save} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'map' && (
        <WorldMapModal
          save={{
            ...save,
            playerX: playerPosRef.current.x,
            playerY: playerPosRef.current.y,
          }}
          sceneName={getSceneById(save.currentSceneId).name}
          isInterior={getSceneById(save.currentSceneId).kind === 'interior'}
          objectiveTarget={
            nextObjective
              ? { x: nextObjective.targetX, y: nextObjective.targetY }
              : null
          }
          onFastTravelPlaza={() => {
            currentSceneIdRef.current = 'povoado_principal';
            playerPosRef.current = {
              x: 1155,
              y: 855,
              dir: 'down',
              isMoving: false,
            };
            world3DRef.current?.snapCameraToPlayer(1155, 855, 'povoado_principal');
            setSave((prev) => ({
              ...prev,
              currentSceneId: 'povoado_principal',
              playerX: 1155,
              playerY: 855,
              lastOutdoorX: 1155,
              lastOutdoorY: 855,
            }));
            pushToast('quest', 'De volta à Praça Central', 'Em frente à Casa do Cleilson.');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {screen === 'PAUSED' && (
        <PauseModal
          onResume={() => setScreen('PLAYING')}
          onRestart={handleStartNew}
          onQuitToTitle={() => setScreen('TITLE')}
        />
      )}

      {screen === 'VICTORY' && (
        <VictoryModal
          save={save}
          onKeepExploring={() => setScreen('PLAYING')}
          onRestart={handleStartNew}
        />
      )}

      <ToastOverlay toasts={toasts} />
    </div>
  );
}
