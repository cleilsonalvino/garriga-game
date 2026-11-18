import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, SkipForward } from 'lucide-react';
import { drawCarroca } from '../game/renderer';
import { soundEngine } from '../game/audio';

interface PrologueCutsceneProps {
  onComplete: () => void;
}

const STORY_SLIDES = [
  {
    title: 'Longe dali, na Roça Afastada...',
    text: 'Durante seus primeiros anos, Cleilson (8 anos) morava com seus pais em uma roça bem afastada, cercada por pastos altos e estradas de terra.',
  },
  {
    title: 'A Viagem de Carroça',
    text: 'Numa manhã dourada, a família colocou as malas na carroça e partiu rumo a uma nova vida em um lugar pequeno e acolhedor: Povoado Barriga.',
  },
  {
    title: 'Chegada à Praça Central',
    text: 'As rodas param nos paralelepípedos da Praça. Daqui saem ruas em cada canto — para a Escola, o Campo, a Roça — e uma avenida à direita até a Torre de Rádio!',
  },
];

export const PrologueCutscene: React.FC<PrologueCutsceneProps> = ({
  onComplete,
}) => {
  const [step, setStep] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stepRef = useRef(0);

  useEffect(() => {
    stepRef.current = step;
    soundEngine.playCartCreak();
  }, [step]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.68);
      sky.addColorStop(0, '#1e3a5f');
      sky.addColorStop(0.55, '#d97706');
      sky.addColorStop(1, '#fde68a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Sun
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.28, 38, 0, Math.PI * 2);
      ctx.fill();

      // Rolling hills
      ctx.fillStyle = '#3f6a34';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      for (let x = 0; x <= w; x += 40) {
        const y = h * 0.56 + Math.sin(x * 0.006 + t * 0.4) * 18;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Distant radio tower silhouette on step >= 1
      if (stepRef.current >= 1) {
        const tx = w * 0.84;
        const ty = h * 0.54;
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tx - 14, ty);
        ctx.lineTo(tx, ty - 95);
        ctx.lineTo(tx + 14, ty);
        ctx.stroke();
        if (Math.sin(t * 5) > 0) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(tx, ty - 98, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ground meadow + dirt road
      ctx.fillStyle = '#4d7c3f';
      ctx.fillRect(0, h * 0.64, w, h * 0.36);

      ctx.fillStyle = '#b98b5c';
      ctx.fillRect(0, h * 0.73, w, 64);
      ctx.fillStyle = '#9a6e43';
      ctx.fillRect(0, h * 0.73, w, 6);
      ctx.fillRect(0, h * 0.73 + 58, w, 6);

      // Moving fence posts
      const scroll = (t * 95) % 90;
      ctx.fillStyle = '#5c331c';
      for (let x = -scroll; x < w + 90; x += 90) {
        ctx.fillRect(x, h * 0.69, 6, 22);
      }

      // Carroça traveling left-to-right across slides
      const targetProgress = (stepRef.current + 0.45) / 3;
      const wagonX = Math.min(w * 0.72, w * 0.18 + w * 0.48 * targetProgress + Math.sin(t * 2) * 4);
      const wagonY = h * 0.75 + Math.sin(t * 9) * 1.5;

      ctx.save();
      ctx.translate(wagonX, wagonY);
      ctx.scale(1.35, 1.35);
      drawCarroca(ctx, 0, 0, t * 4.5);
      // Cleilson waving on top of wagon
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-16, -34, 10, 12);
      ctx.fillStyle = '#d99b6c';
      ctx.beginPath();
      ctx.arc(-11, -39, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-18, -44, 14, 3);
      ctx.restore();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleNext = () => {
    soundEngine.playSelect();
    if (step < STORY_SLIDES.length - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete();
    }
  };

  const slide = STORY_SLIDES[step];

  return (
    <div className="relative w-full h-full bg-[#1b1612] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top Skip button */}
      <div className="absolute top-5 right-5 z-20">
        <button
          type="button"
          onClick={() => {
            soundEngine.playSelect();
            onComplete();
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1b1612]/80 border border-amber-200/20 text-amber-100 hover:bg-[#2a2119] text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>Pular Prólogo</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Narrative Card */}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8 z-20 flex justify-center">
        <div className="w-full max-w-2xl bg-[#1b1612]/92 border border-amber-300/25 rounded-xl p-5 sm:p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-xs font-medium text-amber-300 tabular-nums">
              Prólogo · Parte {step + 1} de {STORY_SLIDES.length}
            </span>
          </div>
          <h2
            className="text-xl sm:text-2xl font-bold text-[#fff8ee] mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {slide.title}
          </h2>
          <p className="text-sm sm:text-base text-stone-200 leading-relaxed mb-5">
            {slide.text}
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#1b1612] font-bold text-sm transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>
                {step < STORY_SLIDES.length - 1
                  ? 'Continuar Viagem'
                  : 'Descer na Praça Central'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
