// Regras do jogo, sem rede. O relógio é injetável para os testes.
import { randomBytes } from 'node:crypto';
import type { Phase, PublicRoom, RevealEntry, StartOptions } from '../shared/protocol.ts';
import {
  ALPHABET, MAX_ANSWER, MAX_NAME, MAX_PLAYERS, MAX_SECONDS, MIN_SECONDS, SPIN_MS, colorFor, revealPlan,
} from '../shared/rules.ts';
import { isCorrect, normalize } from './answer.ts';
import { QUESTIONS, QUESTION_BY_ID, type Question } from './bank.ts';

export class GameError extends Error {}

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export interface Player {
  id: string;
  token: string;
  name: string;
  colorIdx: number;
  score: number;
  time: number;
  online: boolean;
  given: string | null; // resposta da letra atual
  at: number; // ms até responder a letra atual
}

interface Slot {
  q: Question;
  seconds: number;
  pct: number | null;
}

export interface Room {
  code: string;
  teacherToken: string;
  phase: Phase;
  slots: Slot[];
  idx: number;
  endsAt: number;
  paused: boolean;
  left: number;
  early: boolean;
  reveal: RevealEntry[];
  players: Map<string, Player>;
  colorSeq: number;
  timer: unknown;
  touched: number;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_TTL_MS = 4 * 3600_000;

export const cleanName = (raw: unknown) =>
  String(raw ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();

export class Game {
  rooms = new Map<string, Room>();
  private clock: Clock;
  private rnd: () => number;
  private onChange: (room: Room) => void;

  constructor(opts: { clock?: Clock; rnd?: () => number; onChange?: (room: Room) => void } = {}) {
    this.clock = opts.clock ?? realClock;
    this.rnd = opts.rnd ?? Math.random;
    this.onChange = opts.onChange ?? (() => {});
  }

  private changed(room: Room) {
    room.touched = this.clock.now();
    this.onChange(room);
  }

  createRoom(): Room {
    let code = '';
    do code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(this.rnd() * CODE_CHARS.length)]).join('');
    while (this.rooms.has(code));
    const room: Room = {
      code, teacherToken: randomBytes(16).toString('hex'), phase: 'lobby', slots: [], idx: 0, endsAt: 0, paused: false,
      left: 0, early: false, reveal: [], players: new Map(), colorSeq: 0, timer: null, touched: this.clock.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  room(code: unknown): Room {
    const room = typeof code === 'string' ? this.rooms.get(code.trim().toUpperCase()) : undefined;
    if (!room) throw new GameError('Sala não encontrada. Confira o código na TV.');
    return room;
  }

  teacher(code: unknown, token: unknown): Room {
    const room = this.room(code);
    if (room.teacherToken !== token) throw new GameError('Sessão do professor inválida.');
    return room;
  }

  join(code: unknown, rawName: unknown) {
    const room = this.room(code);
    const base = cleanName(rawName);
    if (base.length < 2) throw new GameError('Digite seu nome (pelo menos 2 letras).');
    if (room.players.size >= MAX_PLAYERS) throw new GameError(`A sala está cheia (${MAX_PLAYERS} alunos).`);
    const taken = new Set([...room.players.values()].map((p) => normalize(p.name)));
    let name = base;
    for (let n = 2; taken.has(normalize(name)); n++) name = `${base.slice(0, MAX_NAME - 3)} ${n}`;
    const player: Player = {
      id: randomBytes(5).toString('hex'), token: randomBytes(16).toString('hex'), name, colorIdx: room.colorSeq++,
      score: 0, time: 0, online: true, given: null, at: 0,
    };
    room.players.set(player.id, player);
    this.changed(room);
    return { room, player };
  }

  resume(code: unknown, token: unknown) {
    const room = this.room(code);
    const player = [...room.players.values()].find((p) => p.token === token);
    if (!player) throw new GameError('Você saiu desta sala. Entre de novo com o código.');
    return { room, player };
  }

  setOnline(room: Room, playerId: string, online: boolean) {
    const p = room.players.get(playerId);
    if (!p || p.online === online) return;
    p.online = online;
    this.changed(room);
    if (!online) this.closeIfAllAnswered(room);
  }

  // Monta a roda: letras escolhidas pelo professor primeiro; as sorteadas não repetem resposta.
  start(room: Room, opts: StartOptions) {
    if (room.phase !== 'lobby') throw new GameError('A partida já começou.');
    if (!room.players.size) throw new GameError('Espere pelo menos um aluno entrar.');
    const seconds = Number(opts?.seconds);
    const okSeconds = (s: number) => Number.isInteger(s) && s >= MIN_SECONDS && s <= MAX_SECONDS;
    if (!okSeconds(seconds)) throw new GameError('Tempo por letra inválido.');
    const list = Array.isArray(opts.letters) ? opts.letters.slice(0, ALPHABET.length) : [];
    const seen = new Set<string>();
    const wanted = list.map((l) => {
      const letter = String(l?.letter ?? '').toUpperCase();
      if (!ALPHABET.includes(letter) || seen.has(letter)) throw new GameError('Lista de letras inválida.');
      seen.add(letter);
      const q = l.qid ? QUESTION_BY_ID.get(l.qid) : undefined;
      if (l.qid && q?.letter !== letter) throw new GameError(`Definição inválida na letra ${letter}.`);
      const own = l.seconds == null ? seconds : Number(l.seconds);
      if (!okSeconds(own)) throw new GameError(`Tempo inválido na letra ${letter}.`);
      return { letter, q, seconds: own };
    });
    if (!wanted.length) throw new GameError('Escolha pelo menos uma letra.');
    const used = new Set(wanted.flatMap((w) => (w.q ? [normalize(w.q.answer)] : [])));
    room.slots = wanted.map((w) => {
      let q = w.q;
      if (!q) {
        const all = QUESTIONS.filter((x) => x.letter === w.letter);
        const fresh = all.filter((x) => !used.has(normalize(x.answer)));
        const pool = fresh.length ? fresh : all;
        q = pool[Math.floor(this.rnd() * pool.length)];
        used.add(normalize(q.answer));
      }
      return { q, seconds: w.seconds, pct: null };
    });
    for (const p of room.players.values()) Object.assign(p, { score: 0, time: 0, given: null, at: 0 });
    room.idx = -1;
    this.nextLetter(room);
  }

  private schedule(room: Room, ms: number, fn: () => void) {
    this.clock.clearTimeout(room.timer);
    room.timer = this.clock.setTimeout(fn, Math.max(0, ms));
  }

  private nextLetter(room: Room) {
    room.idx++;
    const slot = room.slots[room.idx];
    Object.assign(room, { phase: 'question', paused: false, early: false, reveal: [] });
    const total = SPIN_MS + slot.seconds * 1000;
    room.endsAt = this.clock.now() + total;
    for (const p of room.players.values()) Object.assign(p, { given: null, at: 0 });
    this.schedule(room, total, () => this.closeRound(room));
    this.changed(room);
  }

  answer(room: Room, playerId: string, text: unknown) {
    const p = room.players.get(playerId);
    if (!p) throw new GameError('Você não está nesta sala.');
    if (room.phase !== 'question') throw new GameError('O tempo desta letra já acabou.');
    if (room.paused) throw new GameError('O professor pausou. Espere continuar.');
    if (p.given !== null) throw new GameError('Você já respondeu esta letra.');
    const given = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_ANSWER);
    if (!given) throw new GameError('Digite uma resposta.');
    const slot = room.slots[room.idx];
    const started = room.endsAt - slot.seconds * 1000;
    p.given = given;
    p.at = Math.max(0, this.clock.now() - started);
    room.touched = this.clock.now(); // sem onChange: a TV recebe só o evento `answered`
    this.closeIfAllAnswered(room);
  }

  // Todos os alunos conectados já responderam: não faz a turma esperar o relógio.
  private closeIfAllAnswered(room: Room) {
    if (room.phase !== 'question' || room.paused) return;
    const online = [...room.players.values()].filter((p) => p.online);
    if (online.length && online.every((p) => p.given !== null)) {
      room.early = true;
      this.closeRound(room);
    }
  }

  // Fim do tempo: corrige, soma pontos e monta a fila da revelação (na ordem de envio).
  closeRound(room: Room) {
    if (room.phase !== 'question') return;
    const slot = room.slots[room.idx];
    const answered = [...room.players.values()].filter((p) => p.given !== null).sort((a, b) => a.at - b.at);
    room.reveal = answered.map((p) => {
      const ok = isCorrect(slot.q, p.given!);
      if (ok) {
        p.score++;
        p.time += p.at;
      }
      return { id: p.id, name: p.name, color: colorFor(p.colorIdx), given: p.given!, ok };
    });
    const right = room.reveal.filter((r) => r.ok).length;
    slot.pct = room.players.size ? Math.round((right / room.players.size) * 100) : 0;
    room.phase = 'reveal';
    room.paused = false;
    const total = revealPlan(room.reveal.length).total;
    room.endsAt = this.clock.now() + total;
    this.schedule(room, total, () => this.advance(room));
    this.changed(room);
  }

  advance(room: Room) {
    if (room.phase !== 'reveal') return;
    if (room.idx + 1 >= room.slots.length) this.finish(room);
    else this.nextLetter(room);
  }

  finish(room: Room) {
    if (room.phase === 'lobby' || room.phase === 'finished') throw new GameError('Não há partida em andamento.');
    this.clock.clearTimeout(room.timer);
    room.phase = 'finished';
    room.paused = false;
    this.changed(room);
  }

  setPaused(room: Room, paused: boolean) {
    if (room.phase !== 'question' && room.phase !== 'reveal') throw new GameError('Não há letra para pausar.');
    if (room.paused === paused) return;
    const now = this.clock.now();
    if (paused) {
      room.left = Math.max(0, room.endsAt - now);
      this.clock.clearTimeout(room.timer);
    } else {
      room.endsAt = now + room.left;
      this.schedule(room, room.left, () => (room.phase === 'question' ? this.closeRound(room) : this.advance(room)));
    }
    room.paused = paused;
    this.changed(room);
    if (!paused) this.closeIfAllAnswered(room);
  }

  // Na pergunta: encerra o tempo. Na revelação: pula para o próximo trio (ou para a próxima letra).
  skip(room: Room) {
    if (room.phase === 'question') return this.closeRound(room);
    if (room.phase !== 'reveal') throw new GameError('Não há letra para pular.');
    const plan = revealPlan(room.reveal.length);
    const remaining = room.paused ? room.left : room.endsAt - this.clock.now();
    const elapsed = plan.total - remaining;
    const mark = [...plan.starts, plan.outro].find((m) => m > elapsed + 100);
    if (mark === undefined) return this.advance(room);
    const left = plan.total - mark;
    if (room.paused) room.left = left;
    else {
      room.endsAt = this.clock.now() + left;
      this.schedule(room, left, () => this.advance(room));
    }
    this.changed(room);
  }

  next(room: Room) {
    if (room.phase === 'question') this.closeRound(room);
    else if (room.phase === 'reveal') this.advance(room);
    else throw new GameError('Não há letra em andamento.');
  }

  restart(room: Room) {
    this.clock.clearTimeout(room.timer);
    Object.assign(room, { phase: 'lobby', slots: [], idx: 0, paused: false, early: false, reveal: [] });
    for (const p of room.players.values()) Object.assign(p, { score: 0, time: 0, given: null, at: 0 });
    this.changed(room);
  }

  kick(room: Room, playerId: unknown) {
    const p = typeof playerId === 'string' ? room.players.get(playerId) : undefined;
    if (!p) throw new GameError('Aluno não encontrado.');
    room.players.delete(p.id);
    this.changed(room);
    this.closeIfAllAnswered(room);
    return p;
  }

  cleanup() {
    const now = this.clock.now();
    for (const [code, room] of this.rooms)
      if (now - room.touched > ROOM_TTL_MS) {
        this.clock.clearTimeout(room.timer);
        this.rooms.delete(code);
      }
  }

  view(room: Room): PublicRoom {
    const slot = room.slots[room.idx];
    const playing = room.phase === 'question' || room.phase === 'reveal';
    return {
      code: room.code,
      phase: room.phase,
      idx: room.idx,
      letters: room.slots.map((s) => ({ letter: s.q.letter, pct: s.pct })),
      q: playing && slot ? { letter: slot.q.letter, rule: slot.q.rule, clue: slot.q.clue, category: slot.q.category } : null,
      seconds: slot?.seconds ?? 0,
      answer: room.phase === 'reveal' ? slot.q.answer : null,
      reveal: room.phase === 'reveal' ? room.reveal : [],
      early: room.early,
      endsAt: room.endsAt,
      paused: room.paused,
      left: room.left,
      serverNow: this.clock.now(),
      players: [...room.players.values()].map((p) => ({
        id: p.id, name: p.name, color: colorFor(p.colorIdx), score: p.score, time: p.time, online: p.online,
        answered: room.phase === 'question' && p.given !== null,
      })),
    };
  }
}
