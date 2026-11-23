import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, cleanName, type Clock } from '../server/game.ts';
import { QUESTION_BY_ID } from '../server/bank.ts';
import { ALPHABET, SPIN_MS, TRIO, markTime, rankPlayers, revealPlan } from '../shared/rules.ts';
import type { StartOptions } from '../shared/protocol.ts';

function fakeClock() {
  let now = 1_000_000;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let seq = 0;
  const clock: Clock = {
    now: () => now,
    setTimeout: (fn, ms) => (timers.push({ at: now + ms, fn, id: ++seq }), seq),
    clearTimeout: (id) => void (timers = timers.filter((t) => t.id !== id)),
  };
  const tick = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const next = timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      timers = timers.filter((t) => t !== next);
      now = next.at;
      next.fn();
    }
    now = end;
  };
  return { clock, tick };
}

function setup(n: number) {
  const { clock, tick } = fakeClock();
  const game = new Game({ clock });
  const room = game.createRoom();
  const players = Array.from({ length: n }, (_, i) => game.join(room.code, `Aluno ${i + 1}`).player);
  return { game, room, players, tick };
}
const opts = (letters: StartOptions['letters'], seconds = 30): StartOptions => ({ seconds, letters });

test('nome: obrigatório, limpo e sem repetir na sala', () => {
  const { game, room } = setup(0);
  assert.throws(() => game.join(room.code, ' a '), /nome/);
  assert.equal(cleanName('  Ana   <b>Clara</b>  '), 'Ana bClara/b');
  const a = game.join(room.code, 'Ana').player;
  const b = game.join(room.code, 'ana').player;
  assert.equal(a.name, 'Ana');
  assert.equal(b.name, 'ana 2');
});

test('professor escolhe a definição de cada letra; as sorteadas não repetem resposta', () => {
  const { game, room } = setup(1);
  game.start(room, opts([
    { letter: 'A', qid: 'a-alto-falante', seconds: null },
    { letter: 'K', qid: 'k-link', seconds: 60 },
    ...ALPHABET.filter((l) => l !== 'A' && l !== 'K').map((letter) => ({ letter, qid: null, seconds: null })),
  ]));
  assert.equal(room.slots.length, 26);
  assert.equal(room.slots[0].q.id, 'a-alto-falante');
  assert.equal(room.slots[1].q.id, 'k-link');
  assert.equal(room.slots[1].seconds, 60);
  assert.equal(room.slots[0].seconds, 30);
  const answers = room.slots.map((s) => s.q.answer);
  assert.equal(new Set(answers).size, 26);
  assert.deepEqual(room.slots.map((s) => s.q.letter).slice(0, 3), ['A', 'K', 'B']);
});

test('recusa definição de outra letra, letra repetida e tempo inválido', () => {
  const { game, room } = setup(1);
  assert.throws(() => game.start(room, opts([{ letter: 'B', qid: 'a-antivirus', seconds: null }])), /letra B/);
  assert.throws(() => game.start(room, opts([{ letter: 'A', qid: null, seconds: null }, { letter: 'A', qid: null, seconds: null }])), /inválida/);
  assert.throws(() => game.start(room, opts([{ letter: 'A', qid: null, seconds: 5 }])), /Tempo/);
  assert.throws(() => game.start(room, opts([])), /pelo menos uma/);
});

test('giro + tempo da letra; depois corrige, pontua e revela na ordem de envio', () => {
  const { game, room, players, tick } = setup(4);
  game.start(room, opts([{ letter: 'M', qid: 'm-mouse', seconds: 20 }, { letter: 'T', qid: 't-teclado', seconds: null }]));
  assert.equal(room.phase, 'question');
  assert.equal(game.view(room).answer, null); // gabarito escondido durante a pergunta
  tick(SPIN_MS + 1000);
  game.answer(room, players[2].id, 'Mause'); // 1 letra errada
  tick(500);
  game.answer(room, players[0].id, 'monitor');
  assert.throws(() => game.answer(room, players[0].id, 'mouse'), /já respondeu/);
  tick(20_000);
  assert.equal(room.phase, 'reveal');
  const v = game.view(room);
  assert.equal(v.answer, 'Mouse');
  assert.deepEqual(v.reveal.map((r) => [r.name, r.ok]), [['Aluno 3', true], ['Aluno 1', false]]);
  assert.equal(players[2].score, 1);
  assert.equal(players[2].time, 1000);
  assert.equal(room.slots[0].pct, 25);
  assert.throws(() => game.answer(room, players[1].id, 'mouse'), /acabou/);
  tick(revealPlan(2).total);
  assert.equal(room.phase, 'question');
  assert.equal(room.idx, 1);
  assert.equal(room.slots[1].seconds, 30);
});

