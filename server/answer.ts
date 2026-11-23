// Correção tolerante: o aluno pode saber a resposta e digitar sem acento, sem hífen,
// em minúsculas ou com uma letra errada.
import { QUESTIONS, type Question } from './bank.ts';

export const normalize = (value = '') =>
  String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Distância de edição em que trocar duas letras vizinhas conta como um erro (teclaod → teclado).
export function distance(a: string, b: string) {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i ? (j ? 0 : i) : j)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

export const forms = (q: Question) => [...new Set([q.answer, ...q.accepted].map(normalize).filter(Boolean))];

// Todas as respostas do banco: digitar exatamente outro termo (ex.: "fonte" no lugar de "fone") não vale como erro de digitação.
const KNOWN = new Set(QUESTIONS.flatMap(forms));

// Erros aceitos: nenhum até 3 letras (CPU × GPU), 1 a partir de 4 letras e 2 a partir de 10.
const allowedErrors = (len: number) => (len >= 10 ? 2 : len >= 4 ? 1 : 0);

const keepsLetter = (q: Question, candidate: string) => {
  const letter = q.letter.toLowerCase();
  return q.rule === 'contains' ? candidate.includes(letter) : candidate.startsWith(letter);
};

export function isCorrect(q: Question, input: string) {
  const candidate = normalize(input);
  if (!candidate) return false;
  const accepted = forms(q);
  if (accepted.includes(candidate)) return true;
  if (KNOWN.has(candidate) || !keepsLetter(q, candidate)) return false;
  return accepted.some((form) => {
    const max = allowedErrors(form.length);
    return max > 0 && Math.abs(form.length - candidate.length) <= max && distance(form, candidate) <= max;
  });
}
