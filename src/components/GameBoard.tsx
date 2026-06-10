import React from 'react';
import { checkGuess } from '../utils/gameLogic';
import type { LetterState } from '../utils/gameLogic';

interface GameBoardProps {
  guesses: string[];
  currentGuess: string[]; // Alterado para string[] para digitação em qualquer posição
  answer: string;
  isCompleted: boolean;
  maxGuesses: number;
  shaking: boolean;
  focusedLetterIndex: number; // Índice focado de digitação
  onLetterClick?: (index: number) => void; // Evento de clique para mudar o foco
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
  focusedLetterIndex,
  onLetterClick,
  boardIndex,
  totalBoards
}) => {
  const isSolved = guesses.includes(answer);
  const rows = [];

  // Gera cada linha de tentativa do tabuleiro
  for (let i = 0; i < maxGuesses; i++) {
    const isCurrentRow = i === guesses.length;
    const isPastRow = i < guesses.length;
    
    // Normaliza a linha para ser sempre um array de 5 strings
    const rowGuess: string[] = isPastRow 
      ? guesses[i].split('') 
      : isCurrentRow && !isCompleted 
        ? currentGuess 
        : Array(5).fill('');

    const letters = [];
    let letterStates: LetterState[] = Array(5).fill('empty');

    if (isPastRow) {
      // Para validar, juntamos o palpite anterior que era string
      letterStates = checkGuess(guesses[i], answer);
    }

    for (let j = 0; j < 5; j++) {
      const char = rowGuess[j] || '';
      const state = isPastRow ? letterStates[j] : 'empty';
      const isActive = isCurrentRow && char !== '' && !isCompleted;
      const isFocused = isCurrentRow && j === focusedLetterIndex && !isCompleted;

      // Adiciona delays para a animação de flip sequencial em linhas anteriores
      const animationDelayClass = isPastRow ? `delay-${j}` : '';
      const stateClass = isPastRow ? state : '';
      const activeClass = isActive ? 'active' : '';
      const focusedClass = isFocused ? 'focused' : '';

      letters.push(
        <div
          key={j}
          className={`letter-box ${stateClass} ${activeClass} ${focusedClass} ${animationDelayClass}`}
          onClick={() => isCurrentRow && !isCompleted && onLetterClick && onLetterClick(j)}
          style={{ cursor: isCurrentRow && !isCompleted ? 'pointer' : 'default' }}
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
