import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { DialogueChoice, DialogueLine } from '../game/types';
import { soundEngine } from '../game/audio';

interface DialogueBoxProps {
  lines: DialogueLine[];
  onChoice: (choice: DialogueChoice) => void;
  onClose: () => void;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  lines,
  onChoice,
  onClose,
}) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [revealedChars, setRevealedChars] = useState(0);

  const currentLine = lines[lineIndex];
  const fullText = currentLine ? currentLine.text : '';
  const isDoneTyping = revealedChars >= fullText.length;

  useEffect(() => {
    setLineIndex(0);
    setRevealedChars(0);
  }, [lines]);

  useEffect(() => {
    if (!currentLine) return;
    if (revealedChars >= fullText.length) return;

    const timer = window.setTimeout(() => {
      setRevealedChars((c) => c + 2);
      if (revealedChars % 6 === 0) {
        soundEngine.playDialogueBlip(400);
      }
    }, 18);

    return () => window.clearTimeout(timer);
  }, [revealedChars, fullText, currentLine]);

  const handleAdvance = () => {
    if (!currentLine) return;
    if (!isDoneTyping) {
      setRevealedChars(fullText.length);
      return;
    }
    if (currentLine.choices && currentLine.choices.length > 0) {
      return;
    }
    soundEngine.playSelect();
    if (lineIndex < lines.length - 1) {
      setLineIndex((i) => i + 1);
      setRevealedChars(0);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
        if (!currentLine?.choices || !isDoneTyping) {
          e.preventDefault();
          handleAdvance();
        }
      }
      if (isDoneTyping && currentLine?.choices) {
        const num = Number(e.key);
        if (num >= 1 && num <= currentLine.choices.length) {
          e.preventDefault();
          const chosen = currentLine.choices[num - 1];
          soundEngine.playSelect();
          onChoice(chosen);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!currentLine) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 p-3 sm:p-6 flex justify-center pointer-events-auto">
      <div className="w-full max-w-2xl bg-[#1b1612]/96 border-2 border-amber-300/35 rounded-2xl p-4 sm:p-5 shadow-2xl animate-modal-pop">
        {/* Speaker header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[#1b1612] text-base shrink-0 border border-white/20"
            style={{ backgroundColor: currentLine.avatarColor }}
          >
            {currentLine.speaker.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-bold text-[#fff8ee]">
              {currentLine.speaker}
            </div>
            <div className="text-xs text-amber-300/90">{currentLine.role}</div>
          </div>
        </div>

        {/* Typewriter dialogue text */}
        <p
          onClick={handleAdvance}
          className="text-sm sm:text-base text-stone-100 leading-relaxed min-h-[3.2rem] cursor-pointer"
        >
          {fullText.slice(0, revealedChars)}
        </p>

        {/* Choices or Continue button */}
        {isDoneTyping && currentLine.choices && currentLine.choices.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2">
            {currentLine.choices.map((ch, idx) => (
              <button
                key={ch.label}
                type="button"
                onClick={() => {
                  soundEngine.playSelect();
                  if (ch.nextLineIndex !== undefined) {
                    setLineIndex(ch.nextLineIndex);
                    setRevealedChars(0);
                  } else {
                    onChoice(ch);
                  }
                }}
                className="w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#2a2119] hover:bg-amber-500 hover:text-[#1b1612] border border-amber-300/25 text-amber-100 text-sm font-medium transition-colors cursor-pointer"
              >
                <span>
                  <span className="font-mono text-xs opacity-75 mr-2">
                    [{idx + 1}]
                  </span>
                  {ch.label}
                </span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleAdvance}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#1b1612] font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
            >
              <span>
                {!isDoneTyping
                  ? 'Completar'
                  : lineIndex < lines.length - 1
                  ? 'Continuar'
                  : 'Fechar'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
