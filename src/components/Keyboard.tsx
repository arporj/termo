import React, { useEffect } from 'react';
import { checkGuess, normalizeText } from '../utils/gameLogic';
import type { LetterState } from '../utils/gameLogic';

interface KeyboardProps {
  onChar: (value: string) => void;
  onDelete: () => void;
  onEnter: () => void;
  guessesByBoard: string[][];
  answers: string[];
}

export const Keyboard: React.FC<KeyboardProps> = ({
  onChar,
  onDelete,
  onEnter,
  guessesByBoard,
  answers
}) => {
  // Mapeamento para determinar o estado de cor de cada caractere no teclado virtual
  const getLetterStatuses = (): Record<string, LetterState> => {
    const statuses: Record<string, LetterState> = {};

    guessesByBoard.forEach((boardGuesses, boardIdx) => {
      const answer = answers[boardIdx];
      const isSolved = boardGuesses.includes(answer);

      // Se o tabuleiro já foi resolvido, as tentativas dele não influenciam mais no teclado
      // de forma a atrapalhar as palavras restantes
      if (isSolved) return;

      boardGuesses.forEach((guess) => {
        const letterStates = checkGuess(guess, answer);
        const normGuess = normalizeText(guess);

        for (let i = 0; i < normGuess.length; i++) {
          const char = normGuess[i].toUpperCase();
          const state = letterStates[i];

          // Hierarquia de relevância das cores no teclado: correct (verde) > present (amarelo) > absent (cinza)
          if (!statuses[char] || state === 'correct') {
            statuses[char] = state;
          } else if (state === 'present' && statuses[char] !== 'correct') {
            statuses[char] = 'present';
          } else if (state === 'absent' && !statuses[char]) {
            statuses[char] = 'absent';
          }
        }
      });
    });

    return statuses;
  };

  const letterStatuses = getLetterStatuses();

  // Escuta teclado físico do usuário
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        onEnter();
      } else if (e.code === 'Backspace') {
        onDelete();
      } else {
        const key = e.key.toUpperCase();
        if (key.length === 1 && key >= 'A' && key <= 'Z') {
          onChar(key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onChar, onDelete, onEnter]);

  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
  ];

  return (
    <div className="keyboard-container">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="keyboard-row">
          {row.map((key) => {
            const isActionKey = key === 'ENTER' || key === 'BACK';
            const status = letterStatuses[key];
            const statusClass = !isActionKey && status ? status : '';
            const wideClass = isActionKey ? 'wide' : '';

            const handleClick = () => {
              if (key === 'ENTER') {
                onEnter();
              } else if (key === 'BACK') {
                onDelete();
              } else {
                onChar(key);
              }
            };

            return (
              <button
                key={key}
                onClick={handleClick}
                className={`key-btn ${wideClass} ${statusClass}`}
              >
                {key === 'BACK' ? '⌫' : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
