import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distance, forms, isCorrect, normalize } from '../server/answer.ts';
import { QUESTIONS, QUESTION_BY_ID } from '../server/bank.ts';
import { ALPHABET } from '../shared/rules.ts';

const q = (id: string) => QUESTION_BY_ID.get(id)!;

test('banco: 84 definições, todas as letras, ids únicos e regra da letra respeitada', () => {
  assert.equal(QUESTIONS.length, 84);
  assert.equal(new Set(QUESTIONS.map((x) => x.id)).size, QUESTIONS.length);
  for (const l of ALPHABET) assert.ok(QUESTIONS.filter((x) => x.letter === l).length >= 3, l);
  for (const x of QUESTIONS) {
    const a = normalize(x.answer);
    const l = x.letter.toLowerCase();
    assert.ok(x.rule === 'contains' ? a.includes(l) : a.startsWith(l), x.id);
    assert.ok(!normalize(x.clue).includes(a), `a definição cita a resposta: ${x.id}`);
  }
});

test('aceita sem acento, minúsculas, maiúsculas, espaços e hífens', () => {
  assert.ok(isCorrect(q('a-antivirus'), 'antivirus'));
  assert.ok(isCorrect(q('a-antivirus'), 'ANTIVÍRUS'));
  assert.ok(isCorrect(q('p-placa-mae'), 'placa mae'));
  assert.ok(isCorrect(q('p-placa-mae'), 'Placa-Mãe'));
  assert.ok(isCorrect(q('w-wifi'), 'wi fi'));
  assert.ok(isCorrect(q('r-resolucao'), '  resolucao  '));
});

test('aceita uma letra errada, faltando, sobrando ou trocada de lugar', () => {
  assert.ok(isCorrect(q('m-mouse'), 'mause'));
  assert.ok(isCorrect(q('t-teclado'), 'teclaod'));
  assert.ok(isCorrect(q('p-processador'), 'procesador'));
  assert.ok(isCorrect(q('i-impressora'), 'impresora'));
  assert.ok(isCorrect(q('e-estabilizador'), 'estabilisadr')); // 10+ letras: até 2 erros
});

test('recusa resposta errada, vazia e siglas trocadas', () => {
  assert.ok(!isCorrect(q('m-mouse'), 'monitor'));
  assert.ok(!isCorrect(q('m-mouse'), ''));
  assert.ok(!isCorrect(q('c-cpu'), 'gpu')); // 3 letras: precisa ser exato
  assert.ok(!isCorrect(q('t-teclado'), 'tcld'));
});

test('outro termo do banco não vale como erro de digitação', () => {
  assert.ok(!isCorrect(q('f-fone'), 'fonte'));
  assert.ok(!isCorrect(q('o-online'), 'offline'));
  assert.ok(isCorrect(q('f-fone'), 'fones'));
});

test('erro de digitação ainda precisa respeitar a letra', () => {
  assert.ok(!isCorrect(q('k-notebook'), 'noteboo')); // perdeu justamente o K
  assert.ok(isCorrect(q('k-notebook'), 'notbook'));
});

test('distância conta troca de vizinhas como 1', () => {
  assert.equal(distance('teclado', 'teclaod'), 1);
  assert.equal(distance('abc', 'abc'), 0);
  assert.equal(distance('', 'abc'), 3);
  assert.ok(forms(q('a-aplicativo')).includes('app'));
});
