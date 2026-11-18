import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  Compass,
  Crown,
  Gem,
  Heart,
  Lock,
  MapPin,
  Radio,
  RotateCcw,
  Signal,
  Sprout,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  AGE_STAGES,
  getLevelInfoFromXP,
  MAIN_QUEST_ORDER,
  QUESTS,
} from '../game/storyData';
import {
  AchievementDefinition,
  GameSaveState,
  LifeStageId,
  ToastNotification,
} from '../game/types';
import {
  PLAZA_RECT,
  SOCCER_FIELD_RECT,
  WORLD_BUILDINGS,
  WORLD_HEIGHT,
  WORLD_RELICS,
  WORLD_ROADS,
  WORLD_WIDTH,
} from '../game/worldData';

function renderAchievementIcon(iconKey: AchievementDefinition['iconKey']) {
  const cls = 'w-5 h-5';
  switch (iconKey) {
    case 'wagon':
      return <Compass className={cls} />;
    case 'compass':
      return <Compass className={cls} />;
    case 'book':
      return <BookOpen className={cls} />;
    case 'trophy':
      return <Trophy className={cls} />;
    case 'radio':
      return <Radio className={cls} />;
    case 'sprout':
      return <Sprout className={cls} />;
    case 'crown':
      return <Crown className={cls} />;
    case 'gem':
      return <Gem className={cls} />;
    case 'heart':
      return <Heart className={cls} />;
    case 'star':
      return <Star className={cls} />;
    case 'signal':
      return <Signal className={cls} />;
    case 'award':
    default:
      return <Award className={cls} />;
  }
}

