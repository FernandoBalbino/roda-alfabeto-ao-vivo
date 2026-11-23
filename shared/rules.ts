// Regras fixas e linha do tempo da revelação. Usado pelo servidor e pelas telas (sem respostas aqui).
import type { PublicPlayer } from './protocol.ts';

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const MAX_PLAYERS = 60;
export const MAX_NAME = 18;
export const MAX_ANSWER = 40;
export const SECONDS_OPTIONS = [15, 20, 30, 45, 60, 90];
export const DEFAULT_SECONDS = 30;
export const MIN_SECONDS = 10;
export const MAX_SECONDS = 300;
export const PODIUM = 10; // pódio do telão
export const HIGHLIGHT = 5; // os 5 primeiros ganham destaque

export const CATEGORIES: Record<string, { label: string; color: string }> = {
  hardware: { label: 'Hardware', color: '#3b8eea' },
  periferico: { label: 'Periférico', color: '#8b6cff' },
  software: { label: 'Software', color: '#12b5a5' },
  internet: { label: 'Internet e redes', color: '#ff7a59' },
};

const PALETTE = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419', '#cc5de8', '#ff922b', '#22b8cf', '#f06595', '#94d82d', '#845ef7', '#20c997', '#ffa94d'];
export const colorFor = (i: number) => PALETTE[i % PALETTE.length];

// ---------- linha do tempo ----------
// Pergunta: a roda gira (SPIN_MS) e depois corre o tempo da letra.
export const SPIN_MS = 2600;
// Revelação: "Tempo esgotado!" + resposta certa, depois trios de alunos (um card a cada 2 s), depois o placar parcial.
export const INTRO_MS = 3800;
export const TRIO = 3;
export const CARD_GAP_MS = 2000;
export const TRIO_HOLD_MS = 3200; // do último card do trio até o próximo trio (digita, marca e dá tempo de ler)
export const OUTRO_MS = 5000;
export const TYPE_DELAY_MS = 450; // o card entra e só então começa a digitar

export const typeMs = (len: number) => Math.min(1100, len * 75);
export const markAt = (len: number) => TYPE_DELAY_MS + typeMs(len) + 250;
export const trioMs = (size: number) => (size - 1) * CARD_GAP_MS + TRIO_HOLD_MS;

// Marcos da revelação em ms desde o início: começo de cada trio, começo do placar e fim.
export function revealPlan(n: number) {
  const starts: number[] = [];
  let t = INTRO_MS;
  for (let i = 0; i < n; i += TRIO) {
    starts.push(t);
    t += trioMs(Math.min(TRIO, n - i));
  }
  return { starts, outro: t, total: t + OUTRO_MS };
}

// Quando aparece o ✓/✗ do aluno na posição `i` da revelação.
export function markTime(plan: ReturnType<typeof revealPlan>, i: number, len: number) {
  return plan.starts[Math.floor(i / TRIO)] + (i % TRIO) * CARD_GAP_MS + markAt(len);
}

// Mais acertos na frente; empate: quem respondeu mais rápido nas que acertou.
export function rankPlayers(players: PublicPlayer[]) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.time - b.time || a.name.localeCompare(b.name, 'pt-BR'));
  const out: (PublicPlayer & { place: number })[] = [];
  sorted.forEach((p, i) => {
    const prev = out[i - 1];
    out.push({ ...p, place: prev && prev.score === p.score && prev.time === p.time ? prev.place : i + 1 });
  });
  return out;
}
