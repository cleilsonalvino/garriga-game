import React, { useEffect, useRef, useState } from 'react';
import { Radio, Trophy, BookOpen, Feather, X, CheckCircle2 } from 'lucide-react';
import { ActiveMiniGame } from '../game/types';
import { soundEngine } from '../game/audio';

export interface MiniGameResult {
  game: ActiveMiniGame;
  won: boolean;
  score: number;
  perfect?: boolean;
}

interface MiniGameModalProps {
  game: ActiveMiniGame;
  isFestivalBroadcast?: boolean;
  onComplete: (result: MiniGameResult) => void;
  onCancel: () => void;
}

export const MiniGameModal: React.FC<MiniGameModalProps> = ({
  game,
  isFestivalBroadcast = false,
  onComplete,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-3 sm:p-6 select-none">
      <div className="w-full max-w-xl bg-[#1b1612] border-2 border-amber-300/35 rounded-2xl p-5 sm:p-6 shadow-2xl animate-modal-pop">
        {game === 'SCHOOL_QUIZ' && (
          <SchoolQuizGame onComplete={onComplete} onCancel={onCancel} />
        )}
        {game === 'SOCCER_PENALTY' && (
          <SoccerPenaltyGame onComplete={onComplete} onCancel={onCancel} />
        )}
        {game === 'RADIO_TUNER' && (
          <RadioTunerGame
            isFestivalBroadcast={isFestivalBroadcast}
            onComplete={onComplete}
            onCancel={onCancel}
          />
        )}
        {game === 'CHICKEN_HERD' && (
          <ChickenHerdGame onComplete={onComplete} onCancel={onCancel} />
        )}
      </div>
    </div>
  );
};

/* ---------------- 1. SCHOOL QUIZ ---------------- */
const QUIZ_QUESTIONS = [
  {
    q: 'Qual meio de transporte trouxe Cleilson e sua família da roça até Povoado Barriga?',
    options: ['Carroça', 'Trem a vapor', 'Barco a remo'],
    correct: 0,
  },
  {
    q: 'Saindo da Praça Central pelo meio da lateral direita, qual marco fica no fim da avenida?',
    options: [
      'O Porto do Rio',
      'A Torre de Transmissão de Rádio',
      'A Estação Ferroviária',
    ],
    correct: 1,
  },
  {
    q: 'Se Meda colheu 18 espigas de milho e dividiu igualmente em 3 cestos, quantas ficaram em cada cesto?',
    options: ['5 espigas', '6 espigas', '9 espigas'],
    correct: 1,
  },
  {
    q: 'Quantas ruas principais saem diretamente dos quatro cantos da Praça Central?',
    options: ['2 ruas', '3 ruas', '4 ruas (uma em cada canto)'],
    correct: 2,
  },
];

