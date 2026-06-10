import React from 'react';
import { checkGuess, normalizeText } from '../utils/gameLogic';
import { Share2, LogOut, Link2, X } from 'lucide-react';

interface GameStatsData {
  currentStreak: number;
  maxStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  guessesDistribution: Record<number, number>;
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStatsData;
  email: string | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  gameMode: 'single' | 'dueto' | 'quarteto';
  guessesByBoard: string[][];
  answers: string[];
  isGameCompleted: boolean;
  maxGuesses: number;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  email,
  onLogout,
  onOpenAuth,
  gameMode,
  guessesByBoard,
  answers,
  isGameCompleted,
  maxGuesses
}) => {
  if (!isOpen) return null;

  const modeNames: Record<string, string> = {
    single: 'Termo (1 Palavra)',
    dueto: 'Dueto (2 Palavras)',
    quarteto: 'Quarteto (4 Palavras)'
  };

  const getEmojiGrid = (): string => {
    // Quantidade máxima de linhas de palpite feitas em qualquer tabuleiro
    const maxAttemptCount = Math.max(...guessesByBoard.map(g => g.length));
    let grid = '';

    for (let r = 0; r < maxAttemptCount; r++) {
      const rowEmojis: string[] = [];

      guessesByBoard.forEach((boardGuesses, boardIdx) => {
        const answer = answers[boardIdx];
        
        // Se a tentativa atual é menor ou igual à última tentativa necessária para esse tabuleiro
        if (r < boardGuesses.length) {
          const guess = boardGuesses[r];
          // Se o tabuleiro já havia sido resolvido nas linhas anteriores, preenche com branco/transparente
          const solvedInPreviousRow = boardGuesses.slice(0, r).includes(answer);

          if (solvedInPreviousRow) {
            rowEmojis.push('⬜⬜⬜⬜⬜');
          } else {
            const states = checkGuess(guess, answer);
            const emojis = states.map(s => {
              if (s === 'correct') return '🟩';
              if (s === 'present') return '🟨';
              return '⬛';
            }).join('');
            rowEmojis.push(emojis);
          }
        } else {
          // Se esse tabuleiro já foi resolvido e a rodada total foi mais longe devido a outros tabuleiros
          const wasSolved = boardGuesses.includes(answer);
          if (wasSolved) {
            rowEmojis.push('⬜⬜⬜⬜⬜');
          } else {
            rowEmojis.push('⬛⬛⬛⬛⬛');
          }
        }
      });

      grid += rowEmojis.join('   ') + '\n';
    }

    return grid;
  };

  const handleShareWhatsApp = () => {
    const isSolvedAll = guessesByBoard.every((guesses, idx) => guesses.includes(answers[idx]));
    const totalAttempts = Math.max(...guessesByBoard.map(g => g.length));
    const scoreStr = isSolvedAll ? `${totalAttempts}/${maxGuesses}` : `X/${maxGuesses}`;
    
    const titleText = `Joguei o ${modeNames[gameMode]}!\nResultado: ${scoreStr}\n\n`;
    const emojis = getEmojiGrid();
    const linkText = `\nJogue também em: ${window.location.origin}`;

    const fullMessage = encodeURIComponent(titleText + emojis + linkText);
    window.open(`https://api.whatsapp.com/send?text=${fullMessage}`, '_blank');
  };

  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
    : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <button onClick={onClose} className="modal-close">
          <X size={20} />
        </button>

        <h2 className="modal-title">Estatísticas</h2>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', fontWeight: 600, color: '#60a5fa' }}>
          Modo: {modeNames[gameMode]}
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-val">{stats.gamesPlayed}</div>
            <div className="stat-lbl">Partidas</div>
          </div>
          <div className="stat-item">
            <div className="stat-val">{winRate}%</div>
            <div className="stat-lbl">Vitórias</div>
          </div>
          <div className="stat-item">
            <div className="stat-val">{stats.currentStreak}</div>
            <div className="stat-lbl">Streak Atual</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Streak Máxima:</span>
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>{stats.maxStreak} dias/vitórias</span>
        </div>

        {isGameCompleted && (
          <div className="share-section">
            <div style={{ fontSize: '0.9rem', color: '#94a3b8', textAlign: 'center' }}>
              Parabéns! Compartilhe o seu resultado do dia com os seus amigos no WhatsApp:
            </div>
            <button onClick={handleShareWhatsApp} className="btn btn-whatsapp" style={{ width: '100%' }}>
              <Share2 size={18} />
              Compartilhar no WhatsApp
            </button>
          </div>
        )}

        <div className="auth-section">
          {email ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <span className="auth-msg">
                Sincronizado com o e-mail: <strong>{email}</strong>
              </span>
              <button onClick={onLogout} className="btn" style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                <LogOut size={16} />
                Desconectar Conta
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <span className="auth-msg">
                Você está jogando em modo offline (dados salvos apenas neste navegador).
              </span>
              <button onClick={onOpenAuth} className="btn btn-primary" style={{ width: '100%' }}>
                <Link2 size={16} />
                Vincular E-mail (Sincronizar Nuvem)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
