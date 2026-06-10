import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { getWordsOfDay, isDailyStreakValid, getLocalDateString, normalizeText } from './utils/gameLogic';
import { VALID_GUESSES } from './data/wordlist';
import { GameBoard } from './components/GameBoard';
import { Keyboard } from './components/Keyboard';
import { StatsModal } from './components/StatsModal';
import { AuthModal } from './components/AuthModal';
import { BarChart3, HelpCircle, User, LogOut, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameStatsData {
  currentWinStreak: number;
  maxWinStreak: number;
  currentDailyStreak: number;
  maxDailyStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  guessesDistribution: Record<number, number>;
}

const defaultStats: GameStatsData = {
  currentWinStreak: 0,
  maxWinStreak: 0,
  currentDailyStreak: 0,
  maxDailyStreak: 0,
  gamesPlayed: 0,
  gamesWon: 0,
  guessesDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
};

export default function App() {
  // Configuração de Modos de Jogo
  const [gameMode, setGameMode] = useState<'single' | 'dueto' | 'quarteto'>('single');
  const maxGuesses = gameMode === 'single' ? 6 : gameMode === 'dueto' ? 7 : 9;

  // Estados do Jogo Ativo
  const [answers, setAnswers] = useState<string[]>([]);
  const [guessesByBoard, setGuessesByBoard] = useState<string[][]>([[]]);
  const [currentGuess, setCurrentGuess] = useState<string[]>(Array(5).fill(''));
  const [focusedLetterIndex, setFocusedLetterIndex] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shaking, setShaking] = useState(false);
  
  // Utilidades e Feedbacks
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  
  // Autenticação e Estatísticas
  const [email, setEmail] = useState<string | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Estatísticas separadas por modo
  const [allStats, setAllStats] = useState<Record<'single' | 'dueto' | 'quarteto', GameStatsData>>({
    single: { ...defaultStats },
    dueto: { ...defaultStats },
    quarteto: { ...defaultStats }
  });

  // 1. Monitorar login/sessão no Supabase
  useEffect(() => {
    if (!supabase) return;

    // Recupera a sessão atual do usuário ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setEmail(session.user.email);
        loadStatsFromSupabase(session.user.id, session.user.email);
      }
    });

    // Escuta alterações de estado de autenticação (ex: login efetuado via Magic Link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setEmail(session.user.email);
        loadStatsFromSupabase(session.user.id, session.user.email);
      } else {
        setEmail(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Carregar estatísticas locais do LocalStorage ao iniciar
  useEffect(() => {
    const localStatsStr = localStorage.getItem('termo_stats');
    if (localStatsStr) {
      try {
        const parsed = JSON.parse(localStatsStr);
        setAllStats(prev => ({
          single: parsed.single || prev.single,
          dueto: parsed.dueto || prev.dueto,
          quarteto: parsed.quarteto || prev.quarteto
        }));
      } catch (e) {
        console.error('Erro ao ler estatísticas do LocalStorage', e);
      }
    }
  }, []);

  // 3. Inicializar ou carregar o jogo diário atual
  useEffect(() => {
    const today = getLocalDateString();
    
    // Gera as palavras secretas do dia
    const dailyAnswers = getWordsOfDay(gameMode, today);
    setAnswers(dailyAnswers);

    // Carrega o estado salvo do jogo de hoje para evitar perda em refresh
    const savedStateStr = localStorage.getItem(`termo_state_${gameMode}`);
    if (savedStateStr) {
      try {
        const savedState = JSON.parse(savedStateStr);
        if (savedState.date === today) {
          setGuessesByBoard(savedState.guessesByBoard);
          setIsCompleted(savedState.isCompleted);
          setCurrentGuess(Array(5).fill(''));
          setFocusedLetterIndex(0);
          return;
        }
      } catch (e) {
        console.error('Erro ao ler estado diário do jogo', e);
      }
    }

    // Caso não exista estado para hoje, inicia um novo tabuleiro vazio para cada palavra
    const boardCount = gameMode === 'single' ? 1 : gameMode === 'dueto' ? 2 : 4;
    setGuessesByBoard(Array(boardCount).fill([]).map(() => []));
    setIsCompleted(false);
    setCurrentGuess(Array(5).fill(''));
    setFocusedLetterIndex(0);
  }, [gameMode]);

  // Carrega e mescla estatísticas vindas do Supabase
  const loadStatsFromSupabase = async (userId: string, userEmail: string) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('game_stats')
        .select('game_mode, current_win_streak, max_win_streak, current_daily_streak, max_daily_streak, last_played_date');

      if (error) throw error;

      // Mescla inteligente com as estatísticas locais atuais
      const mergedStats = { ...allStats };
      let hasChanges = false;

      // Mapeamento dos modos do BD para nossa estrutura
      const modesMap: Record<string, 'single' | 'dueto' | 'quarteto'> = {
        single: 'single',
        dueto: 'dueto',
        quarteto: 'quarteto'
      };

      if (data && data.length > 0) {
        data.forEach((row: any) => {
          const mode = modesMap[row.game_mode];
          if (mode) {
            const localStat = mergedStats[mode];
            const maxDailyStreak = Math.max(localStat.maxDailyStreak, row.max_daily_streak);
            const maxWinStreak = Math.max(localStat.maxWinStreak, row.max_win_streak);
            
            if (
              row.max_daily_streak > localStat.maxDailyStreak || 
              row.max_win_streak > localStat.maxWinStreak ||
              row.current_daily_streak > localStat.currentDailyStreak ||
              row.current_win_streak > localStat.currentWinStreak
            ) {
              mergedStats[mode] = {
                ...localStat,
                currentDailyStreak: Math.max(localStat.currentDailyStreak, row.current_daily_streak),
                maxDailyStreak: maxDailyStreak,
                currentWinStreak: Math.max(localStat.currentWinStreak, row.current_win_streak),
                maxWinStreak: maxWinStreak
              };
              hasChanges = true;
            }
          }
        });
      }

      if (hasChanges) {
        setAllStats(mergedStats);
        localStorage.setItem('termo_stats', JSON.stringify(mergedStats));
      }

      // Upsert das estatísticas locais que podem ser maiores ou novas na nuvem
      syncLocalStatsToSupabase(userId, userEmail, mergedStats);

    } catch (err) {
      console.error('Erro ao carregar estatísticas do Supabase:', err);
    }
  };

  // Envia as estatísticas locais para o Supabase (Upsert)
  const syncLocalStatsToSupabase = async (userId: string, _userEmail: string, statsToSend = allStats) => {
    if (!supabase) return;

    try {
      const modes: ('single' | 'dueto' | 'quarteto')[] = ['single', 'dueto', 'quarteto'];
      
      const upsertData = modes.map(mode => ({
        user_id: userId,
        game_mode: mode,
        current_win_streak: statsToSend[mode].currentWinStreak,
        max_win_streak: statsToSend[mode].maxWinStreak,
        current_daily_streak: statsToSend[mode].currentDailyStreak,
        max_daily_streak: statsToSend[mode].maxDailyStreak,
        last_played_date: getLocalDateString()
      }));

      const { error } = await supabase
        .from('game_stats')
        .upsert(upsertData, { onConflict: 'user_id,game_mode' });

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao sincronizar estatísticas com o Supabase:', err);
    }
  };

  // Exibe um banner flutuante temporário
  const showBanner = (msg: string, duration = 2500) => {
    setBannerMessage(msg);
    setTimeout(() => {
      setBannerMessage(null);
    }, duration);
  };

  // Executa animação de tremer a linha de palpites ativa
  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
  };

  // Adiciona caractere digitado na posicao focada
  const handleChar = (char: string) => {
    if (isCompleted) return;

    const newGuess = [...currentGuess];
    newGuess[focusedLetterIndex] = char.toLowerCase();
    setCurrentGuess(newGuess);

    // Avanca o foco de forma inteligente para o proximo indice vazio
    let nextIndex = (focusedLetterIndex + 1) % 5;
    for (let offset = 0; offset < 5; offset++) {
      const idx = (nextIndex + offset) % 5;
      if (newGuess[idx] === '') {
        setFocusedLetterIndex(idx);
        break;
      }
    }
    // Se todas as caixas ja estiverem cheias, mantemos o foco na caixa atual
  };

  // Remove o caractere focado ou volta para a esquerda limpando de trás para frente
  const handleDelete = () => {
    if (isCompleted) return;

    const newGuess = [...currentGuess];

    // Caso 1: A caixa atual em foco está preenchida. Limpa-a e recua o foco para a letra anterior.
    if (newGuess[focusedLetterIndex] !== '') {
      newGuess[focusedLetterIndex] = '';
      setCurrentGuess(newGuess);
      if (focusedLetterIndex > 0) {
        setFocusedLetterIndex(focusedLetterIndex - 1);
      }
      return;
    }

    // Caso 2: A caixa atual está vazia. Procuramos a primeira letra preenchida à esquerda para apagar.
    let targetIndex = -1;
    for (let i = focusedLetterIndex - 1; i >= 0; i--) {
      if (newGuess[i] !== '') {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex !== -1) {
      newGuess[targetIndex] = '';
      setCurrentGuess(newGuess);
      setFocusedLetterIndex(targetIndex);
    } else {
      // Se não há nenhuma preenchida à esquerda, mas a posição focada atual é maior que 0 e está vazia,
      // apenas recua o foco para a esquerda para navegação.
      if (focusedLetterIndex > 0) {
        setFocusedLetterIndex(focusedLetterIndex - 1);
      }
    }
  };

  // Submete a tentativa ativa do jogador
  const handleEnter = () => {
    if (isCompleted) return;

    // Junta as letras para validacao
    const guess = currentGuess.join('').toLowerCase();

    // Validação de tamanho (se alguma caixa estiver vazia)
    if (guess.length < 5 || currentGuess.includes('')) {
      showBanner('Palavra incompleta');
      triggerShake();
      return;
    }

    // Validação de dicionário
    const normalizedGuess = normalizeText(guess);
    if (!VALID_GUESSES.has(normalizedGuess)) {
      showBanner('Palavra não aceita no dicionário');
      triggerShake();
      return;
    }

    // Adiciona o palpite nos tabuleiros que ainda não foram solucionados
    const newGuessesByBoard = guessesByBoard.map((boardGuesses, idx) => {
      const answer = answers[idx];
      const isSolved = boardGuesses.includes(answer);
      
      // Se este tabuleiro já foi resolvido, não adicionamos novos palpites nele
      if (isSolved) return boardGuesses;
      return [...boardGuesses, guess];
    });

    setGuessesByBoard(newGuessesByBoard);
    setCurrentGuess(Array(5).fill(''));
    setFocusedLetterIndex(0);

    // Salva progresso diário local do jogo atual
    const today = getLocalDateString();
    
    // Um tabuleiro está resolvido se a resposta secreta dele está na lista de palpites
    const solvedStates = newGuessesByBoard.map((guesses, idx) => guesses.includes(answers[idx]));
    const isWin = solvedStates.every(s => s === true);
    
    // O jogo acabou em derrota se algum tabuleiro incompleto gastou todas as tentativas
    const isLoss = !isWin && newGuessesByBoard.some((guesses, idx) => {
      const isSolved = solvedStates[idx];
      return !isSolved && guesses.length >= maxGuesses;
    });

    const isFinished = isWin || isLoss;

    // Salva o estado atualizado do dia no LocalStorage
    localStorage.setItem(
      `termo_state_${gameMode}`,
      JSON.stringify({
        date: today,
        guessesByBoard: newGuessesByBoard,
        isCompleted: isFinished
      })
    );

    if (isFinished) {
      setIsCompleted(true);
      updateStats(isWin);

      if (isWin) {
        // Disparar efeito premium de confetes
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }, 300);
        showBanner('Parabéns! Você venceu!');
        setTimeout(() => setShowStatsModal(true), 1500);
      } else {
        const answersList = answers.map(a => a.toUpperCase()).join(', ');
        showBanner(`As palavras eram: ${answersList}`, 5000);
        setTimeout(() => setShowStatsModal(true), 2500);
      }
    }
  };

  // Atualiza as estatísticas de vitórias e streaks separados
  const updateStats = async (isWin: boolean) => {
    const today = getLocalDateString();
    const currentModeStats = allStats[gameMode];
    
    const gamesPlayed = currentModeStats.gamesPlayed + 1;
    const gamesWon = isWin ? currentModeStats.gamesWon + 1 : currentModeStats.gamesWon;
    
    // Recupera a data do ultimo jogo do modo
    const lastPlayedStr = localStorage.getItem(`termo_last_played_${gameMode}`) || '';
    
    // 1. Calculo do Streak Diario (dias seguidos jogados)
    let currentDailyStreak = currentModeStats.currentDailyStreak || 0;
    if (lastPlayedStr === today) {
      // Ja jogou hoje (ex: o usuario re-iniciou o mesmo dia) - nao incrementa novamente
    } else {
      const isStreakValid = isDailyStreakValid(lastPlayedStr, today);
      currentDailyStreak = isStreakValid ? currentDailyStreak + 1 : 1;
    }
    const maxDailyStreak = Math.max(currentModeStats.maxDailyStreak || 0, currentDailyStreak);

    // 2. Calculo do Streak de Vitorias (vitórias seguidas sem errar)
    let currentWinStreak = currentModeStats.currentWinStreak || 0;
    if (isWin) {
      const isStreakValid = isDailyStreakValid(lastPlayedStr, today);
      currentWinStreak = isStreakValid ? currentWinStreak + 1 : 1;
    } else {
      currentWinStreak = 0; // Zerou o streak ao perder
    }
    const maxWinStreak = Math.max(currentModeStats.maxWinStreak || 0, currentWinStreak);

    // Atualiza estado local
    const updatedModeStats = {
      ...currentModeStats,
      gamesPlayed,
      gamesWon,
      currentDailyStreak,
      maxDailyStreak,
      currentWinStreak,
      maxWinStreak
    };

    const newAllStats = {
      ...allStats,
      [gameMode]: updatedModeStats
    };

    setAllStats(newAllStats);

    // Salva localmente
    localStorage.setItem('termo_stats', JSON.stringify(newAllStats));
    localStorage.setItem(`termo_last_played_${gameMode}`, today);

    // Se estiver autenticado, sincroniza imediatamente com o banco do Supabase
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        syncLocalStatsToSupabase(user.id, user.email || '', newAllStats);
      }
    }
  };

  // Ações de Autenticação sucedidas no modal
  const handleAuthSuccess = (userEmail: string) => {
    setEmail(userEmail);
    showBanner(`Autenticado com sucesso como ${userEmail}`);
  };

  // Ação de deslogar
  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setEmail(null);
    showBanner('Desconectado da conta.');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Banner de Status */}
      {bannerMessage && (
        <div className="status-banner">
          {bannerMessage}
        </div>
      )}

      {/* Header do App */}
      <header className="app-header">
        <div>
          <h1 className="logo">Termo</h1>
          <div className="logo-sub">Dueto / Quarteto</div>
        </div>

        {/* Seletor de Modo de Jogo */}
        <div className="mode-selector">
          <button
            onClick={() => setGameMode('single')}
            className={`mode-btn ${gameMode === 'single' ? 'active' : ''}`}
          >
            Termo
          </button>
          <button
            onClick={() => setGameMode('dueto')}
            className={`mode-btn ${gameMode === 'dueto' ? 'active' : ''}`}
          >
            Dueto
          </button>
          <button
            onClick={() => setGameMode('quarteto')}
            className={`mode-btn ${gameMode === 'quarteto' ? 'active' : ''}`}
          >
            Quarteto
          </button>
        </div>

        {/* Ações de navegação do Header */}
        <div className="nav-actions">
          <button
            onClick={() => setShowHelpModal(true)}
            className="btn btn-icon"
            title="Como Jogar"
          >
            <HelpCircle size={20} />
          </button>
          <button
            onClick={() => setShowStatsModal(true)}
            className="btn btn-icon"
            title="Estatísticas"
          >
            <BarChart3 size={20} />
          </button>
          {email ? (
            <button
              onClick={handleLogout}
              className="btn btn-icon"
              title={`Sair de ${email}`}
              style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
            >
              <LogOut size={18} />
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="btn btn-icon"
              title="Vincular Conta"
            >
              <User size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Grid de Tabuleiros */}
      <main className="game-container">
        <div className={`boards-grid ${gameMode}`}>
          {answers.map((answer, idx) => {
            const boardGuesses = guessesByBoard[idx] || [];
            return (
              <GameBoard
                key={idx}
                boardIndex={idx}
                totalBoards={answers.length}
                guesses={boardGuesses}
                currentGuess={currentGuess}
                answer={answer}
                isCompleted={isCompleted}
                maxGuesses={maxGuesses}
                shaking={shaking}
                focusedLetterIndex={focusedLetterIndex}
                onLetterClick={setFocusedLetterIndex}
              />
            );
          })}
        </div>

        {/* Teclado Virtual */}
        <Keyboard
          onChar={handleChar}
          onDelete={handleDelete}
          onEnter={handleEnter}
          guessesByBoard={guessesByBoard}
          answers={answers}
        />
      </main>

      {/* Modais do Sistema */}
      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        stats={allStats[gameMode]}
        email={email}
        onLogout={handleLogout}
        onOpenAuth={() => {
          setShowStatsModal(false);
          setShowAuthModal(true);
        }}
        gameMode={gameMode}
        guessesByBoard={guessesByBoard}
        answers={answers}
        isGameCompleted={isCompleted}
        maxGuesses={maxGuesses}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowHelpModal(false)} className="modal-close">
              <X size={20} />
            </button>
            <h2 className="modal-title">Como Jogar</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
              <p>Adivinhe a palavra misteriosa em <strong>{maxGuesses}</strong> tentativas!</p>
              <p>Cada palpite deve ser uma palavra válida de 5 letras em português.</p>
              <p>Após cada palpite, a cor das peças muda para indicar quão perto você chegou:</p>
              
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div className="letter-box correct" style={{ width: 32, height: 32, fontSize: '1rem', borderRadius: 4 }}>T</div>
                  <span>A letra <strong>T</strong> faz parte da palavra e está na posição correta (verde).</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div className="letter-box present" style={{ width: 32, height: 32, fontSize: '1rem', borderRadius: 4 }}>E</div>
                  <span>A letra <strong>E</strong> faz parte da palavra, mas está na posição errada (amarelo).</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div className="letter-box absent" style={{ width: 32, height: 32, fontSize: '1rem', borderRadius: 4 }}>R</div>
                  <span>A letra <strong>R</strong> não faz parte da palavra misteriosa (cinza).</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem', color: '#f8fafc' }}>Variações do Jogo:</h3>
                <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li><strong>Termo:</strong> Adivinhe 1 palavra em 6 tentativas.</li>
                  <li><strong>Dueto:</strong> Adivinhe 2 palavras ao mesmo tempo em 7 tentativas.</li>
                  <li><strong>Quarteto:</strong> Adivinhe 4 palavras ao mesmo tempo em 9 tentativas.</li>
                </ul>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                Nota: A palavra secreta muda todos os dias à meia-noite!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
