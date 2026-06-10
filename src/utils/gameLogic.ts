import { WORDS } from '../data/wordlist';

export type LetterState = 'correct' | 'present' | 'absent' | 'empty';

export interface GuessLetter {
  char: string;
  state: LetterState;
}

// Retorna uma semente inteira determinística a partir de uma string
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Retorna as palavras secretas do dia para o modo selecionado
// Garante que para a mesma data (YYYY-MM-DD) e modo de jogo, as palavras sejam idênticas para todos
export function getWordsOfDay(mode: 'single' | 'dueto' | 'quarteto', dateStr: string): string[] {
  const count = mode === 'single' ? 1 : mode === 'dueto' ? 2 : 4;
  const selectedWords: string[] = [];

  for (let i = 0; i < count; i++) {
    // Semente única baseada no dia, modo e índice da palavra secreta
    const seed = `${dateStr}_${mode}_${i}`;
    const index = hashCode(seed) % WORDS.length;
    
    // Evita duplicatas no mesmo conjunto de palavras diárias
    let word = WORDS[index];
    let offset = 1;
    while (selectedWords.includes(word)) {
      const fallbackIndex = (index + offset) % WORDS.length;
      word = WORDS[fallbackIndex];
      offset++;
    }
    selectedWords.push(word);
  }

  return selectedWords;
}

// Normaliza uma string removendo acentos e cedilhas, convertendo para minúsculas
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c');
}

// Compara a palavra tentada (guess) com a resposta certa (answer)
// Retorna o estado de cada letra respeitando as regras do Wordle/Termo:
// - Certo na posição certa -> 'correct' (Verde)
// - Certo na posição errada -> 'present' (Amarelo)
// - Não existe na palavra -> 'absent' (Cinza)
// Cuida de letras repetidas para que não marque mais amarelos do que a frequência da letra na palavra secreta.
export function checkGuess(guess: string, answer: string): LetterState[] {
  const normGuess = normalizeText(guess);
  const normAnswer = normalizeText(answer);
  
  const states: LetterState[] = Array(5).fill('absent');
  const answerLetterCount: Record<string, number> = {};

  // Passo 1: Contar letras da resposta e identificar correspondências exatas ('correct')
  for (let i = 0; i < 5; i++) {
    const char = normAnswer[i];
    answerLetterCount[char] = (answerLetterCount[char] || 0) + 1;
  }

  for (let i = 0; i < 5; i++) {
    if (normGuess[i] === normAnswer[i]) {
      states[i] = 'correct';
      answerLetterCount[normGuess[i]]--;
    }
  }

  // Passo 2: Identificar correspondências parciais ('present') para as letras restantes
  for (let i = 0; i < 5; i++) {
    if (states[i] !== 'correct') {
      const char = normGuess[i];
      if (answerLetterCount[char] && answerLetterCount[char] > 0) {
        states[i] = 'present';
        answerLetterCount[char]--;
      }
    }
  }

  return states;
}

// Valida se a sequência diária sem pular nenhum dia ainda é válida
export function isDailyStreakValid(lastPlayedDateStr: string, currentDateStr: string): boolean {
  if (!lastPlayedDateStr) return true;

  const lastDate = new Date(lastPlayedDateStr + 'T00:00:00');
  const currentDate = new Date(currentDateStr + 'T00:00:00');

  // Calcula a diferença em dias
  const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // O streak continua válido se jogado hoje ou ontem
  return diffDays <= 1;
}

// Retorna a string da data de hoje no fuso local do usuário no formato YYYY-MM-DD
export function getLocalDateString(): string {
  const tzoffset = (new Date()).getTimezoneOffset() * 60000; // offset em milissegundos
  const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
  return localISOTime;
}
