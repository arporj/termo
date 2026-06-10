import React from 'react';
import { checkGuess } from '../utils/gameLogic';
import { Share2, LogOut, Link2, X } from 'lucide-react';

interface GameStatsData {
  currentWinStreak: number;
  maxWinStreak: number;
  currentDailyStreak: number;
  maxDailyStreak: number;
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
    
    // Verifica recordes e adiciona medalhas correspondentes
    const isDailyRecord = stats.currentDailyStreak >= stats.maxDailyStreak && stats.maxDailyStreak > 0;
    const isWinRecord = stats.currentWinStreak >= stats.maxWinStreak && stats.maxWinStreak > 0;

    const titleText = `Joguei o ${modeNames[gameMode]}!\nResultado: ${scoreStr}\n\n`;
    const emojis = getEmojiGrid();
    
    const statsText = `\n🔥 Dias Seguidos: ${stats.currentDailyStreak}${isDailyRecord ? ' 🥇 (Novo Recorde!)' : ''}` +
      `\n🎯 Vitórias Sem Errar: ${stats.currentWinStreak}${isWinRecord ? ' 🏆 (Novo Recorde!)' : ''}\n`;

    const linkText = `\nJogue também em: ${window.location.origin}`;

    const fullMessage = encodeURIComponent(titleText + emojis + statsText + linkText);
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

        {/* stats-grid atualizado para ter 4 colunas em vez de 3 */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          <div className="stat-item" style={{ padding: '0.75rem 0.25rem' }}>
            <div className="stat-val" style={{ fontSize: '1.5rem' }}>{stats.gamesPlayed}</div>
            <div className="stat-lbl" style={{ fontSize: '0.65rem' }}>Partidas</div>
          </div>
          <div className="stat-item" style={{ padding: '0.75rem 0.25rem' }}>
            <div className="stat-val" style={{ fontSize: '1.5rem' }}>{winRate}%</div>
            <div className="stat-lbl" style={{ fontSize: '0.65rem' }}>Vitórias</div>
          </div>
          <div className="stat-item" style={{ padding: '0.75rem 0.25rem' }}>
            <div className="stat-val" style={{ fontSize: '1.5rem' }}>{stats.currentDailyStreak}</div>
            <div className="stat-lbl" style={{ fontSize: '0.65rem' }}>Dias Seg.</div>
          </div>
          <div className="stat-item" style={{ padding: '0.75rem 0.25rem' }}>
            <div className="stat-val" style={{ fontSize: '1.5rem' }}>{stats.currentWinStreak}</div>
            <div className="stat-lbl" style={{ fontSize: '0.65rem' }}>Vit. Seg.</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', padding: '0 0.5rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Recorde Dias Seguidos:</span>
            <span style={{ fontWeight: 700, color: '#f8fafc' }}>{stats.maxDailyStreak} dias</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Recorde Vitórias Seguidas:</span>
            <span style={{ fontWeight: 700, color: '#f8fafc' }}>{stats.maxWinStreak} vitórias</span>
          </div>
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
