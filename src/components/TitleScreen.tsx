import React, { useEffect } from 'react';
import { Volume2, VolumeX, Play, RotateCcw } from 'lucide-react';

interface TitleScreenProps {
  hasSave: boolean;
  savedLevel: number;
  savedAge: number;
  muted: boolean;
  onToggleMute: () => void;
  onStartNew: () => void;
  onContinue: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSave,
  savedLevel,
  savedAge,
  muted,
  onToggleMute,
  onStartNew,
  onContinue,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (hasSave) onContinue();
        else onStartNew();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasSave, onContinue, onStartNew]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#1b1612] select-none">
      {/* Key Art Backdrop */}
      <img
        src="/src/assets/images/povoado_barriga_keyart_1794965931487.jpg"
        alt="Ilustração de Cleilson chegando de carroça em Povoado Barriga"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Measured contrast scrim */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(18, 13, 9, 0.88) 0%, rgba(18, 13, 9, 0.62) 44%, rgba(18, 13, 9, 0.18) 100%)',
        }}
      />

      {/* Top-right sound toggle */}
      <div className="absolute top-5 right-5 z-20">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Ativar som' : 'Silenciar som'}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#1b1612]/80 border border-amber-200/20 text-amber-100 hover:bg-[#2a2119] transition-colors text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span>{muted ? 'Som Desligado' : 'Som Ligado'}</span>
        </button>
      </div>

      {/* Left-aligned Title Lockup over calm sky/scrim space */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-10 md:p-14 max-w-2xl">
        <div className="mt-2 sm:mt-6">
          {/* Bespoke inline SVG crest & title lockup */}
          <div className="flex items-center gap-3 mb-4">
            <svg
              width="44"
              height="44"
              viewBox="0 0 44 44"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle cx="22" cy="22" r="20" fill="#2a2119" stroke="#f59e0b" strokeWidth="2" />
              {/* Radio tower + sun horizon */}
              <path
                d="M12 31H32M22 10L16 31M22 10L28 31M18.5 20H25.5M17 25.5H27"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="22" cy="9" r="2.5" fill="#ef4444" />
            </svg>
            <span className="text-xs font-medium tracking-wider text-amber-300/90 uppercase">
              RPG de Aventura Rural
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#fff8ee] leading-[1.06] tracking-tight mb-4"
            style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
          >
            Povoado Barriga
          </h1>

          <p className="text-lg sm:text-xl text-amber-200 font-medium mb-3">
            As Aventuras de Cleilson
          </p>

          <p className="text-sm sm:text-base text-stone-200/90 leading-relaxed max-w-lg">
            Da viagem de carroça saindo de uma roça distante até a vida na Praça Central.
            Cresça com Cleilson da infância à fase adulta explorando a escola, o campo de
            futebol e a torre de transmissão de rádio.
          </p>
        </div>

        {/* Primary CTA cluster */}
        <div className="flex flex-col gap-4 mb-2">
          <div className="flex flex-wrap items-center gap-3">
            {hasSave ? (
              <>
                <button
                  type="button"
                  onClick={onContinue}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#1b1612] font-bold text-base shadow-lg transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>
                    Continuar Jornada (Nível {savedLevel} · {savedAge} anos)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onStartNew}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-lg bg-[#2a2119]/90 hover:bg-[#3a2d22] border border-amber-200/25 text-amber-100 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Novo Jogo</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onStartNew}
                className="flex items-center gap-2.5 px-7 py-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#1b1612] font-bold text-base shadow-lg transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Começar Aventura</span>
              </button>
            )}
          </div>

          {/* Single flat control-hint line */}
          <p className="text-xs sm:text-sm text-stone-300/85 font-medium tracking-wide">
            WASD ou Setas Mover · E Interagir · Shift Correr · Toque Analógico no Mobile · Enter Iniciar
          </p>
        </div>
      </div>
    </div>
  );
};