/* ---------------- JOURNAL & AGE PROGRESSION MODAL ---------------- */
export const JournalModal: React.FC<{
  save: GameSaveState;
  onClose: () => void;
}> = ({ save, onClose }) => {
  const { current, next, progressPercent } = getLevelInfoFromXP(save.xp);
  const currentQuest = QUESTS[save.activeQuestId];
  const stageOrder: LifeStageId[] = [
    'INFANCIA',
    'PRE_ADOLESCENCIA',
    'JUVENTUDE',
    'ADULTO',
  ];

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1b1612] border-2 border-amber-300/30 rounded-2xl p-5 sm:p-6 shadow-2xl animate-modal-pop">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-amber-200/15">
          <div>
            <h2
              className="text-xl sm:text-2xl font-bold text-[#fff8ee]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Diário de Cleilson
            </h2>
            <p className="text-xs text-amber-300 mt-0.5 tabular-nums">
              Nível {current.level} · {current.age} anos · {current.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Diário"
            className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* XP & Attributes */}
        <div className="py-4 border-b border-amber-200/10">
          <div className="flex justify-between text-xs font-mono text-stone-300 tabular-nums mb-1.5">
            <span>Experiência Total: {save.xp} XP</span>
            <span>
              {next
                ? `Próximo Nível (${next.age} anos): ${next.xpRequired} XP`
                : 'Nível Máximo Alcançado'}
            </span>
          </div>
          <div className="h-2.5 bg-stone-800 rounded-sm overflow-hidden mb-4">
            <div
              className="h-full bg-amber-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Coragem', val: save.stats.coragem },
              { label: 'Sabedoria', val: save.stats.sabedoria },
              { label: 'Agilidade', val: save.stats.agilidade },
              { label: 'Carisma', val: save.stats.carisma },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-[#261f19] border border-amber-200/12 rounded-xl px-3 py-2.5"
              >
                <div className="text-xs text-stone-400">{s.label}</div>
                <div className="text-lg font-mono font-bold text-amber-300 tabular-nums">
                  {s.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Age Progression Timeline */}
        <div className="py-4 border-b border-amber-200/10">
          <h3 className="text-sm font-bold text-[#fff8ee] mb-3">
            Progressão de Idade em Povoado Barriga
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {stageOrder.map((stId) => {
              const st = AGE_STAGES[stId];
              const unlocked = current.level >= st.minLevel;
              const isCurrent = current.stageId === stId;
              return (
                <div
                  key={stId}
                  className={`p-3 rounded-xl border ${
                    isCurrent
                      ? 'bg-amber-500/12 border-amber-400/50'
                      : unlocked
                      ? 'bg-[#261f19] border-amber-200/15'
                      : 'bg-[#15110e] border-stone-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#fff8ee]">
                      {st.label}
                    </span>
                    <span className="text-xs font-mono text-amber-300 tabular-nums">
                      {st.ageRange}
                    </span>
                  </div>
                  <div className="text-xs text-stone-300 mt-1">{st.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Quest */}
        <div className="py-4 border-b border-amber-200/10">
          <div className="text-xs font-medium text-amber-300 mb-1">
            {currentQuest.chapterLabel} · Missão Atual
          </div>
          <h3 className="text-base font-bold text-[#fff8ee] mb-1">
            {currentQuest.title}
          </h3>
          <p className="text-xs sm:text-sm text-stone-300 mb-3">
            {currentQuest.summary}
          </p>
          <div className="space-y-2">
            {currentQuest.objectives.map((obj) => {
              const done = save.completedObjectiveIds.includes(obj.id);
              return (
                <div
                  key={obj.id}
                  className="flex items-center gap-2.5 text-xs sm:text-sm"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                      done
                        ? 'bg-emerald-500 border-emerald-400 text-[#1b1612]'
                        : 'border-stone-600 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className={done ? 'line-through text-stone-400' : 'text-stone-100'}>
                    {obj.description}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Relics */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-bold text-[#fff8ee]">
              Relíquias do Povoado
            </h3>
            <span className="text-xs font-mono text-amber-300 tabular-nums">
              {save.collectedRelics.length}/{WORLD_RELICS.length} encontradas
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {WORLD_RELICS.map((rel) => {
              const found = save.collectedRelics.includes(rel.id);
              return (
                <div
                  key={rel.id}
                  className={`px-3 py-2 rounded-lg border text-xs ${
                    found
                      ? 'bg-[#261f19] border-amber-400/35 text-stone-100'
                      : 'bg-[#15110e] border-stone-800 text-stone-500'
                  }`}
                >
                  <div className="font-semibold">
                    {found ? rel.name : `Relíquia em ${rel.area}`}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {found ? rel.description : 'Explore esta área para encontrar.'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- ACHIEVEMENTS MODAL ---------------- */
export const AchievementsModal: React.FC<{
  save: GameSaveState;
  onClose: () => void;
}> = ({ save, onClose }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | AchievementDefinition['category']
  >('all');

  const unlockedCount = save.unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const completionPct = Math.round((unlockedCount / totalCount) * 100);
  const earnedBonusXp = ACHIEVEMENTS.reduce(
    (sum, a) =>
      save.unlockedAchievements.includes(a.id) ? sum + a.xpBonus : sum,
    0
  );

  const items = ACHIEVEMENTS.filter((a) => {
    const isUnlocked = save.unlockedAchievements.includes(a.id);
    if (statusFilter === 'unlocked' && !isUnlocked) return false;
    if (statusFilter === 'locked' && isUnlocked) return false;
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    return true;
  });

  const categories: ('all' | AchievementDefinition['category'])[] = [
    'all',
    'História',
    'Exploração',
    'Habilidade',
    'Vida no Povoado',
  ];

  return (
    <div className="fixed inset-0 z-40 bg-black/78 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-gradient-to-b from-[#231912] to-[#17110c] border-2 border-[#c88a36]/55 rounded-2xl shadow-2xl animate-modal-pop overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-[#c88a36]/25">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-[#1b120b] flex items-center justify-center shrink-0 shadow">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-xl sm:text-2xl font-bold text-[#fff5e1]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Salão das Conquistas
              </h2>
              <p className="text-xs text-[#cbb697] mt-0.5">
                Feitos memoráveis de Cleilson em Povoado Barriga
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Conquistas"
            className="p-2 rounded-lg text-[#cbb697] hover:bg-[#35251a] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Mastery Summary Strip */}
          <div className="bg-[#1b130d] border border-[#c88a36]/30 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <div className="text-[11px] text-[#cbb697]">Conquistadas</div>
                <div className="text-lg sm:text-xl font-mono font-bold text-[#fbbf24] tabular-nums">
                  {unlockedCount}/{totalCount}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#cbb697]">Conclusão</div>
                <div className="text-lg sm:text-xl font-mono font-bold text-[#fff5e1] tabular-nums">
                  {completionPct}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#cbb697]">XP Bônus Obtido</div>
                <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400 tabular-nums">
                  +{earnedBonusXp} XP
                </div>
              </div>
            </div>
            <div className="h-2.5 bg-[#0f0a06] border border-[#8c622a]/50 rounded-sm overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fde047] transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-[#140e09] border border-[#c88a36]/25 rounded-lg">
              {[
                { key: 'all' as const, label: 'Todas' },
                { key: 'unlocked' as const, label: 'Desbloqueadas' },
                { key: 'locked' as const, label: 'Bloqueadas' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.key
                      ? 'bg-[#d97706] text-[#140e09]'
                      : 'text-[#cbb697] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#140e09] border border-[#c88a36]/25 rounded-lg">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-[#3c291b] text-[#fde68a]'
                      : 'text-[#cbb697] hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'Todas Categorias' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Achievements Grid */}
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#cbb697]">
              Nenhuma conquista encontrada para este filtro.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {items.map((ach) => {
                const unlocked = save.unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-xl border transition-colors flex items-start gap-3.5 ${
                      unlocked
                        ? 'bg-[#2a1d13] border-[#d49b42]/55'
                        : 'bg-[#150f0a] border-stone-800/90 opacity-75'
                    }`}
                  >
                    {/* Engraved Medallion Frame */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 ${
                        unlocked
                          ? 'bg-gradient-to-b from-[#fbbf24] to-[#b45309] border-[#fef3c7]/60 text-[#1b120b] shadow-md'
                          : 'bg-[#1f1813] border-stone-700 text-stone-500'
                      }`}
                    >
                      {unlocked ? (
                        renderAchievementIcon(ach.iconKey)
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-[#fff5e1] leading-snug">
                          {ach.title}
                        </h3>
                        <span
                          className={`flex items-center gap-1 text-[11px] font-semibold shrink-0 whitespace-nowrap ${
                            unlocked ? 'text-emerald-400' : 'text-stone-500'
                          }`}
                        >
                          {unlocked ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Desbloqueada</span>
                            </>
                          ) : (
                            <span>Bloqueada</span>
                          )}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#d49b42] mt-0.5 font-mono tabular-nums">
                        {ach.category} · +{ach.xpBonus} XP
                      </div>

                      <p className="text-xs text-[#e7d6bd] mt-2 leading-relaxed">
                        {ach.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- WORLD MAP MODAL ---------------- */
export const WorldMapModal: React.FC<{
  save: GameSaveState;
  sceneName: string;
  isInterior: boolean;
  objectiveTarget: { x: number; y: number } | null;
  onFastTravelPlaza: () => void;
  onClose: () => void;
}> = ({ save, sceneName, isInterior, objectiveTarget, onFastTravelPlaza, onClose }) => {
  const scaleX = 100 / WORLD_WIDTH;
  const scaleY = 100 / WORLD_HEIGHT;
  const pinX =
    save.currentSceneId === 'povoado_principal'
      ? save.playerX
      : save.currentSceneId === 'roca_antiga'
      ? 90
      : save.lastOutdoorX;
  const pinY =
    save.currentSceneId === 'povoado_principal'
      ? save.playerY
      : save.currentSceneId === 'roca_antiga'
      ? 1900
      : save.lastOutdoorY;

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-3xl bg-[#1b1612] border-2 border-amber-300/30 rounded-2xl p-5 sm:p-6 shadow-2xl animate-modal-pop">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-amber-200/15 mb-4">
          <div>
            <h2
              className="text-xl sm:text-2xl font-bold text-[#fff8ee]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Mapa de Povoado Barriga
            </h2>
            <p className="text-xs text-stone-300 mt-0.5">
              Local atual: {sceneName}
              {isInterior ? ' (Ambiente Interno)' : ''} · Portas douradas permitem entrar nos prédios
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Mapa"
            className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SVG Vector Map */}
        <div className="relative w-full aspect-[16/10] bg-[#4c793b] rounded-xl border border-amber-200/20 overflow-hidden mb-4">
          <svg
            viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
            className="w-full h-full"
          >
            {/* Roads */}
            {WORLD_ROADS.map((road) => (
              <polyline
                key={road.id}
                fill="none"
                stroke="#c89f72"
                strokeWidth={road.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={road.points.map((p) => `${p.x},${p.y}`).join(' ')}
              />
            ))}

            {/* Plaza */}
            <rect
              x={PLAZA_RECT.x}
              y={PLAZA_RECT.y}
              width={PLAZA_RECT.width}
              height={PLAZA_RECT.height}
              fill="#d6c7b2"
              stroke="#785a3c"
              strokeWidth={12}
            />

            {/* Soccer Field */}
            <rect
              x={SOCCER_FIELD_RECT.x}
              y={SOCCER_FIELD_RECT.y}
              width={SOCCER_FIELD_RECT.width}
              height={SOCCER_FIELD_RECT.height}
              fill="#2f8f3c"
              stroke="#ffffff"
              strokeWidth={8}
            />

            {/* Buildings */}
            {WORLD_BUILDINGS.map((b) => (
              <rect
                key={b.id}
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                rx={8}
                fill={b.roofColor}
                stroke="#1b1612"
                strokeWidth={8}
              />
            ))}

            {/* Labels */}
            <g fontSize="58" fontWeight="700" fill="#fff8ee" textAnchor="middle">
              <text x="1200" y="1065">Praça Central</text>
              <text x="470" y="160">Escola</text>
              <text x="765" y="905" fontSize="50">Igreja</text>
              <text x="2000" y="165">Campo de Futebol</text>
              <text x="645" y="1310" fontSize="50">Mercadinho</text>
              <text x="1770" y="1540">Vila Sul</text>
              <text x="3220" y="790" fill="#fde68a">Torre de Rádio</text>
              <text x="350" y="2040" fill="#fde68a" fontSize="48">↙ Sítio da Roça Antiga</text>
            </g>

            {/* Objective Beacon */}
            {objectiveTarget && (
              <circle
                cx={objectiveTarget.x}
                cy={objectiveTarget.y}
                r={52}
                fill="rgba(251, 191, 36, 0.35)"
                stroke="#fbbf24"
                strokeWidth={14}
              />
            )}

            {/* Player Pin */}
            <circle
              cx={pinX}
              cy={pinY}
              r={46}
              fill="#38bdf8"
              stroke="#ffffff"
              strokeWidth={14}
            />
          </svg>

          {/* Subtle legend strip */}
          <div className="absolute bottom-2 left-2 bg-[#1b1612]/85 px-2.5 py-1 rounded text-[11px] text-stone-200 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              {save.currentSceneId === 'roca_antiga'
                ? 'Cleilson (no Sítio da Roça Antiga)'
                : isInterior
                ? `Cleilson (dentro de ${sceneName})`
                : `Cleilson (${Math.round(pinX * scaleX)}%, ${Math.round(pinY * scaleY)}%)`}
            </span>
            {objectiveTarget && (
              <span className="flex items-center gap-1 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Objetivo Atual
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-stone-300">
            Progresso da História: {save.completedQuestIds.filter((q) => MAIN_QUEST_ORDER.includes(q)).length}/{MAIN_QUEST_ORDER.length} capítulos · Áreas visitadas: {save.visitedScenes.length}/8
          </div>
          <button
            type="button"
            onClick={() => {
              onFastTravelPlaza();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#1b1612] font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
          >
            <MapPin className="w-4 h-4" />
            <span>Voltar para a Casa na Praça</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- PAUSE MODAL ---------------- */
export const PauseModal: React.FC<{
  onResume: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
}> = ({ onResume, onRestart, onQuitToTitle }) => (
  <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
    <div className="w-full max-w-sm bg-[#1b1612] border-2 border-amber-300/35 rounded-2xl p-6 shadow-2xl animate-modal-pop text-center">
      <h2
        className="text-2xl font-bold text-[#fff8ee] mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Jogo Pausado
      </h2>
      <p className="text-xs text-stone-300 mb-5">
        Seu progresso é salvo automaticamente em Povoado Barriga.
      </p>
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onResume}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#1b1612] font-bold text-sm cursor-pointer"
        >
          Continuar Jogando
        </button>
        <button
          type="button"
          onClick={onQuitToTitle}
          className="w-full py-3 rounded-xl bg-[#2a2119] hover:bg-[#3a2d22] border border-amber-200/20 text-amber-100 font-semibold text-sm cursor-pointer"
        >
          Voltar ao Menu Inicial
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="w-full py-2.5 rounded-xl text-stone-400 hover:text-red-300 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reiniciar Aventura do Zero</span>
        </button>
      </div>
    </div>
  </div>
);

/* ---------------- VICTORY MODAL ---------------- */
export const VictoryModal: React.FC<{
  save: GameSaveState;
  onKeepExploring: () => void;
  onRestart: () => void;
}> = ({ save, onKeepExploring, onRestart }) => {
  const { current } = getLevelInfoFromXP(save.xp);
  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#1b1612] border-2 border-amber-400/50 rounded-2xl p-6 sm:p-7 shadow-2xl animate-modal-pop text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500 text-[#1b1612] flex items-center justify-center mb-4">
          <Crown className="w-8 h-8" />
        </div>
        <h2
          className="text-2xl sm:text-3xl font-bold text-[#fff8ee] mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Lenda de Povoado Barriga!
        </h2>
        <p className="text-sm text-stone-200 leading-relaxed mb-5">
          Daquela simples viagem de carroça da roça aos 8 anos até a transmissão
          do Grande Festival aos {current.age} anos pela Torre de Rádio, Cleilson
          se tornou parte viva da história de Povoado Barriga!
        </p>

        <div className="grid grid-cols-3 gap-2.5 mb-6 text-left">
          <div className="bg-[#261f19] rounded-xl p-3 border border-amber-200/15">
            <div className="text-[11px] text-stone-400">Nível & Idade</div>
            <div className="text-base font-mono font-bold text-amber-300 tabular-nums">
              Nv.{current.level} · {current.age}a
            </div>
          </div>
          <div className="bg-[#261f19] rounded-xl p-3 border border-amber-200/15">
            <div className="text-[11px] text-stone-400">Conquistas</div>
            <div className="text-base font-mono font-bold text-amber-300 tabular-nums">
              {save.unlockedAchievements.length}/{ACHIEVEMENTS.length}
            </div>
          </div>
          <div className="bg-[#261f19] rounded-xl p-3 border border-amber-200/15">
            <div className="text-[11px] text-stone-400">Relíquias</div>
            <div className="text-base font-mono font-bold text-amber-300 tabular-nums">
              {save.collectedRelics.length}/{WORLD_RELICS.length}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onKeepExploring}
            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#1b1612] font-bold text-sm cursor-pointer"
          >
            Continuar Explorando o Povoado
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="py-3 px-4 rounded-xl bg-[#2a2119] hover:bg-[#3a2d22] border border-amber-200/20 text-amber-100 font-semibold text-sm cursor-pointer"
          >
            Jogar Novamente
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- TOAST OVERLAY ---------------- */
export const ToastOverlay: React.FC<{ toasts: ToastNotification[] }> = ({
  toasts,
}) => {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full max-w-sm px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in w-full bg-[#1b1612]/95 border-2 border-amber-400/60 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-[#1b1612] flex items-center justify-center shrink-0">
            {t.kind === 'achievement' ? (
              <Award className="w-5 h-5" />
            ) : t.kind === 'age' ? (
              <Sprout className="w-5 h-5" />
            ) : t.kind === 'relic' ? (
              <Gem className="w-5 h-5" />
            ) : (
              <Star className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-amber-300 truncate">
              {t.title}
            </div>
            <div className="text-xs text-stone-100 truncate">{t.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
