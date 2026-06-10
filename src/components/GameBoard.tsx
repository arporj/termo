import React from 'react';
import { checkGuess, LetterState } from '../utils/gameLogic';

interface GameBoardProps {
  guesses: string[];
  currentGuess: string;
  answer: string;
  isCompleted: boolean;
  maxGuesses: number;
  shaking: boolean;
  boardIndex?: number;
  totalBoards?: number;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  guesses,
  currentGuess,
  answer,
  isCompleted,
  maxGuesses,
  shaking,
  boardIndex,
  totalBoards
}) => {
  const isSolved = guesses.includes(answer);
  const rows = [];

  // Gera cada linha de tentativa do tabuleiro
  for (let i = 0; i < maxGuesses; i++) {
    const isCurrentRow = i === guesses.length;
    const isPastRow = i < guesses.length;
    const rowGuess = isPastRow ? guesses[i] : isCurrentRow && !isCompleted ? currentGuess : '';

    const letters = [];
    let letterStates: LetterState[] = Array(5).fill('empty');

    if (isPastRow) {
      letterStates = checkGuess(rowGuess, answer);
    }

    for (let j = 0; j < 5; j++) {
      const char = rowGuess[j] || '';
      const state = isPastRow ? letterStates[j] : 'empty';
      const isActive = isCurrentRow && char !== '' && !isCompleted;

      // Adiciona delays para a animação de flip sequencial em linhas anteriores
      const animationDelayClass = isPastRow ? `delay-${j}` : '';
      const stateClass = isPastRow ? state : '';
      const activeClass = isActive ? 'active' : '';

      letters.push(
        <div
          key={j}
          className={`letter-box ${stateClass} ${activeClass} ${animationDelayClass}`}
        >
          {char}
        </div>
      );
    }

    const rowShakingClass = isCurrentRow && shaking ? 'shake' : '';

    rows.push(
      <div key={i} className={`board-row ${rowShakingClass}`}>
        {letters}
      </div>
    );
  }

  // Define um título bonito para o tabuleiro caso seja um modo de múltiplas palavras
  const showTitle = totalBoards && totalBoards > 1;
  const boardTitle = showTitle
    ? `Palavra ${boardIndex !== undefined ? boardIndex + 1 : 1} ${isSolved ? '✓ Resolvido' : ''}`
    : '';

  return (
    <div className="board-wrapper glass-panel">
      {showTitle && (
        <div className={`board-title ${isSolved ? 'solved' : ''}`}>
          {boardTitle}
        </div>
      )}
      <div className="board-grid">
        {rows}
      </div>
    </div>
  );
};