const SchoolQuizGame: React.FC<{
  onComplete: (r: MiniGameResult) => void;
  onCancel: () => void;
}> = ({ onComplete, onCancel }) => {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const current = QUIZ_QUESTIONS[idx];

  const handlePick = (optIdx: number) => {
    if (picked !== null) return;
    setPicked(optIdx);
    const isRight = optIdx === current.correct;
    if (isRight) {
      soundEngine.playCollect();
    } else {
      soundEngine.playMiss();
    }
    const nextScore = score + (isRight ? 1 : 0);

    window.setTimeout(() => {
      if (idx < QUIZ_QUESTIONS.length - 1) {
        setScore(nextScore);
        setIdx((i) => i + 1);
        setPicked(null);
      } else {
        onComplete({
          game: 'SCHOOL_QUIZ',
          won: nextScore >= 2,
          score: nextScore,
          perfect: nextScore === QUIZ_QUESTIONS.length,
        });
      }
    }, 750);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-sky-400" />
          <h3
            className="text-lg sm:text-xl font-bold text-[#fff8ee]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Gincana da Escola Municipal
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Sair"
          className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Green Chalkboard */}
      <div className="bg-[#1b4332] border-4 border-[#7c4a2d] rounded-xl p-4 sm:p-5 mb-4">
        <div className="flex justify-between text-xs text-emerald-200 font-mono tabular-nums mb-2">
          <span>
            Questão {idx + 1}/{QUIZ_QUESTIONS.length}
          </span>
          <span>Acertos: {score}</span>
        </div>
        <p className="text-base sm:text-lg font-semibold text-white leading-snug">
          {current.q}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {current.options.map((opt, oIdx) => {
          let style =
            'bg-[#2a2119] hover:bg-amber-500/20 border-amber-200/20 text-stone-100';
          if (picked !== null) {
            if (oIdx === current.correct) {
              style = 'bg-emerald-700 border-emerald-400 text-white';
            } else if (oIdx === picked) {
              style = 'bg-red-800 border-red-400 text-white';
            }
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handlePick(oIdx)}
              className={`w-full text-left px-4 py-3 rounded-xl border font-medium text-sm sm:text-base transition-colors cursor-pointer ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- 2. SOCCER PENALTY ---------------- */
const SoccerPenaltyGame: React.FC<{
  onComplete: (r: MiniGameResult) => void;
  onCancel: () => void;
}> = ({ onComplete, onCancel }) => {
  const [round, setRound] = useState(1);
  const [goals, setGoals] = useState(0);
  const [aimPos, setAimPos] = useState(50); // 10..90% across goal
  const [keeperPos, setKeeperPos] = useState(50);
  const [phase, setPhase] = useState<'AIM' | 'RESULT'>('AIM');
  const [lastOutcome, setLastOutcome] = useState<string>('');
  const aimDirRef = useRef(1);
  const keeperTargetRef = useRef(50);

  useEffect(() => {
    if (phase !== 'AIM') return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      setAimPos((prev) => {
        const speed = 78 + round * 14;
        let next = prev + aimDirRef.current * speed * dt;
        if (next >= 90) {
          next = 90;
          aimDirRef.current = -1;
        } else if (next <= 10) {
          next = 10;
          aimDirRef.current = 1;
        }
        return next;
      });

      setKeeperPos((prev) => {
        if (Math.abs(prev - keeperTargetRef.current) < 3) {
          keeperTargetRef.current = 18 + Math.random() * 64;
        }
        const dir = keeperTargetRef.current > prev ? 1 : -1;
        return prev + dir * (38 + round * 6) * dt;
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, round]);

  const shoot = () => {
    if (phase !== 'AIM') return;
    soundEngine.playSoccerKick();
    const keeperDive = 15 + Math.random() * 70;
    setKeeperPos(keeperDive);

    const isGoal = Math.abs(aimPos - keeperDive) > 16;
    const nextGoals = goals + (isGoal ? 1 : 0);

    if (isGoal) {
      soundEngine.playGoal();
      setGoals(nextGoals);
      setLastOutcome('GOOOL! Na gaveta do Vitor!');
    } else {
      soundEngine.playMiss();
      setLastOutcome('Defendeu! Vitor pulou no canto certo!');
    }
    setPhase('RESULT');

    window.setTimeout(() => {
      if (round < 5) {
        setRound((r) => r + 1);
        setPhase('AIM');
        setLastOutcome('');
      } else {
        onComplete({
          game: 'SOCCER_PENALTY',
          won: nextGoals >= 3,
          score: nextGoals,
          perfect: nextGoals === 5,
        });
      }
    }, 950);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        shoot();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3
            className="text-lg sm:text-xl font-bold text-[#fff8ee]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Pênaltis no Campo de Barriga
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Sair"
          className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-between text-xs sm:text-sm font-mono text-stone-200 tabular-nums mb-3">
        <span>Cobrança {round}/5</span>
        <span className="text-amber-300 font-bold">
          Gols: {goals} (Meta: 3)
        </span>
      </div>

      {/* Pitch & Goal Frame */}
      <div className="relative h-56 rounded-xl bg-[#2d7a36] border-2 border-emerald-200/30 overflow-hidden mb-4 flex flex-col justify-between p-4">
        {/* Goal Net Box */}
        <div className="relative mx-auto w-full max-w-md h-28 border-4 border-b-0 border-white bg-black/20 rounded-t-md">
          {/* Goalkeeper Vitor */}
          <div
            className="absolute bottom-0 w-10 h-14 -ml-5 flex flex-col items-center justify-end transition-transform duration-150"
            style={{ left: `${keeperPos}%` }}
          >
            <div className="w-5 h-5 rounded-full bg-[#b97b52] border border-black/40" />
            <div className="w-8 h-8 rounded-t bg-yellow-400 border border-black/40 flex items-center justify-center text-[10px] font-bold text-black">
              VT
            </div>
          </div>

          {/* Aim Reticle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -ml-4 w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-400/20 flex items-center justify-center pointer-events-none"
            style={{ left: `${aimPos}%` }}
          >
            <div className="w-2 h-2 rounded-full bg-amber-300" />
          </div>
        </div>

        {/* Penalty Spot & Ball */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={`w-7 h-7 rounded-full bg-white border-2 border-stone-900 shadow-md transition-transform duration-200 ${
              phase === 'RESULT' ? '-translate-y-24 scale-75' : ''
            }`}
          />
          <span className="text-xs font-semibold text-white/95 min-h-[1.2rem]">
            {lastOutcome || 'Toque em Chutar ou aperte Espaço quando a mira estiver livre!'}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={shoot}
        disabled={phase !== 'AIM'}
        className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#1b1612] font-bold text-base cursor-pointer active:scale-95 transition-transform"
      >
        Chutar ao Gol!
      </button>
    </div>
  );
};

/* ---------------- 3. RADIO TOWER TUNER ---------------- */
const RadioTunerGame: React.FC<{
  isFestivalBroadcast: boolean;
  onComplete: (r: MiniGameResult) => void;
  onCancel: () => void;
}> = ({ isFestivalBroadcast, onComplete, onCancel }) => {
  const [targetFreq] = useState(() =>
    isFestivalBroadcast ? 98.5 : Number((91 + Math.random() * 14).toFixed(1))
  );
  const [targetAmp] = useState(() => Math.round(45 + Math.random() * 35));
  const [freq, setFreq] = useState(88.5);
  const [amp, setAmp] = useState(30);
  const [broadcastMessage, setBroadcastMessage] = useState(
    isFestivalBroadcast ? 'festival' : 'chuva'
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const freqDiff = Math.abs(freq - targetFreq);
  const ampDiff = Math.abs(amp - targetAmp);
  const quality = Math.max(
    0,
    Math.round(100 - freqDiff * 9.5 - ampDiff * 0.9)
  );
  const isLocked = quality >= 88;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#0c1614';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.14)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Target wave (amber/red)
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const y =
          h / 2 +
          Math.sin(x * (targetFreq * 0.0022) + t * 4) * (targetAmp * 0.45);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Player wave (emerald)
      ctx.strokeStyle = isLocked ? '#34d399' : '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const noise = isLocked ? 0 : (Math.random() - 0.5) * (100 - quality) * 0.12;
        const y =
          h / 2 +
          Math.sin(x * (freq * 0.0022) + t * 4) * (amp * 0.45) +
          noise;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [freq, amp, targetFreq, targetAmp, isLocked, quality]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <Radio className="w-5 h-5 text-red-400" />
          <h3
            className="text-lg sm:text-xl font-bold text-[#fff8ee]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Torre de Transmissão · Rádio Barriga
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Sair"
          className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-xs sm:text-sm text-stone-300 mb-3">
        Alinhe a onda azul com a onda dourada alvo ({targetFreq.toFixed(1)} MHz) para
        liberar a transmissão da torre!
      </p>

      {/* Oscilloscope */}
      <canvas
        ref={canvasRef}
        width={480}
        height={130}
        className="w-full h-32 rounded-xl border border-emerald-400/30 mb-4"
      />

      {/* Readouts */}
      <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-3">
        <span className="text-sky-300">Sua Frequência: {freq.toFixed(1)} MHz</span>
        <span className={isLocked ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
          Qualidade do Sinal: {quality}% {isLocked ? '· SINCRONIZADO' : ''}
        </span>
      </div>

      {/* Sliders */}
      <div className="space-y-3 mb-4">
        <label className="block">
          <span className="text-xs text-stone-300 block mb-1">
            Sintonia de Frequência (MHz)
          </span>
          <input
            type="range"
            min={88}
            max={108}
            step={0.1}
            value={freq}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setFreq(v);
              soundEngine.playRadioTune(Math.abs(v - targetFreq) < 0.6);
            }}
            className="w-full accent-amber-500 cursor-pointer h-3"
          />
        </label>

        <label className="block">
          <span className="text-xs text-stone-300 block mb-1">
            Potência da Antena ({amp}%)
          </span>
          <input
            type="range"
            min={20}
            max={95}
            step={1}
            value={amp}
            onChange={(e) => setAmp(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-400 cursor-pointer h-3"
          />
        </label>

        {!isFestivalBroadcast && (
          <div>
            <span className="text-xs text-stone-300 block mb-1.5">
              Programa para transmitir pela Torre:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBroadcastMessage('chuva')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                  broadcastMessage === 'chuva'
                    ? 'bg-amber-500 text-[#1b1612] border-amber-400'
                    : 'bg-[#2a2119] text-stone-200 border-amber-200/20'
                }`}
              >
                Alerta de Chuva na Roça
              </button>
              <button
                type="button"
                onClick={() => setBroadcastMessage('musica')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                  broadcastMessage === 'musica'
                    ? 'bg-amber-500 text-[#1b1612] border-amber-400'
                    : 'bg-[#2a2119] text-stone-200 border-amber-200/20'
                }`}
              >
                Moda de Viola & Recados
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!isLocked}
        onClick={() => {
          soundEngine.playRadioTune(true);
          onComplete({
            game: 'RADIO_TUNER',
            won: true,
            score: quality,
            perfect: quality >= 96,
          });
        }}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-700 disabled:text-stone-400 text-[#1b1612] font-bold text-sm sm:text-base transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-5 h-5" />
        <span>
          {isLocked
            ? isFestivalBroadcast
              ? 'Transmitir Grande Festival Ao Vivo!'
              : 'Transmitir Sinal pela Torre!'
            : 'Alinhe o sinal acima de 88% para transmitir'}
        </span>
      </button>
    </div>
  );
};

/* ---------------- 4. CHICKEN HERD ---------------- */
const ChickenHerdGame: React.FC<{
  onComplete: (r: MiniGameResult) => void;
  onCancel: () => void;
}> = ({ onComplete, onCancel }) => {
  const [caught, setCaught] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [chickens, setChickens] = useState(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 15 + ((i * 19) % 70),
      y: 20 + ((i * 29) % 60),
      alive: true,
    }))
  );

  useEffect(() => {
    const moveTimer = window.setInterval(() => {
      setChickens((prev) =>
        prev.map((c) =>
          c.alive
            ? {
                ...c,
                x: Math.max(10, Math.min(88, c.x + (Math.random() - 0.5) * 26)),
                y: Math.max(15, Math.min(82, c.y + (Math.random() - 0.5) * 24)),
              }
            : c
        )
      );
    }, 650);

    const countdown = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(countdown);
          window.clearInterval(moveTimer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(moveTimer);
      window.clearInterval(countdown);
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 || caught === 6) {
      const t = window.setTimeout(() => {
        onComplete({
          game: 'CHICKEN_HERD',
          won: caught >= 4,
          score: caught,
          perfect: caught === 6,
        });
      }, 450);
      return () => window.clearTimeout(t);
    }
  }, [timeLeft, caught, onComplete]);

  const catchChicken = (id: number) => {
    soundEngine.playChickenCluck();
    setChickens((prev) => prev.map((c) => (c.id === id ? { ...c, alive: false } : c)));
    setCaught((n) => n + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <Feather className="w-5 h-5 text-amber-400" />
          <h3
            className="text-lg sm:text-xl font-bold text-[#fff8ee]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Galinhas do Seu Chico
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Sair"
          className="p-2 rounded-lg text-stone-400 hover:bg-stone-800 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex justify-between text-xs sm:text-sm font-mono tabular-nums mb-3">
        <span className="text-amber-300">Recolhidas: {caught}/6</span>
        <span className="text-stone-300">Tempo: {timeLeft}s</span>
      </div>

      <div className="relative h-60 rounded-xl bg-[#4f7c3c] border-2 border-amber-800/60 overflow-hidden">
        {chickens.map(
          (c) =>
            c.alive && (
              <button
                key={c.id}
                type="button"
                onClick={() => catchChicken(c.id)}
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-amber-50 border-2 border-amber-900 shadow-md flex items-center justify-center text-xs font-bold text-amber-900 hover:scale-110 active:scale-90 transition-all duration-300 cursor-pointer"
              >
                Pó-pó
              </button>
            )
        )}
      </div>
    </div>
  );
};
