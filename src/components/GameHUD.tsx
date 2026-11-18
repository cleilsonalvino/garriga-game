import React, { useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  Cloud,
  CloudRain,
  Compass,
  Gamepad2,
  Gem,
  Hand,
  Map as MapIcon,
  Moon,
  Pause,
  Shield,
  Sparkles,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { AGE_STAGES, getLevelInfoFromXP } from '../game/storyData';
import { getDaylightPhaseInfo, getWeatherLabel } from '../game/renderer';
import { LifeStageId, PlayerStats, WeatherType } from '../game/types';

interface GameHUDProps {
  xp: number;
  coins: number;
  stats: PlayerStats;
  relicsCount: number;
  totalRelics: number;
  areaName: string;
  questChapter: string;
  questTitle: string;
  objectiveText: string;
  objectiveDistanceMeters: number | null;
  unlockedCount: number;
  totalAchievements: number;
  muted: boolean;
  showTouchControls: boolean;
  nearestPrompt: string | null;
  onInteract: () => void;
  onJoystickMove: (dx: number, dy: number) => void;
  onTouchRunChange: (running: boolean) => void;
  onOpenJournal: () => void;
  onOpenAchievements: () => void;
  onOpenMap: () => void;
  onToggleMute: () => void;
  onToggleTouchControls: () => void;
  onPause: () => void;
  worldHour: number;
  onAdvanceTime: () => void;
  weather: WeatherType;
  onCycleWeather: () => void;
}

const HeroCrestPortrait: React.FC<{ stageId: LifeStageId }> = ({ stageId }) => {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Ornate bronze shield medallion */}
      <circle cx="22" cy="22" r="20" fill="#2b1e14" stroke="#d49b42" strokeWidth="2.2" />
      <circle cx="22" cy="22" r="16.5" fill="#1b120b" stroke="#855823" strokeWidth="1" />
      {/* Shirt */}
      <path
        d="M12 36C12.8 30.5 16.5 28 22 28C27.5 28 31.2 30.5 32 36"
        fill={
          stageId === 'INFANCIA'
            ? '#38bdf8'
            : stageId === 'PRE_ADOLESCENCIA'
            ? '#f59e0b'
            : stageId === 'JUVENTUDE'
            ? '#2563eb'
            : '#0d9488'
        }
      />
      {/* Head */}
      <circle cx="22" cy="20" r="7" fill="#d99b6c" />
      {/* Eyes */}
      <circle cx="19.5" cy="20" r="1" fill="#1c1917" />
      <circle cx="24.5" cy="20" r="1" fill="#1c1917" />
      {/* Age-specific headwear */}
      {stageId === 'INFANCIA' && (
        <>
          <rect x="12" y="13.5" width="20" height="3" rx="1.5" fill="#eab308" />
          <path d="M16 14C16.8 9.5 27.2 9.5 28 14Z" fill="#ca8a04" />
        </>
      )}
      {stageId === 'PRE_ADOLESCENCIA' && (
        <path d="M15 19C15 13.5 29 13.5 29 19C26 16.5 18 16.5 15 19Z" fill="#291c14" />
      )}
      {stageId === 'JUVENTUDE' && (
        <>
          <path d="M15 18C15 12.5 29 12.5 29 18Z" fill="#dc2626" />
          <rect x="20" y="16.5" width="11" height="2.4" rx="1" fill="#991b1b" />
        </>
      )}
      {stageId === 'ADULTO' && (
        <>
          <path d="M15 18.5C15 13 29 13 29 18.5C26 16 18 16 15 18.5Z" fill="#1c1917" />
          <path d="M17.5 23.5C19.5 26 24.5 26 26.5 23.5" stroke="#44403c" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
};

export const GameHUD: React.FC<GameHUDProps> = ({
  xp,
  coins,
  stats,
  relicsCount,
  totalRelics,
  areaName,
  questChapter,
  questTitle,
  objectiveText,
  objectiveDistanceMeters,
  unlockedCount,
  totalAchievements,
  muted,
  showTouchControls,
  nearestPrompt,
  onInteract,
  onJoystickMove,
  onTouchRunChange,
  onOpenJournal,
  onOpenAchievements,
  onOpenMap,
  onToggleMute,
  onToggleTouchControls,
  onPause,
  worldHour,
  onAdvanceTime,
  weather,
  onCycleWeather,
}) => {
  const { current, next, progressPercent } = getLevelInfoFromXP(xp);
  const stage = AGE_STAGES[current.stageId];
  const dayInfo = getDaylightPhaseInfo(worldHour);
  const wholeHours = Math.floor(((worldHour % 24) + 24) % 24);
  const minutes = Math.floor((worldHour - Math.floor(worldHour)) * 60);
  const clockLabel = `${String(wholeHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // Virtual thumbstick state
  const stickBaseRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);

  const updateStick = (clientX: number, clientY: number) => {
    const el = stickBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    onJoystickMove(dx / maxR, dy / maxR);
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4 select-none">
      {/* Top Fantasy HUD Strip */}
      <div className="flex flex-wrap lg:flex-nowrap items-start justify-between gap-2.5">
        {/* Top-Left: Ornate Hero Crest & Attributes Plaque */}
        <div className="pointer-events-auto relative bg-gradient-to-b from-[#2a1d13]/95 to-[#1a120c]/95 border-2 border-[#c88a36]/55 rounded-xl px-3.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.55)] w-full max-w-[325px]">
          {/* Subtle brass corner accents */}
          <span className="pointer-events-none absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-[#f3c677]/70" />
          <span className="pointer-events-none absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-[#f3c677]/70" />
          <span className="pointer-events-none absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-[#f3c677]/70" />
          <span className="pointer-events-none absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-[#f3c677]/70" />

          <div className="flex items-center gap-3">
            <HeroCrestPortrait stageId={current.stageId} />

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="text-base font-bold text-[#fff5e1] tracking-wide truncate"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Cleilson
                </span>
                <span className="text-[11px] font-semibold text-[#f3c677] tabular-nums whitespace-nowrap">
                  {current.age} anos · {stage.label}
                </span>
              </div>

              <div className="text-[11px] text-[#cbb697] truncate">
                Nível {current.level} · {current.title}
              </div>

              {/* Sculpted Fantasy XP Bar */}
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-2.5 bg-[#0f0a06] border border-[#8c622a]/60 rounded-sm overflow-hidden p-[1px]">
                  <div
                    className="h-full bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fde047] rounded-[1px] transition-all duration-200"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#e7d6bd] tabular-nums whitespace-nowrap">
                  {next ? `${xp}/${next.xpRequired}` : 'MÁX'}
                </span>
              </div>
            </div>
          </div>

          {/* Rich Fantasy Stats & Wealth Row */}
          <div className="mt-2 pt-2 border-t border-[#c88a36]/20 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2.5 font-mono text-[#e7d6bd] tabular-nums">
              <span title="Coragem" className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-rose-400" />
                {stats.coragem}
              </span>
              <span title="Sabedoria" className="flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-sky-400" />
                {stats.sabedoria}
              </span>
              <span title="Agilidade" className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-emerald-400" />
                {stats.agilidade}
              </span>
              <span title="Carisma" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {stats.carisma}
              </span>
            </div>

            <div className="flex items-center gap-2.5 font-mono tabular-nums shrink-0">
              <span className="text-[#fbbf24] font-semibold" title="Moedas">
                {coins} ouro
              </span>
              <span className="text-[#d6c2a5] flex items-center gap-1" title="Relíquias">
                <Gem className="w-3 h-3 text-amber-400" />
                {relicsCount}/{totalRelics}
              </span>
            </div>
          </div>
        </div>

        {/* Top-Center: Realm Location, Weather & Chronometer Banner */}
        <div className="pointer-events-auto hidden md:flex items-center gap-3 bg-gradient-to-b from-[#2a1d13]/94 to-[#1a120c]/94 border-2 border-[#c88a36]/50 rounded-xl px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-xs">
          <div className="flex items-center gap-1.5 text-[#fff5e1] font-semibold whitespace-nowrap">
            <Compass className="w-3.5 h-3.5 text-[#f3c677]" />
            <span>{areaName}</span>
          </div>
          <span className="text-[#8c622a]" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            onClick={onCycleWeather}
            title="Alternar clima (também muda aleatoriamente ao jogar)"
            className="flex items-center gap-1.5 text-[#e7d6bd] hover:text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            {weather === 'RAINY' ? (
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            ) : weather === 'CLOUDY' ? (
              <Cloud className="w-3.5 h-3.5 text-slate-300" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>{getWeatherLabel(weather)}</span>
          </button>
          <span className="text-[#8c622a]" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            onClick={onAdvanceTime}
            title="Avançar horário (+4h) para observar dia e noite"
            className="flex items-center gap-1.5 text-[#e7d6bd] hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap font-mono tabular-nums"
          >
            {dayInfo.phaseKey === 'night' ? (
              <Moon className="w-3.5 h-3.5 text-sky-300" />
            ) : dayInfo.phaseKey === 'dusk' || dayInfo.phaseKey === 'dawn' ? (
              <Sunset className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>
              {clockLabel} · {dayInfo.label}
            </span>
          </button>
        </div>

        {/* Top-Right: Brass Action Toolbar + Quest Parchment Scroll */}
        <div className="flex flex-col items-end gap-2 ml-auto lg:ml-0">
          <div className="pointer-events-auto flex items-center gap-1 bg-gradient-to-b from-[#2a1d13]/95 to-[#1a120c]/95 border-2 border-[#c88a36]/55 rounded-xl p-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <button
              type="button"
              onClick={onOpenJournal}
              title="Diário e Evolução (J)"
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-[#f7ead7] hover:bg-[#3c291b] hover:text-[#fde68a] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-4 h-4 text-[#f3c677]" />
              <span className="hidden sm:inline">Diário</span>
            </button>
            <button
              type="button"
              onClick={onOpenAchievements}
              title="Conquistas (C)"
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-[#f7ead7] hover:bg-[#3c291b] hover:text-[#fde68a] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Award className="w-4 h-4 text-[#f3c677]" />
              <span className="hidden sm:inline">Conquistas</span>
              <span className="font-mono text-[11px] text-[#fbbf24] tabular-nums">
                {unlockedCount}/{totalAchievements}
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenMap}
              title="Mapa do Povoado (M)"
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-[#f7ead7] hover:bg-[#3c291b] hover:text-[#fde68a] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <MapIcon className="w-4 h-4 text-[#f3c677]" />
              <span className="hidden sm:inline">Mapa</span>
            </button>
            <button
              type="button"
              onClick={onToggleTouchControls}
              title="Controles na Tela (Mobile)"
              aria-label="Alternar controles na tela"
              className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                showTouchControls
                  ? 'bg-[#c88a36]/25 text-[#fde68a]'
                  : 'text-[#d6c2a5] hover:bg-[#3c291b]'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              title={muted ? 'Ativar som' : 'Silenciar'}
              aria-label={muted ? 'Ativar som' : 'Silenciar'}
              className="p-2 rounded-lg text-[#d6c2a5] hover:bg-[#3c291b] transition-colors cursor-pointer shrink-0"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onPause}
              title="Pausar (Esc)"
              aria-label="Pausar jogo"
              className="p-2 rounded-lg text-[#d6c2a5] hover:bg-[#3c291b] transition-colors cursor-pointer shrink-0"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile compact location/weather/time line (shown below toolbar on small screens) */}
          <div className="pointer-events-auto flex md:hidden items-center gap-2 bg-[#1a120c]/92 border border-[#c88a36]/45 rounded-lg px-2.5 py-1.5 text-[11px] text-[#e7d6bd]">
            <span className="truncate max-w-[115px] font-medium text-[#fff5e1]">
              {areaName}
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onCycleWeather}
              className="flex items-center gap-1 cursor-pointer"
            >
              {weather === 'RAINY' ? (
                <CloudRain className="w-3 h-3 text-sky-400" />
              ) : weather === 'CLOUDY' ? (
                <Cloud className="w-3 h-3 text-slate-300" />
              ) : (
                <Sun className="w-3 h-3 text-amber-300" />
              )}
              <span>{getWeatherLabel(weather)}</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onAdvanceTime}
              className="font-mono tabular-nums cursor-pointer"
            >
              {clockLabel}
            </button>
          </div>

          {/* Pergaminho de Missão (Fantasy Quest Scroll) */}
          <div className="pointer-events-auto bg-gradient-to-b from-[#2b1f15]/94 to-[#1b130d]/94 border-2 border-[#c88a36]/45 rounded-xl px-3.5 py-2.5 shadow-lg max-w-[290px] sm:max-w-xs text-right">
            <div className="text-[10px] font-semibold tracking-wide text-[#f3c677] truncate">
              {questChapter} · {questTitle}
            </div>
            <div className="text-xs text-[#fff5e1] mt-1 leading-snug">
              {objectiveText}
            </div>
            {objectiveDistanceMeters !== null && (
              <div className="text-[11px] font-mono text-[#cbb697] mt-1 tabular-nums">
                Rumo: {objectiveDistanceMeters}m de distância
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls & Contextual Interaction Prompt */}
      <div className="flex items-end justify-between gap-4">
        {/* Left: Virtual Thumbstick (Mobile / Touch mode) */}
        <div className="w-28 h-28 flex items-end justify-start">
          {showTouchControls && (
            <div
              ref={stickBaseRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                activePointerId.current = e.pointerId;
                updateStick(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (activePointerId.current === e.pointerId) {
                  updateStick(e.clientX, e.clientY);
                }
              }}
              onPointerUp={resetStick}
              onPointerCancel={resetStick}
              className="pointer-events-auto relative w-28 h-28 rounded-full bg-[#1a120c]/75 border-2 border-[#c88a36]/45 touch-none flex items-center justify-center"
            >
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-b from-[#fbbf24] to-[#d97706] border-2 border-[#1a120c] shadow-md pointer-events-none"
                style={{
                  transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
                }}
              />
            </div>
          )}
        </div>

        {/* Center: Contextual Fantasy Interact Prompt */}
        <div className="flex-1 flex justify-center pb-1">
          {nearestPrompt && (
            <button
              type="button"
              onClick={onInteract}
              className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#fbbf24] to-[#d97706] hover:from-[#fde047] hover:to-[#f59e0b] border-2 border-[#fef3c7]/70 text-[#1b120b] font-bold text-xs sm:text-sm shadow-xl transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="font-mono bg-[#1b120b] text-[#fde68a] px-1.5 py-0.5 rounded text-xs">
                E
              </span>
              <span>{nearestPrompt}</span>
            </button>
          )}
        </div>

        {/* Right: Touch Action & Run Buttons */}
        <div className="w-28 flex items-end justify-end gap-2">
          {showTouchControls && (
            <div className="pointer-events-auto flex items-center gap-2.5">
              <button
                type="button"
                onPointerDown={() => onTouchRunChange(true)}
                onPointerUp={() => onTouchRunChange(false)}
                onPointerLeave={() => onTouchRunChange(false)}
                onPointerCancel={() => onTouchRunChange(false)}
                aria-label="Correr"
                className="w-12 h-12 rounded-full bg-[#1a120c]/88 border-2 border-[#c88a36]/55 text-[#fde68a] flex items-center justify-center active:scale-95 touch-none"
              >
                <Zap className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onInteract}
                aria-label="Interagir"
                className="w-14 h-14 rounded-full bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-[#1b120b] border-2 border-[#fff5e1] shadow-lg flex items-center justify-center active:scale-95 touch-none"
              >
                <Hand className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
