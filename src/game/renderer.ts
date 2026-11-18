import {
  CollectibleRelic,
  InteractiveNPC,
  LifeStageId,
  Particle,
  RoamingAnimal,
  SceneDefinition,
  SceneFurniture,
  ScenePortal,
  WeatherType,
  WorldBuilding,
} from './types';
import {
  PARKED_CARROCA,
  PLAZA_FOUNTAIN,
  PLAZA_RECT,
  SOCCER_FIELD_RECT,
  VILLAGE_WELL,
  WORLD_BUILDINGS,
  WORLD_HEIGHT,
  WORLD_ROADS,
  WORLD_TREES,
  WORLD_WIDTH,
  WorldTree,
} from './worldData';

export interface RenderFrameState {
  time: number;
  cameraX: number;
  cameraY: number;
  playerX: number;
  playerY: number;
  playerDir: 'down' | 'up' | 'left' | 'right';
  isMoving: boolean;
  stageId: LifeStageId;
  scene: SceneDefinition;
  portals: ScenePortal[];
  npcs: InteractiveNPC[];
  animals: RoamingAnimal[];
  relics: CollectibleRelic[];
  collectedRelicIds: string[];
  particles: Particle[];
  highlightNpcIds: string[];
  nearestInteractable: { x: number; y: number; label: string } | null;
  objectiveTarget: { x: number; y: number; label: string } | null;
  radioBroadcasting: boolean;
  festivalMode: boolean;
  worldHour: number;
  weather: WeatherType;
  weatherIntensity: number; // 0..1 smooth blend
  transitionAlpha?: number;
}

export function getWeatherLabel(weather: WeatherType): string {
  switch (weather) {
    case 'CLOUDY':
      return 'Nublado';
    case 'RAINY':
      return 'Chuvoso';
    case 'CLEAR':
    default:
      return 'Céu Limpo';
  }
}

export interface DaylightPhaseInfo {
  label: string;
  phaseKey: 'dawn' | 'day' | 'dusk' | 'night';
  nightFactor: number; // 0 = bright noon, 1 = deep night
  duskFactor: number; // 0..1 peak at dawn/sunset
  ambientRgba: string;
}

export function getDaylightPhaseInfo(worldHour: number): DaylightPhaseInfo {
  const h = ((worldHour % 24) + 24) % 24;

  // 05:45 - 07:00 Amanhecer (transição mais ágil)
  if (h >= 5.75 && h < 7.0) {
    const t = (h - 5.75) / 1.25; // 0 -> 1
    const nightFactor = (1 - t) * 0.72;
    const duskFactor = Math.sin(t * Math.PI);
    const r = Math.round(18 + duskFactor * 165);
    const g = Math.round(22 + duskFactor * 85);
    const b = Math.round(52 + duskFactor * 30);
    const a = Number((0.12 + nightFactor * 0.65).toFixed(3));
    return {
      label: 'Amanhecer',
      phaseKey: 'dawn',
      nightFactor,
      duskFactor,
      ambientRgba: `rgba(${r}, ${g}, ${b}, ${a})`,
    };
  }

  // 07:00 - 17:00 Dia
  if (h >= 7.0 && h < 17.0) {
    return {
      label: h < 12 ? 'Manhã' : 'Tarde',
      phaseKey: 'day',
      nightFactor: 0,
      duskFactor: 0,
      ambientRgba: 'rgba(0, 0, 0, 0)',
    };
  }

  // 17:00 - 18:45 Entardecer -> Anoitecer (transição mais ágil)
  if (h >= 17.0 && h < 18.75) {
    const t = (h - 17.0) / 1.75; // 0 -> 1
    const nightFactor = Math.pow(t, 1.25) * 0.92;
    const duskFactor = Math.sin(t * Math.PI);
    const r = Math.round(185 * duskFactor + 10 * (1 - duskFactor));
    const g = Math.round(82 * duskFactor + 15 * (1 - duskFactor));
    const b = Math.round(24 * duskFactor + 42 * (1 - duskFactor));
    const a = Number((0.26 * duskFactor + nightFactor * 0.74).toFixed(3));
    return {
      label: 'Entardecer',
      phaseKey: 'dusk',
      nightFactor,
      duskFactor,
      ambientRgba: `rgba(${r}, ${g}, ${b}, ${a})`,
    };
  }

  // 18:45 - 05:45 Noite
  return {
    label: 'Noite',
    phaseKey: 'night',
    nightFactor: 1,
    duskFactor: 0,
    ambientRgba: 'rgba(10, 14, 34, 0.80)',
  };
}

// Street lamp positions illuminating the Praça Central & main doorways
const STREET_LANTERNS = [
  { x: 960, y: 840, radius: 145 },
  { x: 1440, y: 840, radius: 145 },
  { x: 960, y: 1260, radius: 145 },
  { x: 1440, y: 1260, radius: 145 },
  { x: 1200, y: 1050, radius: 160 }, // Fountain ambient glow
  { x: 1155, y: 785, radius: 135 }, // Casa do Cleilson porch
  { x: 470, y: 390, radius: 125 }, // Escola entrance
  { x: 650, y: 1485, radius: 135 }, // Mercearia porch
  { x: 1770, y: 1730, radius: 115 }, // Oficina do Seu Chico
  { x: 3195, y: 1020, radius: 150 }, // Estação de Rádio
];

let cachedLightCanvas: HTMLCanvasElement | null = null;

const GRASS_TUFTS = (() => {
  const list: { x: number; y: number; kind: number }[] = [];
  for (let i = 0; i < 360; i++) {
    const x = ((i * 7919) % (WORLD_WIDTH - 120)) + 60;
    const y = ((i * 6271) % (WORLD_HEIGHT - 120)) + 60;
    list.push({ x, y, kind: i % 4 });
  }
  return list;
})();

