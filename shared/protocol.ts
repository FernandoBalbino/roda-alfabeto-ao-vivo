// Mensagens entre navegador e servidor. Pequenas de propósito: a banda do Render free é limitada.

export type Phase = 'lobby' | 'question' | 'reveal' | 'finished';
export type Rule = 'starts' | 'contains';

export interface PublicPlayer {
  id: string;
  name: string;
  color: string;
  score: number; // acertos
  time: number; // ms somados até responder nas letras que acertou (desempate)
  online: boolean;
  answered: boolean; // já respondeu a letra atual
}

// Resposta de um aluno na revelação, na ordem em que foram enviadas.
export interface RevealEntry {
  id: string;
  name: string;
  color: string;
  given: string;
  ok: boolean;
}

export interface WheelLetter {
  letter: string;
  pct: number | null; // % da turma que acertou; null = ainda não jogada
}

export interface PublicQuestion {
  letter: string;
  rule: Rule;
  clue: string;
  category: string;
}

export interface PublicRoom {
  code: string;
  phase: Phase;
  idx: number; // posição da letra atual em `letters`
  letters: WheelLetter[];
  q: PublicQuestion | null;
  seconds: number; // tempo para responder a letra atual
  answer: string | null; // resposta certa: só depois do tempo
  reveal: RevealEntry[]; // só na revelação
  early: boolean; // todos responderam antes do tempo
  endsAt: number; // fim da pergunta (giro + tempo) ou da revelação, no relógio do servidor
  paused: boolean;
  left: number; // ms que faltavam quando pausou
  players: PublicPlayer[];
  serverNow: number;
}

// Definição de cada letra, enviada só para o professor montar a roda.
export interface BankItem {
  id: string;
  letter: string;
  rule: Rule;
  category: string;
  answer: string;
  clue: string;
}

export interface StartOptions {
  seconds: number;
  // qid null = sorteada; seconds null = tempo padrão
  letters: { letter: string; qid: string | null; seconds: number | null }[];
}

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: string };
type Cb<T = object> = (res: Ack<T>) => void;

export type TeacherAction = 'pause' | 'resume' | 'skip' | 'next' | 'end' | 'restart' | 'kick';

export interface ClientEvents {
  'teacher:create': (p: null, ack: Cb<{ code: string; token: string }>) => void;
  'teacher:resume': (p: { code: string; token: string }, ack: Cb) => void;
  'teacher:bank': (p: null, ack: Cb<{ bank: BankItem[] }>) => void;
  'teacher:start': (p: StartOptions, ack: Cb) => void;
  'teacher:action': (p: { action: TeacherAction; playerId?: string }, ack: Cb) => void;
  'player:join': (p: { code: string; name: string }, ack: Cb<{ playerId: string; token: string }>) => void;
  'player:resume': (p: { code: string; token: string }, ack: Cb<{ playerId: string }>) => void;
  'player:answer': (p: { text: string }, ack: Cb) => void;
}

export interface ServerEvents {
  state: (room: PublicRoom) => void;
  answered: (p: { id: string }) => void; // só para a TV
  kicked: () => void;
}