test('todos os alunos conectados responderam: fecha a letra na hora', () => {
  const { game, room, players } = setup(3);
  game.start(room, opts([{ letter: 'U', qid: 'u-usb', seconds: 60 }]));
  game.setOnline(room, players[2].id, false);
  game.answer(room, players[0].id, 'usb');
  assert.equal(room.phase, 'question');
  game.answer(room, players[1].id, 'usb');
  assert.equal(room.phase, 'reveal');
  assert.equal(room.early, true);
});

test('revelação: trios de 3, pular vai ao próximo trio e depois à próxima letra', () => {
  const { game, room, players, tick } = setup(7);
  game.start(room, opts([{ letter: 'U', qid: 'u-usb', seconds: 30 }, { letter: 'Z', qid: 'z-zip', seconds: 30 }]));
  players.slice(0, 6).forEach((p) => game.answer(room, p.id, 'usb'));
  game.skip(room); // encerra o tempo
  assert.equal(room.phase, 'reveal');
  const plan = revealPlan(6);
  assert.equal(plan.starts.length, Math.ceil(6 / TRIO));
  const elapsed = () => plan.total - (room.endsAt - game.view(room).serverNow);
  game.skip(room);
  assert.equal(elapsed(), plan.starts[0]);
  game.skip(room);
  assert.equal(elapsed(), plan.starts[1]);
  game.skip(room);
  assert.equal(elapsed(), plan.outro);
  game.skip(room);
  assert.equal(room.phase, 'question');
  assert.equal(room.idx, 1);
  tick(1);
});

test('pausa congela a letra e o tempo restante', () => {
  const { game, room, players, tick } = setup(2);
  game.start(room, opts([{ letter: 'U', qid: 'u-usb', seconds: 30 }]));
  tick(5000);
  game.setPaused(room, true);
  assert.throws(() => game.answer(room, players[0].id, 'usb'), /pausou/);
  tick(120_000);
  assert.equal(room.phase, 'question');
  game.setPaused(room, false);
  tick(SPIN_MS + 30_000 - 5000 - 1);
  assert.equal(room.phase, 'question');
  tick(2);
  assert.equal(room.phase, 'reveal');
});

test('fim da roda vai para o pódio; ranking por acertos e depois rapidez', () => {
  const { game, room, players, tick } = setup(3);
  game.start(room, opts([{ letter: 'U', qid: 'u-usb', seconds: 30 }]));
  tick(SPIN_MS + 3000);
  game.answer(room, players[1].id, 'usb');
  tick(1000);
  game.answer(room, players[0].id, 'usb');
  game.answer(room, players[2].id, 'xyz');
  tick(revealPlan(3).total + 10);
  assert.equal(room.phase, 'finished');
  const ranked = rankPlayers(game.view(room).players);
  assert.deepEqual(ranked.map((p) => [p.name, p.place]), [['Aluno 2', 1], ['Aluno 1', 2], ['Aluno 3', 3]]);
  game.restart(room);
  assert.equal(room.phase, 'lobby');
  assert.ok([...room.players.values()].every((p) => p.score === 0));
});

test('linha do tempo: marca de cada aluno cai dentro do seu trio', () => {
  const plan = revealPlan(8);
  assert.equal(plan.starts.length, 3);
  for (let i = 0; i < 8; i++) {
    const t = markTime(plan, i, 12);
    const trio = Math.floor(i / TRIO);
    const end = plan.starts[trio + 1] ?? plan.outro;
    assert.ok(t > plan.starts[trio] && t < end, `aluno ${i}`);
  }
  assert.ok(QUESTION_BY_ID.get('u-usb'));
});