export function renderScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderFrameState
) {
  if (state.scene.id === 'povoado_principal') {
    renderWorld(ctx, width, height, state);
  } else {
    renderCustomScene(ctx, width, height, state);
  }

  if (state.transitionAlpha && state.transitionAlpha > 0.01) {
    ctx.save();
    ctx.fillStyle = `rgba(18, 13, 9, ${Math.min(1, state.transitionAlpha).toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderFrameState
) {
  ctx.save();

  // Base meadow ground
  ctx.fillStyle = '#5c8f47';
  ctx.fillRect(0, 0, width, height);

  ctx.translate(-Math.round(state.cameraX), -Math.round(state.cameraY));

  // Soft countryside terrain patches
  ctx.fillStyle = '#53833f';
  for (let gx = 0; gx < WORLD_WIDTH; gx += 320) {
    for (let gy = 0; gy < WORLD_HEIGHT; gy += 320) {
      if ((gx + gy) % 640 === 0) {
        ctx.fillRect(gx, gy, 320, 320);
      }
    }
  }

  // Grass tufts & wildflowers in view
  const viewLeft = state.cameraX - 80;
  const viewRight = state.cameraX + width + 80;
  const viewTop = state.cameraY - 80;
  const viewBottom = state.cameraY + height + 80;

  for (const tuft of GRASS_TUFTS) {
    if (
      tuft.x < viewLeft ||
      tuft.x > viewRight ||
      tuft.y < viewTop ||
      tuft.y > viewBottom
    ) {
      continue;
    }
    if (tuft.kind === 0) {
      ctx.fillStyle = '#6ba353';
      ctx.fillRect(tuft.x, tuft.y, 4, 8);
      ctx.fillRect(tuft.x + 5, tuft.y + 2, 4, 6);
    } else if (tuft.kind === 1) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(tuft.x, tuft.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (tuft.kind === 2) {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(tuft.x, tuft.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#477635';
      ctx.fillRect(tuft.x, tuft.y, 6, 3);
    }
  }

  // Draw roads radiating from Praça
  for (const road of WORLD_ROADS) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Dirt shoulder / border
    ctx.strokeStyle = '#9c7853';
    ctx.lineWidth = road.width + 14;
    ctx.beginPath();
    road.points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Main dirt surface
    ctx.strokeStyle = '#c89f72';
    ctx.lineWidth = road.width;
    ctx.beginPath();
    road.points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Subtle cart track inner lines
    ctx.strokeStyle = 'rgba(130, 92, 54, 0.25)';
    ctx.lineWidth = road.width * 0.45;
    ctx.beginPath();
    road.points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();
  }

  // Draw Praça Central cobblestones
  drawPlaza(ctx, state.time, state.festivalMode);

  // Draw Soccer Field
  drawSoccerField(ctx);

  // Draw Parked Family Carroça & Village Well
  drawCarroca(ctx, PARKED_CARROCA.x, PARKED_CARROCA.y, 0);
  drawVillageWell(ctx, VILLAGE_WELL.x, VILLAGE_WELL.y);

  // Draw Street Signposts around Praça
  drawSignpost(ctx, 885, 765, '↖ Escola');
  drawSignpost(ctx, 1515, 765, '↗ Campo');
  drawSignpost(ctx, 885, 1345, '↙ Roça / Mercearia');
  drawSignpost(ctx, 1515, 1345, '↘ Vila Sul');
  drawSignpost(ctx, 1535, 1000, '→ Torre de Rádio');
  drawSignpost(ctx, 155, 1845, '↙ Sítio da Roça Antiga');

  // Portal mats / travel markers
  for (const portal of state.portals) {
    drawPortalMarker(ctx, portal, state.time);
  }

  // Collectible Relics
  for (const relic of state.relics) {
    if (state.collectedRelicIds.includes(relic.id)) continue;
    drawRelic(ctx, relic, state.time);
  }

  // Y-sorted entities (buildings, trees, NPCs, animals, player)
  interface Drawable {
    sortY: number;
    draw: () => void;
  }
  const drawables: Drawable[] = [];

  const dayInfo = getDaylightPhaseInfo(state.worldHour);

  for (const b of WORLD_BUILDINGS) {
    drawables.push({
      sortY: b.y + b.height,
      draw: () =>
        drawBuilding(
          ctx,
          b,
          state.time,
          state.radioBroadcasting,
          dayInfo.nightFactor
        ),
    });
  }

  for (const t of WORLD_TREES) {
    drawables.push({
      sortY: t.y + 12,
      draw: () => drawTree(ctx, t, state.time),
    });
  }

  // Street lantern posts in world space
  for (let i = 0; i < 4; i++) {
    const lamp = STREET_LANTERNS[i];
    drawables.push({
      sortY: lamp.y + 4,
      draw: () => drawLanternPost(ctx, lamp.x, lamp.y, dayInfo.nightFactor),
    });
  }

  for (const animal of state.animals) {
    drawables.push({
      sortY: animal.y,
      draw: () => drawAnimal(ctx, animal, state.time),
    });
  }

  for (const npc of state.npcs) {
    const hasQuest = state.highlightNpcIds.includes(npc.id);
    drawables.push({
      sortY: npc.y,
      draw: () => drawNPC(ctx, npc, hasQuest, state.time),
    });
  }

  drawables.push({
    sortY: state.playerY,
    draw: () =>
      drawCleilson(
        ctx,
        state.playerX,
        state.playerY,
        state.playerDir,
        state.isMoving,
        state.stageId,
        state.time,
        dayInfo.nightFactor
      ),
  });

  drawables.sort((a, b) => a.sortY - b.sortY);
  for (const item of drawables) {
    item.draw();
  }

  // Drifting rural fireflies at dusk & night
  if (dayInfo.nightFactor > 0.35) {
    drawFireflies(
      ctx,
      state.time,
      viewLeft,
      viewRight,
      viewTop,
      viewBottom,
      dayInfo.nightFactor
    );
  }

  // Particles
  for (const p of state.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Nearest interactable ring on ground
  if (state.nearestInteractable) {
    const pulse = 1 + Math.sin(state.time * 6) * 0.08;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(
      state.nearestInteractable.x,
      state.nearestInteractable.y + 6,
      26 * pulse,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  ctx.restore();

  // Dynamic Weather Effects (Cloud Shadows, Sun Motes, Overcast Wash, Rain & Splashes)
  drawWeatherEffects(ctx, width, height, state, dayInfo);

  // Dynamic Day/Night Lighting & Visibility Mask Overlay
  if (dayInfo.nightFactor > 0.02 || dayInfo.duskFactor > 0.02) {
    applyDayNightLighting(ctx, width, height, state, dayInfo);
  }

  // Screen-space objective compass arrow if target is outside camera view
  drawObjectiveCompassArrow(ctx, width, height, state);
}

function drawObjectiveCompassArrow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderFrameState
) {
  if (!state.objectiveTarget) return;
  const screenX = state.objectiveTarget.x - state.cameraX;
  const screenY = state.objectiveTarget.y - state.cameraY;
  const margin = 56;
  if (
    screenX < margin ||
    screenX > width - margin ||
    screenY < margin ||
    screenY > height - margin
  ) {
    const cx = width / 2;
    const cy = height / 2;
    const angle = Math.atan2(screenY - cy, screenX - cx);
    const edgeX = Math.max(margin, Math.min(width - margin, screenX));
    const edgeY = Math.max(margin + 30, Math.min(height - margin - 20, screenY));

    ctx.save();
    ctx.translate(edgeX, edgeY);
    ctx.rotate(angle);
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#1b1612';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawPortalMarker(
  ctx: CanvasRenderingContext2D,
  portal: ScenePortal,
  time: number
) {
  const pulse = 0.75 + Math.sin(time * 4 + portal.x * 0.01) * 0.25;
  if (portal.kind === 'door') {
    ctx.save();
    ctx.fillStyle = `rgba(251, 191, 36, ${(0.22 * pulse).toFixed(2)})`;
    ctx.strokeStyle = `rgba(253, 224, 71, ${(0.65 * pulse).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(portal.x, portal.y + 8, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (portal.kind === 'exit') {
    ctx.save();
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(portal.x - 36, portal.y - 12, 72, 24, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAÍDA', portal.x, portal.y + 4);
    ctx.textAlign = 'left';
    ctx.restore();
  } else {
    // Road transition portal
    ctx.save();
    ctx.fillStyle = `rgba(245, 158, 11, ${(0.25 * pulse).toFixed(2)})`;
    ctx.strokeStyle = `rgba(253, 224, 71, ${(0.85 * pulse).toFixed(2)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(portal.x, portal.y, 34, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fffbeb';
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(portal.label, portal.x, portal.y - 28);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}

function renderCustomScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderFrameState
) {
  const { scene } = state;
  const isInterior = scene.kind === 'interior';
  const dayInfo = getDaylightPhaseInfo(state.worldHour);

  ctx.save();
  ctx.fillStyle = isInterior ? '#140e09' : '#4b7b3b';
  ctx.fillRect(0, 0, width, height);

  ctx.translate(-Math.round(state.cameraX), -Math.round(state.cameraY));

  if (isInterior) {
    // Interior Room Shell & Floor
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(14, 14, scene.width, scene.height);

    // Base floor
    if (scene.floorTheme === 'wood' || scene.floorTheme === 'workshop') {
      ctx.fillStyle = scene.floorTheme === 'workshop' ? '#8c6239' : '#a67449';
      ctx.fillRect(0, 0, scene.width, scene.height);
      ctx.strokeStyle = 'rgba(72, 42, 18, 0.25)';
      ctx.lineWidth = 1.5;
      for (let py = 80; py < scene.height; py += 26) {
        ctx.beginPath();
        ctx.moveTo(20, py);
        ctx.lineTo(scene.width - 20, py);
        ctx.stroke();
      }
    } else if (scene.floorTheme === 'studio') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, scene.width, scene.height);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 1;
      for (let tx = 20; tx < scene.width - 20; tx += 40) {
        for (let ty = 80; ty < scene.height - 20; ty += 40) {
          if (((tx + ty) / 40) % 2 === 0) {
            ctx.fillStyle = '#3b4a61';
            ctx.fillRect(tx, ty, 40, 40);
          }
        }
      }
    } else {
      ctx.fillStyle = '#dfd2bc';
      ctx.fillRect(0, 0, scene.width, scene.height);
      for (let tx = 20; tx < scene.width - 20; tx += 44) {
        for (let ty = 80; ty < scene.height - 20; ty += 44) {
          if (((tx / 44 + ty / 44) | 0) % 2 === 0) {
            ctx.fillStyle = '#d2c1a6';
            ctx.fillRect(tx, ty, 44, 44);
          }
        }
      }
    }

    // Back Wall & Trim
    ctx.fillStyle = scene.wallColor ?? '#eadbc0';
    ctx.fillRect(0, 0, scene.width, 84);
    ctx.fillStyle = scene.trimColor ?? '#6f4225';
    ctx.fillRect(0, 78, scene.width, 8);

    // Outer room perimeter border
    ctx.strokeStyle = scene.trimColor ?? '#6f4225';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, scene.width - 14, scene.height - 14);

    // Wall windows showing outside sky / night tone
    const winColor =
      dayInfo.phaseKey === 'night'
        ? '#1e293b'
        : dayInfo.phaseKey === 'dusk' || dayInfo.phaseKey === 'dawn'
        ? '#fb923c'
        : '#bae6fd';
    for (const wx of [140, scene.width - 210]) {
      ctx.fillStyle = winColor;
      ctx.fillRect(wx, 20, 70, 42);
      ctx.strokeStyle = scene.trimColor ?? '#6f4225';
      ctx.lineWidth = 3;
      ctx.strokeRect(wx, 20, 70, 42);
      ctx.beginPath();
      ctx.moveTo(wx + 35, 20);
      ctx.lineTo(wx + 35, 62);
      ctx.stroke();
    }
  } else {
    // Outdoor Expansion Map (e.g., Sítio da Roça Antiga)
    ctx.fillStyle = '#538641';
    ctx.fillRect(0, 0, scene.width, scene.height);

    // Subtle field patches
    ctx.fillStyle = '#4a7a39';
    for (let gx = 0; gx < scene.width; gx += 240) {
      for (let gy = 0; gy < scene.height; gy += 240) {
        if ((gx + gy) % 480 === 0) ctx.fillRect(gx, gy, 240, 240);
      }
    }

    // Dirt road across the farm leading east back to Povoado Barriga
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#9c7853';
    ctx.lineWidth = 84;
    ctx.beginPath();
    ctx.moveTo(370, 450);
    ctx.lineTo(740, 500);
    ctx.lineTo(1385, 500);
    ctx.stroke();

    ctx.strokeStyle = '#c89f72';
    ctx.lineWidth = 68;
    ctx.beginPath();
    ctx.moveTo(370, 450);
    ctx.lineTo(740, 500);
    ctx.lineTo(1385, 500);
    ctx.stroke();
  }

  // Flat floor/ground furniture first (rugs, creek)
  for (const item of scene.furniture) {
    if (item.kind === 'rug' || item.kind === 'creek_bridge') {
      drawSceneFurniture(ctx, item, state.time);
    }
  }

  // Portals
  for (const portal of state.portals) {
    drawPortalMarker(ctx, portal, state.time);
  }

  // Relics in this scene
  for (const relic of state.relics) {
    if (state.collectedRelicIds.includes(relic.id)) continue;
    drawRelic(ctx, relic, state.time);
  }

  // Y-sorted furniture, trees, animals, NPCs, Cleilson
  interface Drawable {
    sortY: number;
    draw: () => void;
  }
  const drawables: Drawable[] = [];

  for (const item of scene.furniture) {
    if (item.kind === 'rug' || item.kind === 'creek_bridge') continue;
    drawables.push({
      sortY: item.y + item.height,
      draw: () => drawSceneFurniture(ctx, item, state.time),
    });
  }

  if (scene.trees) {
    for (const t of scene.trees) {
      drawables.push({
        sortY: t.y + 12,
        draw: () => drawTree(ctx, t, state.time),
      });
    }
  }

  for (const animal of state.animals) {
    drawables.push({
      sortY: animal.y,
      draw: () => drawAnimal(ctx, animal, state.time),
    });
  }

  for (const npc of state.npcs) {
    const hasQuest = state.highlightNpcIds.includes(npc.id);
    drawables.push({
      sortY: npc.y,
      draw: () => drawNPC(ctx, npc, hasQuest, state.time),
    });
  }

  drawables.push({
    sortY: state.playerY,
    draw: () =>
      drawCleilson(
        ctx,
        state.playerX,
        state.playerY,
        state.playerDir,
        state.isMoving,
        state.stageId,
        state.time,
        isInterior ? 0 : dayInfo.nightFactor
      ),
  });

  drawables.sort((a, b) => a.sortY - b.sortY);
  for (const d of drawables) {
    d.draw();
  }

  // Particles
  for (const p of state.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Nearest interactable ring
  if (state.nearestInteractable) {
    const pulse = 1 + Math.sin(state.time * 6) * 0.08;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(
      state.nearestInteractable.x,
      state.nearestInteractable.y + 6,
      26 * pulse,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  ctx.restore();

  if (isInterior) {
    // Cozy warm interior vignette at night
    if (dayInfo.nightFactor > 0.2) {
      ctx.save();
      ctx.fillStyle = `rgba(245, 158, 11, ${(dayInfo.nightFactor * 0.06).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  } else {
    // Outdoor expansion map gets full weather + day/night lighting
    drawWeatherEffects(ctx, width, height, state, dayInfo);
    if (dayInfo.nightFactor > 0.02 || dayInfo.duskFactor > 0.02) {
      applyDayNightLighting(ctx, width, height, state, dayInfo);
    }
  }

  drawObjectiveCompassArrow(ctx, width, height, state);
}

function drawSceneFurniture(
  ctx: CanvasRenderingContext2D,
  item: SceneFurniture,
  time: number
) {
  const { x, y, width: w, height: h, kind } = item;

  if (kind === 'rug') {
    ctx.fillStyle = item.color ?? '#b4532a';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
    return;
  }

  if (kind === 'creek_bridge') {
    // Blue creek running vertically across Roça Antiga
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    for (let wy = 40; wy < h; wy += 70) {
      const waveOffset = Math.sin(time * 2 + wy * 0.04) * 6;
      ctx.beginPath();
      ctx.moveTo(x + 18 + waveOffset, wy);
      ctx.lineTo(x + 56 + waveOffset, wy + 18);
      ctx.stroke();
    }
    // Wooden bridge over the road at y ~ 450..550
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 14, 448, w + 28, 104);
    ctx.fillStyle = '#a16207';
    for (let px = x - 8; px < x + w + 8; px += 16) {
      ctx.fillRect(px, 454, 12, 92);
    }
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 14, 448, w + 28, 8);
    ctx.fillRect(x - 14, 544, w + 28, 8);
    return;
  }

  if (kind === 'corn_patch') {
    ctx.fillStyle = '#5c4028';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    for (let cx = x + 22; cx < x + w - 14; cx += 34) {
      for (let cy = y + 22; cy < y + h - 14; cy += 32) {
        const sway = Math.sin(time * 2.2 + cx * 0.03) * 2.5;
        ctx.fillStyle = '#3f7d31';
        ctx.beginPath();
        ctx.arc(cx + sway, cy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx + sway + 3, cy - 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  if (kind === 'farmhouse') {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 8, y + 12, w, h);
    ctx.fillStyle = '#e7d2b5';
    ctx.fillRect(x, y + h * 0.35, w, h * 0.65);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y + h * 0.35, w, h * 0.65);
    ctx.fillStyle = '#9a3412';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + h * 0.38);
    ctx.lineTo(x + 18, y);
    ctx.lineTo(x + w - 18, y);
    ctx.lineTo(x + w + 10, y + h * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5c331c';
    ctx.fillRect(x + w / 2 - 16, y + h - 40, 32, 40);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(x + 26, y + h - 48, 28, 22);
    ctx.fillRect(x + w - 54, y + h - 48, 28, 22);
    return;
  }

  if (kind === 'well') {
    drawVillageWell(ctx, x + w / 2, y + h / 2);
    return;
  }

  if (kind === 'fence') {
    ctx.fillStyle = '#7c4a2d';
    ctx.fillRect(x, y + 6, w, 6);
    for (let fx = x; fx <= x + w - 8; fx += 24) {
      ctx.fillRect(fx, y, 7, h);
    }
    return;
  }

  if (kind === 'bed') {
    ctx.fillStyle = '#5c331c';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x + 8, y + 8, 34, h - 16);
    ctx.fillStyle = item.color ?? '#2563eb';
    ctx.fillRect(x + 44, y + 8, w - 52, h - 16);
    return;
  }

  if (kind === 'table' || kind === 'desk' || kind === 'counter' || kind === 'workbench') {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + 4, y + 6, w, h);
    ctx.fillStyle = kind === 'counter' ? '#7c4a2d' : '#9a6338';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (kind === 'table') {
      // Coffee pot & cups on table
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(x + w * 0.4, y + h * 0.5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(x + w * 0.65, y + h * 0.45, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (kind === 'chalkboard') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = '#14532d';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Gincana do Saber · Povoado Barriga', x + w / 2, y + 25);
    ctx.textAlign = 'left';
    return;
  }

  if (kind === 'radio_console') {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Glowing VU meters & frequency dial
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + 24, y + 16, 80, 20);
    ctx.fillStyle = Math.sin(time * 6) > 0 ? '#ef4444' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(x + w - 34, y + 26, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + 128, y + 18, 120, 14);
    return;
  }

  if (kind === 'stove') {
    ctx.fillStyle = '#374151';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(x + 32, y + 26, 12, 0, Math.PI * 2);
    ctx.arc(x + 82, y + 26, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.fillRect(x + 16, y + h - 10, 30, 6);
    return;
  }

  if (kind === 'sofa') {
    ctx.fillStyle = item.color ?? '#9a3412';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 10, y + 10, w - 20, 14);
    return;
  }

  if (kind === 'shelf') {
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3f2310';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    const colors = ['#f59e0b', '#ef4444', '#38bdf8', '#22c55e'];
    for (let sx = x + 12; sx < x + w - 16; sx += 22) {
      ctx.fillStyle = colors[(sx / 22 | 0) % colors.length];
      ctx.fillRect(sx, y + 10, 12, h - 20);
    }
    return;
  }

  if (kind === 'plant') {
    ctx.fillStyle = '#9a3412';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2 + 4, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2 - 4, 15, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlaza(
  ctx: CanvasRenderingContext2D,
  time: number,
  festivalMode: boolean
) {
  const { x, y, width, height } = PLAZA_RECT;

  // Stone border curb
  ctx.fillStyle = '#948675';
  ctx.fillRect(x - 10, y - 10, width + 20, height + 20);

  // Cobblestone base
  ctx.fillStyle = '#d6c7b2';
  ctx.fillRect(x, y, width, height);

  // Subtle tile grid
  ctx.strokeStyle = 'rgba(120, 102, 82, 0.22)';
  ctx.lineWidth = 1;
  for (let tx = x; tx <= x + width; tx += 40) {
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(tx, y + height);
    ctx.stroke();
  }
  for (let ty = y; ty <= y + height; ty += 40) {
    ctx.beginPath();
    ctx.moveTo(x, ty);
    ctx.lineTo(x + width, ty);
    ctx.stroke();
  }

  // 4 Garden flowerbed quadrants around the center fountain
  const beds = [
    { bx: x + 75, by: y + 75, w: 120, h: 110 },
    { bx: x + width - 195, by: y + 75, w: 120, h: 110 },
    { bx: x + 75, by: y + height - 185, w: 120, h: 110 },
    { bx: x + width - 195, by: y + height - 185, w: 120, h: 110 },
  ];

  for (const bed of beds) {
    ctx.fillStyle = '#785a3c';
    ctx.fillRect(bed.bx - 4, bed.by - 4, bed.w + 8, bed.h + 8);
    ctx.fillStyle = '#4d823b';
    ctx.fillRect(bed.bx, bed.by, bed.w, bed.h);
    // Flowers
    const flowerColors = ['#fbbf24', '#f87171', '#f472b6', '#ffffff'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = flowerColors[i % flowerColors.length];
      const fx = bed.bx + 20 + (i % 3) * 38;
      const fy = bed.by + 28 + Math.floor(i / 3) * 48;
      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Benches
  const benches = [
    { bx: x + 260, by: y + 100 },
    { bx: x + 260, by: y + height - 120 },
  ];
  for (const bench of benches) {
    ctx.fillStyle = '#7c4a2d';
    ctx.fillRect(bench.bx, bench.by, 80, 18);
    ctx.fillStyle = '#5c331c';
    ctx.fillRect(bench.bx + 4, bench.by + 18, 8, 6);
    ctx.fillRect(bench.bx + 68, bench.by + 18, 8, 6);
  }

  // Central Fountain
  const fx = PLAZA_FOUNTAIN.x;
  const fy = PLAZA_FOUNTAIN.y;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(fx, fy + 8, 56, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#9ca3af';
  ctx.beginPath();
  ctx.arc(fx, fy, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(fx, fy, 42, 0, Math.PI * 2);
  ctx.fill();

  // Animated water ripple
  const ripple = ((time * 18) % 28) + 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(fx, fy, ripple, 0, Math.PI * 2);
  ctx.stroke();

  // Pedestal
  ctx.fillStyle = '#d1d5db';
  ctx.beginPath();
  ctx.arc(fx, fy, 14, 0, Math.PI * 2);
  ctx.fill();

  // Festival bunting flags if festival mode is active
  if (festivalMode) {
    const colors = ['#ef4444', '#facc15', '#3b82f6', '#22c55e', '#f97316'];
    for (let i = 0; i < 16; i++) {
      const px = x + 30 + i * 36;
      const py = y + 24 + Math.sin(i * 0.7 + time * 3) * 4;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 14, py);
      ctx.lineTo(px + 7, py + 14);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawSoccerField(ctx: CanvasRenderingContext2D) {
  const { x, y, width, height } = SOCCER_FIELD_RECT;

  // Striped grass
  const stripeW = width / 8;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2f8f3c' : '#287d34';
    ctx.fillRect(x + i * stripeW, y, stripeW + 1, height);
  }

  // White chalk lines
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 12, y + 12, width - 24, height - 24);

  // Midfield line & circle
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y + 12);
  ctx.lineTo(x + width / 2, y + height - 12);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + width / 2, y + height / 2, 46, 0, Math.PI * 2);
  ctx.stroke();

  // Penalty boxes
  ctx.strokeRect(x + 12, y + height / 2 - 70, 72, 140);
  ctx.strokeRect(x + width - 84, y + height / 2 - 70, 72, 140);

  // Left & Right Goals
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 4;
  ctx.strokeRect(x - 16, y + height / 2 - 42, 28, 84);
  ctx.strokeRect(x + width - 12, y + height / 2 - 42, 28, 84);

  // Soccer ball at center
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + width / 2, y + height / 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: WorldBuilding,
  time: number,
  radioBroadcasting: boolean,
  nightFactor: number
) {
  if (b.kind === 'radio_tower') {
    drawRadioTower(ctx, b, time, radioBroadcasting);
    return;
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(b.x + 8, b.y + 12, b.width, b.height);

  // Walls
  ctx.fillStyle = b.wallColor;
  ctx.fillRect(b.x, b.y + b.height * 0.36, b.width, b.height * 0.64);
  ctx.strokeStyle = b.trimColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x, b.y + b.height * 0.36, b.width, b.height * 0.64);

  // Roof
  ctx.fillStyle = b.roofColor;
  ctx.beginPath();
  ctx.moveTo(b.x - 10, b.y + b.height * 0.4);
  ctx.lineTo(b.x + 14, b.y);
  ctx.lineTo(b.x + b.width - 14, b.y);
  ctx.lineTo(b.x + b.width + 10, b.y + b.height * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = b.trimColor;
  ctx.stroke();

  // Door
  ctx.fillStyle = '#5c331c';
  ctx.fillRect(b.doorX - 16, b.y + b.height - 40, 32, 40);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(b.doorX + 9, b.y + b.height - 20, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Windows (glow warm amber at dusk/night)
  ctx.fillStyle = nightFactor > 0.3 ? '#fde047' : '#bae6fd';
  ctx.fillRect(b.x + 22, b.y + b.height - 46, 28, 22);
  ctx.fillRect(b.x + b.width - 50, b.y + b.height - 46, 28, 22);
  ctx.strokeStyle = b.trimColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x + 22, b.y + b.height - 46, 28, 22);
  ctx.strokeRect(b.x + b.width - 50, b.y + b.height - 46, 28, 22);

  // Special details per building
  if (b.kind === 'school') {
    // Bell gable
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(b.x + b.width / 2, b.y + 18, 9, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.kind === 'shop') {
    // Striped awning
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#fef3c7';
      ctx.fillRect(b.x + 12 + i * 25, b.y + b.height * 0.4, 25, 16);
    }
  } else if (b.kind === 'radio_shack') {
    // Small roof dish
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x + 40, b.y + 8);
    ctx.lineTo(b.x + 40, b.y - 24);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(b.x + 40, b.y - 26, 10, Math.PI * 0.2, Math.PI * 1.2);
    ctx.fill();
  }

  // Name label banner
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  const tw = ctx.measureText(b.name).width;
  ctx.fillStyle = 'rgba(27, 22, 18, 0.78)';
  ctx.beginPath();
  ctx.roundRect(b.x + b.width / 2 - tw / 2 - 8, b.y - 26, tw + 16, 20, 6);
  ctx.fill();
  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.fillText(b.name, b.x + b.width / 2, b.y - 12);
  ctx.textAlign = 'left';
}

function drawRadioTower(
  ctx: CanvasRenderingContext2D,
  b: WorldBuilding,
  time: number,
  radioBroadcasting: boolean
) {
  const cx = b.x + b.width / 2;
  const baseY = b.y + b.height;
  const topY = b.y - 175;

  // Concrete pad
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(b.x + 10, baseY - 35, b.width - 20, 35);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x + 10, baseY - 35, b.width - 20, 35);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx + 35, baseY - 5, 65, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lattice tower segments (red & white alternating)
  const segments = 6;
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const y0 = baseY - 22 - t0 * (baseY - 22 - topY);
    const y1 = baseY - 22 - t1 * (baseY - 22 - topY);
    const halfW0 = 36 * (1 - t0 * 0.85);
    const halfW1 = 36 * (1 - t1 * 0.85);

    ctx.strokeStyle = i % 2 === 0 ? '#dc2626' : '#f8fafc';
    ctx.lineWidth = 4;

    // Legs & cross brace
    ctx.beginPath();
    ctx.moveTo(cx - halfW0, y0);
    ctx.lineTo(cx - halfW1, y1);
    ctx.moveTo(cx + halfW0, y0);
    ctx.lineTo(cx + halfW1, y1);
    ctx.moveTo(cx - halfW0, y0);
    ctx.lineTo(cx + halfW1, y1);
    ctx.moveTo(cx + halfW0, y0);
    ctx.lineTo(cx - halfW1, y1);
    ctx.moveTo(cx - halfW1, y1);
    ctx.lineTo(cx + halfW1, y1);
    ctx.stroke();
  }

  // Mast spire
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx, topY - 34);
  ctx.stroke();

  // Blinking aviation beacon
  const beaconOn = Math.sin(time * (radioBroadcasting ? 8 : 3.5)) > 0;
  ctx.fillStyle = beaconOn ? '#ef4444' : '#7f1d1d';
  ctx.beginPath();
  ctx.arc(cx, topY - 36, 6, 0, Math.PI * 2);
  ctx.fill();

  // Expanding radio wave rings
  const ringCount = radioBroadcasting ? 3 : 2;
  for (let r = 0; r < ringCount; r++) {
    const phase = (time * (radioBroadcasting ? 1.4 : 0.7) + r / ringCount) % 1;
    const rad = 12 + phase * (radioBroadcasting ? 95 : 55);
    ctx.strokeStyle = radioBroadcasting
      ? `rgba(250, 204, 21, ${(1 - phase) * 0.8})`
      : `rgba(248, 113, 113, ${(1 - phase) * 0.5})`;
    ctx.lineWidth = radioBroadcasting ? 3 : 2;
    ctx.beginPath();
    ctx.arc(cx, topY - 36, rad, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Label
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  const tw = ctx.measureText(b.name).width;
  ctx.fillStyle = 'rgba(27, 22, 18, 0.82)';
  ctx.beginPath();
  ctx.roundRect(cx - tw / 2 - 8, baseY + 8, tw + 16, 20, 6);
  ctx.fill();
  ctx.fillStyle = '#fde68a';
  ctx.textAlign = 'center';
  ctx.fillText(b.name, cx, baseY + 22);
  ctx.textAlign = 'left';
}

function drawTree(ctx: CanvasRenderingContext2D, t: WorldTree, time: number) {
  const sway = Math.sin(time * 1.5 + t.x * 0.01) * 2;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(t.x + 6, t.y + 12, t.radius * 0.95, t.radius * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(t.x - 6, t.y - 16, 12, 26);

  if (t.variant === 'ipe') {
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(t.x + sway, t.y - 26, t.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(t.x - 8 + sway, t.y - 32, t.radius * 0.65, 0, Math.PI * 2);
    ctx.fill();
  } else if (t.variant === 'palm') {
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 + sway * 0.02;
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.ellipse(
        t.x + Math.cos(a) * 18,
        t.y - 24 + Math.sin(a) * 12,
        18,
        7,
        a,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#2d6a3e';
    ctx.beginPath();
    ctx.arc(t.x + sway, t.y - 26, t.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f8a4e';
    ctx.beginPath();
    ctx.arc(t.x - 7 + sway, t.y - 32, t.radius * 0.68, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCarroca(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wheelAngle: number
) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x + 15, y + 18, 62, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Horse in front
  ctx.fillStyle = '#7c4a2d';
  ctx.fillRect(x + 42, y - 16, 36, 22);
  ctx.fillRect(x + 70, y - 28, 14, 22);
  ctx.fillRect(x + 44, y + 4, 6, 14);
  ctx.fillRect(x + 68, y + 4, 6, 14);

  // Harness poles
  ctx.strokeStyle = '#5c331c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 20, y - 2);
  ctx.lineTo(x + 56, y - 4);
  ctx.stroke();

  // Wagon bed
  ctx.fillStyle = '#9a6338';
  ctx.fillRect(x - 42, y - 24, 64, 30);
  ctx.strokeStyle = '#5c331c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 42, y - 24, 64, 30);

  // Luggage bags in carroça
  ctx.fillStyle = '#d97706';
  ctx.fillRect(x - 34, y - 32, 18, 10);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(x - 12, y - 30, 14, 8);

  // Spoked wheels
  for (const wx of [x - 28, x + 8]) {
    ctx.save();
    ctx.translate(wx, y + 8);
    ctx.rotate(wheelAngle);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(11, 0);
    ctx.moveTo(0, -11);
    ctx.lineTo(0, 11);
    ctx.stroke();
    ctx.restore();
  }
}

function drawVillageWell(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 24, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#78716c';
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();

  // Roof posts
  ctx.fillStyle = '#5c331c';
  ctx.fillRect(x - 18, y - 28, 4, 28);
  ctx.fillRect(x + 14, y - 28, 4, 28);
  ctx.fillStyle = '#b4532a';
  ctx.beginPath();
  ctx.moveTo(x - 24, y - 26);
  ctx.lineTo(x, y - 42);
  ctx.lineTo(x + 24, y - 26);
  ctx.closePath();
  ctx.fill();
}

function drawSignpost(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.fillStyle = '#5c331c';
  ctx.fillRect(x - 2, y - 18, 4, 20);
  ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
  const w = ctx.measureText(text).width + 10;
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(x - w / 2, y - 30, w, 15);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - w / 2, y - 30, w, 15);
  ctx.fillStyle = '#451a03';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 19);
  ctx.textAlign = 'left';
}

function drawRelic(ctx: CanvasRenderingContext2D, relic: CollectibleRelic, time: number) {
  const bob = Math.sin(time * 3.5 + relic.x) * 4;
  ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
  ctx.beginPath();
  ctx.arc(relic.x, relic.y, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = '#fffbeb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(relic.x, relic.y - 10 + bob);
  ctx.lineTo(relic.x + 8, relic.y + bob);
  ctx.lineTo(relic.x, relic.y + 10 + bob);
  ctx.lineTo(relic.x - 8, relic.y + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawAnimal(ctx: CanvasRenderingContext2D, animal: RoamingAnimal, time: number) {
  const hop = Math.abs(Math.sin(time * 6 + animal.x * 0.05)) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(animal.x, animal.y + 6, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (animal.kind === 'dog') {
    ctx.fillStyle = animal.color;
    ctx.fillRect(animal.x - 10, animal.y - 8 - hop, 20, 11);
    ctx.fillRect(animal.x + 6, animal.y - 14 - hop, 9, 9);
    // Wagging tail
    ctx.strokeStyle = animal.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(animal.x - 10, animal.y - 6 - hop);
    ctx.lineTo(animal.x - 15, animal.y - 12 + Math.sin(time * 12) * 3);
    ctx.stroke();
  } else {
    // Chicken
    ctx.fillStyle = animal.color;
    ctx.beginPath();
    ctx.arc(animal.x, animal.y - 4 - hop, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(animal.x - 2, animal.y - 13 - hop, 4, 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(animal.x + 6, animal.y - 6 - hop, 4, 3);
  }
}

function drawNPC(
  ctx: CanvasRenderingContext2D,
  npc: InteractiveNPC,
  hasQuest: boolean,
  time: number
) {
  const { x, y } = npc;
  const phaseOffset = npc.name.charCodeAt(0) * 0.7;
  const walkSwing = npc.isMoving ? Math.sin(time * 10 + phaseOffset) * 3.5 : 0;
  const bob = npc.isMoving ? Math.abs(Math.sin(time * 10 + phaseOffset)) * 1.8 : 0;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = npc.pantsColor;
  ctx.fillRect(x - 6, y - 4 + walkSwing * 0.6, 5, 13);
  ctx.fillRect(x + 1, y - 4 - walkSwing * 0.6, 5, 13);

  // Torso
  ctx.fillStyle = npc.shirtColor;
  ctx.fillRect(x - 9, y - 22 - bob, 18, 19);

  // Head
  ctx.fillStyle = npc.skinTone;
  ctx.beginPath();
  ctx.arc(x, y - 30 - bob, 9, 0, Math.PI * 2);
  ctx.fill();

  // Hair / Hat
  if (npc.hatColor) {
    ctx.fillStyle = npc.hatColor;
    ctx.fillRect(x - 12, y - 38 - bob, 24, 5);
    ctx.fillRect(x - 7, y - 44 - bob, 14, 7);
  } else {
    ctx.fillStyle = npc.hairColor;
    ctx.beginPath();
    ctx.arc(x, y - 32 - bob, 9, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // Name tag
  ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(20, 16, 12, 0.72)';
  const tw = ctx.measureText(npc.name).width;
  ctx.beginPath();
  ctx.roundRect(x - tw / 2 - 5, y - 58, tw + 10, 15, 4);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(npc.name, x, y - 47);

  // Floating Quest indicator
  if (hasQuest) {
    const bounce = Math.sin(time * 5) * 4;
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#1b1612';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 72 + bounce, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1b1612';
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('!', x, y - 67 + bounce);
  }

  ctx.textAlign = 'left';
}

function drawCleilson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: 'down' | 'up' | 'left' | 'right',
  isMoving: boolean,
  stageId: LifeStageId,
  time: number,
  nightFactor: number
) {
  const walkSwing = isMoving ? Math.sin(time * 14) * 4 : 0;
  const bob = isMoving ? Math.abs(Math.sin(time * 14)) * 2 : 0;

  // Height & visual style scale up with age!
  const scale =
    stageId === 'INFANCIA'
      ? 0.88
      : stageId === 'PRE_ADOLESCENCIA'
      ? 1.0
      : stageId === 'JUVENTUDE'
      ? 1.12
      : 1.22;

  ctx.save();
  ctx.translate(x, y);

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 14 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(scale, scale);

  // Outfit colors per life stage
  const shirtColor =
    stageId === 'INFANCIA'
      ? '#38bdf8' // blue t-shirt
      : stageId === 'PRE_ADOLESCENCIA'
      ? '#f59e0b' // bright jersey
      : stageId === 'JUVENTUDE'
      ? '#1d4ed8' // denim jacket
      : '#0f766e'; // crisp adult emerald/teal shirt

  const pantsColor =
    stageId === 'INFANCIA'
      ? '#78350f' // shorts
      : stageId === 'PRE_ADOLESCENCIA'
      ? '#1e293b'
      : stageId === 'JUVENTUDE'
      ? '#334155'
      : '#27272a';

  // Legs
  ctx.fillStyle = pantsColor;
  ctx.fillRect(-6, -4 + walkSwing * 0.6, 5, 13);
  ctx.fillRect(1, -4 - walkSwing * 0.6, 5, 13);

  // Torso
  ctx.fillStyle = shirtColor;
  ctx.fillRect(-9, -22 - bob, 18, 19);

  // Backpack in Pre-Adolescência or Jacket collar in Juventude/Adulto
  if (stageId === 'PRE_ADOLESCENCIA' && dir === 'up') {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-7, -20 - bob, 14, 14);
  }

  // Head
  ctx.fillStyle = '#d99b6c';
  ctx.beginPath();
  ctx.arc(0, -30 - bob, 9.5, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (unless facing up)
  if (dir !== 'up') {
    const eyeOffsetX = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-4 + eyeOffsetX, -31 - bob, 2.2, 2.5);
    ctx.fillRect(2 + eyeOffsetX, -31 - bob, 2.2, 2.5);
  }

  // Age-specific headwear / hair
  if (stageId === 'INFANCIA') {
    // Straw hat (chapéu de palha)
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-13, -38 - bob, 26, 4);
    ctx.fillRect(-7, -43 - bob, 14, 6);
  } else if (stageId === 'PRE_ADOLESCENCIA') {
    // Messy dark hair
    ctx.fillStyle = '#291c14';
    ctx.beginPath();
    ctx.arc(0, -33 - bob, 9.5, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (stageId === 'JUVENTUDE') {
    // Red cap
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -33 - bob, 9.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(dir === 'left' ? -13 : -4, -35 - bob, 16, 3);
  } else {
    // Adult neat hair + light beard shadow
    ctx.fillStyle = '#1f1610';
    ctx.beginPath();
    ctx.arc(0, -33 - bob, 9.5, Math.PI, Math.PI * 2);
    ctx.fill();
    if (dir !== 'up') {
      ctx.fillStyle = 'rgba(31, 22, 16, 0.25)';
      ctx.beginPath();
      ctx.arc(0, -28 - bob, 7.5, 0.2, Math.PI - 0.2);
      ctx.fill();
    }
  }

  // Small handheld lampião glow indicator at night
  if (nightFactor > 0.28) {
    const handX = dir === 'left' ? -11 : 11;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(handX, -11 - bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawLanternPost(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  nightFactor: number
) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Iron pole
  ctx.fillStyle = '#27272a';
  ctx.fillRect(x - 2.5, y - 34, 5, 38);
  ctx.fillRect(x - 6, y - 36, 12, 4);

  // Lamp glass
  ctx.fillStyle = nightFactor > 0.25 ? '#fef08a' : '#cbd5e1';
  ctx.beginPath();
  ctx.arc(x, y - 40, 5.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawFireflies(
  ctx: CanvasRenderingContext2D,
  time: number,
  viewLeft: number,
  viewRight: number,
  viewTop: number,
  viewBottom: number,
  nightFactor: number
) {
  const alphaBase = Math.min(1, (nightFactor - 0.35) / 0.5);
  for (let i = 0; i < 42; i++) {
    const bx = ((i * 5381) % (WORLD_WIDTH - 200)) + 100;
    const by = ((i * 3917) % (WORLD_HEIGHT - 200)) + 100;
    const fx = bx + Math.sin(time * 1.4 + i) * 26;
    const fy = by + Math.cos(time * 1.1 + i * 1.7) * 20;
    if (fx < viewLeft || fx > viewRight || fy < viewTop || fy > viewBottom) {
      continue;
    }
    const flicker = 0.4 + 0.6 * Math.abs(Math.sin(time * 3.5 + i * 2.1));
    ctx.fillStyle = `rgba(217, 249, 157, ${(alphaBase * flicker).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function applyDayNightLighting(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderFrameState,
  dayInfo: ReturnType<typeof getDaylightPhaseInfo>
) {
  if (!cachedLightCanvas) {
    cachedLightCanvas = document.createElement('canvas');
  }
  if (cachedLightCanvas.width !== width || cachedLightCanvas.height !== height) {
    cachedLightCanvas.width = width;
    cachedLightCanvas.height = height;
  }
  const lctx = cachedLightCanvas.getContext('2d');
  if (!lctx) return;

  lctx.save();
  lctx.clearRect(0, 0, width, height);

  // Fill with current ambient dawn/dusk/night tint
  lctx.fillStyle = dayInfo.ambientRgba;
  lctx.fillRect(0, 0, width, height);

  // When nightfall sets in, cut soft visibility holes around Cleilson's lantern, street lamps, and the radio tower
  if (dayInfo.nightFactor > 0.12) {
    lctx.globalCompositeOperation = 'destination-out';

    const cutRadialLight = (
      worldX: number,
      worldY: number,
      radius: number,
      strength = 0.94
    ) => {
      const sx = worldX - state.cameraX;
      const sy = worldY - state.cameraY;
      if (
        sx < -radius ||
        sx > width + radius ||
        sy < -radius ||
        sy > height + radius
      ) {
        return;
      }
      const grad = lctx.createRadialGradient(sx, sy, radius * 0.12, sx, sy, radius);
      grad.addColorStop(0, `rgba(0,0,0,${strength})`);
      grad.addColorStop(0.55, `rgba(0,0,0,${strength * 0.55})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = grad;
      lctx.beginPath();
      lctx.arc(sx, sy, radius, 0, Math.PI * 2);
      lctx.fill();
    };

    // 1. Cleilson's personal lantern + forward directional beam
    const lanternRadius = 148;
    cutRadialLight(state.playerX, state.playerY - 12, lanternRadius, 0.95);
    const dirVec =
      state.playerDir === 'left'
        ? { x: -72, y: 0 }
        : state.playerDir === 'right'
        ? { x: 72, y: 0 }
        : state.playerDir === 'up'
        ? { x: 0, y: -72 }
        : { x: 0, y: 72 };
    cutRadialLight(
      state.playerX + dirVec.x,
      state.playerY - 12 + dirVec.y,
      110,
      0.72
    );

    // 2. Praça Central street lanterns & key village doorways
    for (const lamp of STREET_LANTERNS) {
      cutRadialLight(lamp.x, lamp.y - 16, lamp.radius, 0.88);
    }

    // 3. Radio Tower beacon & base floodlight
    const tower = WORLD_BUILDINGS.find((b) => b.id === 'radio_tower');
    if (tower) {
      const tcx = tower.x + tower.width / 2;
      cutRadialLight(tcx, tower.y - 190, 125, 0.85);
      cutRadialLight(tcx, tower.y + tower.height - 20, 130, 0.82);
    }

    // 4. Collectible relics shimmer subtly in the dark
    for (const r of state.relics) {
      if (!state.collectedRelicIds.includes(r.id)) {
        cutRadialLight(r.x, r.y, 44, 0.65);
      }
    }
  }

  lctx.restore();

  // Composite ambient shadow/tint layer onto main canvas
  ctx.save();
  ctx.drawImage(cachedLightCanvas, 0, 0);

  // Subtle warm amber glow pools on street lanterns & Cleilson's lampião during night
  if (dayInfo.nightFactor > 0.28) {
    const warmStrength = (dayInfo.nightFactor - 0.28) * 0.24;
    const drawWarmGlow = (wx: number, wy: number, r: number, colorRgb: string) => {
      const sx = wx - state.cameraX;
      const sy = wy - state.cameraY;
      if (sx < -r || sx > width + r || sy < -r || sy > height + r) return;
      const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, r);
      g.addColorStop(0, `rgba(${colorRgb}, ${warmStrength.toFixed(3)})`);
      g.addColorStop(1, `rgba(${colorRgb}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    drawWarmGlow(state.playerX, state.playerY - 12, 125, '253, 224, 71');
    for (const lamp of STREET_LANTERNS) {
      drawWarmGlow(lamp.x, lamp.y - 24, lamp.radius * 0.85, '251, 191, 36');
    }
    const tower = WORLD_BUILDINGS.find((b) => b.id === 'radio_tower');
    if (tower) {
      const beaconPulse = Math.sin(state.time * 4) > 0 ? 1.2 : 0.45;
      drawWarmGlow(
        tower.x + tower.width / 2,
        tower.y - 205,
        110 * beaconPulse,
        '239, 68, 68'
      );
    }
  }

  ctx.restore();
}

function drawWeatherEffects(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderFrameState,
  dayInfo: DaylightPhaseInfo
) {
  const intensity = Math.max(0, Math.min(1, state.weatherIntensity));
  const { weather, time, cameraX, cameraY } = state;

  // 1. Clear sky floating warm pollen/sun motes during daylight
  if (weather === 'CLEAR' && dayInfo.nightFactor < 0.65) {
    const moteAlpha = (1 - dayInfo.nightFactor) * 0.45 * (1 - intensity * 0.3);
    if (moteAlpha > 0.04) {
      ctx.save();
      ctx.fillStyle = `rgba(254, 240, 138, ${moteAlpha.toFixed(2)})`;
      for (let i = 0; i < 28; i++) {
        const px =
          ((i * 197 + time * (16 + (i % 4) * 5) - cameraX * 0.7) % (width + 40) +
            width +
            40) %
            (width + 40) -
          20;
        const py =
          ((i * 131 + Math.sin(time * 0.9 + i) * 28 - cameraY * 0.7) %
            (height + 40) +
            height +
            40) %
            (height + 40) -
          20;
        ctx.beginPath();
        ctx.arc(px, py, 1.8 + (i % 2) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 2. Drifting cloud shadows across the map for CLOUDY and RAINY
  if (weather === 'CLOUDY' || weather === 'RAINY') {
    const cloudOpacity =
      (weather === 'RAINY' ? 0.16 : 0.14) * Math.max(0.25, intensity);
    ctx.save();
    ctx.fillStyle = `rgba(15, 23, 42, ${cloudOpacity.toFixed(3)})`;
    for (let i = 0; i < 10; i++) {
      const worldSpan = WORLD_WIDTH + 900;
      const cx =
        (((i * 470 + time * (26 + (i % 3) * 8)) % worldSpan) - 450) - cameraX;
      const cy = ((i * 290 + 180) % (WORLD_HEIGHT - 160)) - cameraY;
      const rx = 180 + (i % 3) * 65;
      const ry = 85 + (i % 2) * 35;
      if (cx + rx < 0 || cx - rx > width || cy + ry < 0 || cy - ry > height) {
        continue;
      }
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cool overcast wash (stronger in rain)
    const washAlpha =
      (weather === 'RAINY' ? 0.2 : 0.1) *
      intensity *
      (1 - dayInfo.nightFactor * 0.5);
    if (washAlpha > 0.01) {
      ctx.fillStyle =
        weather === 'RAINY'
          ? `rgba(30, 58, 95, ${washAlpha.toFixed(3)})`
          : `rgba(100, 116, 139, ${washAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Wind-blown drifting mist/leaf particles in cloudy weather
    if (weather === 'CLOUDY') {
      ctx.fillStyle = `rgba(226, 232, 240, ${(0.35 * intensity).toFixed(2)})`;
      for (let i = 0; i < 24; i++) {
        const px =
          ((i * 211 + time * (55 + (i % 5) * 12) - cameraX * 0.85) %
            (width + 40) +
            width +
            40) %
            (width + 40) -
          20;
        const py =
          ((i * 157 + Math.sin(time * 2 + i) * 18 - cameraY * 0.85) %
            (height + 40) +
            height +
            40) %
            (height + 40) -
          20;
        ctx.fillRect(px, py, 5, 2);
      }
    }
    ctx.restore();
  }

  // 3. Raindrop streaks & ground splash ripples for RAINY
  if (weather === 'RAINY' && intensity > 0.05) {
    ctx.save();
    const dropCount = Math.round(115 * intensity);
    ctx.strokeStyle = `rgba(186, 230, 253, ${(0.52 * intensity).toFixed(2)})`;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    for (let i = 0; i < dropCount; i++) {
      const speedY = 520 + (i % 5) * 45;
      const speedX = -115 - (i % 3) * 15;
      const rx =
        ((i * 173 + time * speedX - cameraX * 0.95) % (width + 80) +
          width +
          80) %
          (width + 80) -
        40;
      const ry =
        ((i * 109 + time * speedY - cameraY * 0.95) % (height + 80) +
          height +
          80) %
          (height + 80) -
        40;
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 4.5, ry + 16);
    }
    ctx.stroke();

    // Ground splash ripples
    const splashCount = Math.round(28 * intensity);
    ctx.lineWidth = 1.1;
    for (let i = 0; i < splashCount; i++) {
      const cycle = (time * 2.2 + i * 0.37) % 1;
      const sx =
        ((i * 317 + Math.floor(time * 2.2 + i * 0.37) * 97 - cameraX) %
          width +
          width) %
        width;
      const sy =
        ((i * 223 + Math.floor(time * 2.2 + i * 0.37) * 61 - cameraY) %
          height +
          height) %
        height;
      const r = 1.5 + cycle * 6.5;
      const alpha = (1 - cycle) * 0.48 * intensity;
      ctx.strokeStyle = `rgba(224, 242, 254, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
