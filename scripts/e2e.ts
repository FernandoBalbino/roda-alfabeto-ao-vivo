// Partida de ponta a ponta com prints: TV (1366×768), dois alunos de verdade (Chromebook e celular) e alunos-robô.
// Uso local (servidor e Vite rodando): node scripts/e2e.ts
// Teste leve em produção:
//   E2E_URL=https://fernandobalbino.github.io/roda-alfabeto-ao-vivo/ SERVER_URL=https://roda-alfabeto-ao-vivo.onrender.com ROBOS=2 LETRAS=2 OUT=qa-evidence/producao node scripts/e2e.ts
import { chromium, type Page } from 'playwright';
import { io, type Socket } from 'socket.io-client';
import { mkdirSync } from 'node:fs';
import { QUESTIONS } from '../server/bank.ts';
import type { ClientEvents, PublicRoom, ServerEvents } from '../shared/protocol.ts';
import { ALPHABET, INTRO_MS } from '../shared/rules.ts';

const URL = process.env.E2E_URL ?? 'http://localhost:5173/roda-alfabeto-ao-vivo/';
const SERVER = process.env.SERVER_URL ?? 'http://localhost:3000';
const BOTS = Number(process.env.ROBOS ?? 14);
const LETTERS = Number(process.env.LETRAS ?? 3);
const OUT = process.env.OUT ?? 'qa-evidence';
mkdirSync(OUT, { recursive: true });

const step = (msg: string) => console.log('•', msg);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const answerOf = (r: PublicRoom) => QUESTIONS.find((q) => q.clue === r.q?.clue)!.answer;
const BOT_NAMES = ['Bia', 'Caio', 'Duda', 'Enzo', 'Gabi', 'Heitor', 'Isa', 'Lucas', 'Malu', 'Nina', 'Otávio', 'Pietra', 'Rafa', 'Sofia', 'Theo', 'Vitória', 'Yuri', 'Zeca'];

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' }); // CI: PW_CHANNEL=chromium
const errors: string[] = [];
const open = async (w: number, h: number, init?: () => void) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  page.on('dialog', (d) => d.accept());
  return page;
};
const shot = (p: Page, name: string) => p.screenshot({ path: `${OUT}/${name}.png` });

// Robôs: respondem cada letra; os 4 primeiros acertam (às vezes com erro de digitação), os outros acertam metade.
const sockets: Socket<ServerEvents, ClientEvents>[] = [];
let last: PublicRoom | null = null;
const botJoin = async (code: string, k: number) => {
  const s: Socket<ServerEvents, ClientEvents> = io(SERVER, { transports: ['websocket'] });
  let idx = -1;
  s.on('state', (r) => {
    if (s === sockets[0]) last = r;
    if (r.phase !== 'question' || r.idx === idx) return;
    idx = r.idx;
    const right = answerOf(r);
    const text = k < 4 || Math.random() < 0.5 ? (k % 2 ? right.toLowerCase() : right) : 'não sei';
    setTimeout(() => s.emit('player:answer', { text }, () => {}), 2900 + Math.random() * 2500);
  });
  await new Promise<void>((ok) => s.emit('player:join', { code, name: BOT_NAMES[k % BOT_NAMES.length] }, () => ok()));
  sockets.push(s);
};
const kidJoin = async (code: string, name: string, w: number, h: number) => {
  const kid = await open(w, h);
  await kid.goto(`${URL}?sala=${code}`);
  await kid.getByLabel('Seu nome').fill(name);
  await kid.getByRole('button', { name: 'Entrar na sala' }).click();
  await kid.getByText('Você está na sala').waitFor();
  return kid;
};
const tvBtn = (tv: Page, name: RegExp) => tv.locator('.tv-bar').getByRole('button', { name }).click();
const answer = async (kid: Page, text: string) => {
  await kid.getByLabel('Sua resposta').fill(text);
  await kid.getByRole('button', { name: 'Responder' }).click();
  try {
    await kid.locator('.p-sent, .p-wait').first().waitFor({ timeout: 8000 }); // o último a responder já cai na revelação
  } catch (err) {
    await shot(kid, 'erro-envio');
    throw err;
  }
  await wait(600); // fim da animação do cartão
};

try {
  // Configuração salva do professor: só as primeiras letras, para a partida de teste ser curta.
  const tv = await open(1366, 768, () => {
    if (localStorage.getItem('e2e-config')) return;
    localStorage.setItem('e2e-config', '1');
    localStorage.removeItem('roda-ao-vivo:sessao');
    localStorage.setItem('roda-ao-vivo:config', JSON.stringify({ seconds: 30, pick: {}, time: {} }));
  });
  await tv.goto(URL);
  await tv.getByText('Servidor pronto').waitFor({ timeout: 120_000 }); // o Render pode estar dormindo
  await wait(900); // fim da animação de entrada
  await shot(tv, '00-inicio');
  await tv.getByRole('button', { name: /Sou professor/ }).click();
  const code = (await tv.locator('.code-tiles').getAttribute('aria-label'))!.replace('Código da sala: ', '');
  step(`sala ${code}`);

  // Configurações: 15 s por letra; letra A com definição escolhida; o resto fora (teste curto).
  await tv.locator('.seg').getByRole('button', { name: '15s' }).click();
  await tv.getByRole('button', { name: /Escolher definição e tempo/ }).click();
  await wait(500);
  await tv.getByLabel('Definição da letra A').selectOption('a-alto-falante');
  await tv.getByLabel('Tempo da letra B').selectOption('20');
  await shot(tv, '01-tv-editor-letras');
  for (const l of ALPHABET.slice(LETTERS)) await tv.getByLabel(`Definição da letra ${l}`).selectOption('off');
  await tv.getByRole('button', { name: 'Pronto' }).click();

  const kid = await kidJoin(code, 'Ana Clara', 1366, 768);
  await shot(kid, '02-aluno-sala-de-espera');
  const phone = await kidJoin(code, 'João Pedro', 412, 860);
  for (let k = 0; k < BOTS; k++) await botJoin(code, k);
  await tv.getByText(`${BOTS + 2} alunos na sala`).waitFor();
  await wait(800);
  await shot(tv, '03-tv-sala-de-espera');

  await tv.getByRole('button', { name: /Girar a roleta/ }).click();
  await wait(900);
  await shot(tv, '04-tv-roleta-girando');
  await shot(kid, '05-aluno-roleta-girando');
  await tv.locator('.wc-letter').waitFor();
  await wait(700);
  await shot(tv, '06-tv-letra-e-definicao');
  await kid.getByLabel('Sua resposta').waitFor();
  await shot(kid, '07-aluno-pergunta');
  await shot(phone, '08-celular-pergunta');

  // Letra A: Ana acerta sem acento e sem hífen; João erra.
  await answer(kid, 'alto falante');
  await shot(kid, '09-aluno-resposta-borrada');
  await wait(3500);
  await shot(tv, '10-tv-quem-respondeu');
  await answer(phone, 'antena');
  step('letra A respondida');

  // Revelação: tempo esgotado → resposta certa → trio 1 (card a card) → placar.
  const card = (n: number) => tv.locator('.rv-card').nth(n);
  await tv.locator('.rv-timeup').waitFor({ timeout: 30_000 });
  await wait(500);
  await shot(tv, '11-tv-tempo-esgotado');
  await shot(kid, '12-aluno-olhe-a-tv');
  await tv.locator('.rv-answer').waitFor();
  await wait(900);
  await shot(tv, '13-tv-resposta-certa-digitando');
  await card(0).waitFor();
  await wait(700);
  await shot(tv, '14-tv-trio-1-card-1-digitando');
  await tv.locator('.rv-card.is-ok, .rv-card.is-bad').first().waitFor();
  await wait(800);
  await shot(tv, '15-tv-trio-1-card-1-marcado');
  await card(1).waitFor();
  await wait(900);
  await shot(tv, '16-tv-trio-1-card-2');
  await tv.locator('.rv-card:nth-child(3):is(.is-ok, .is-bad)').waitFor();
  await wait(900);
  await shot(tv, '17-tv-trio-1-completo');
  await tvBtn(tv, /Próximo trio/);
  await wait(400); // o trio novo substitui o anterior
  await tv.locator('.rv-card:nth-child(3):is(.is-ok, .is-bad)').waitFor();
  await wait(900);
  await shot(tv, '18-tv-trio-2');
  await kid.locator('.p-result').waitFor({ timeout: 60_000 });
  await wait(900);
  await shot(kid, '19-aluno-resultado-acertou');
  await phone.locator('.p-result').waitFor({ timeout: 60_000 });
  await wait(900);
  await shot(phone, '20-celular-resultado-errou');
  while (!(await tv.locator('.rv-outro').count())) await tvBtn(tv, /Próximo trio/).then(() => wait(400));
  await wait(900);
  await shot(tv, '21-tv-placar-parcial');
  await tvBtn(tv, /Próxima letra/);

  // Demais letras: os dois alunos respondem rápido; a letra fecha quando todos responderam.
  for (let i = 1; i < LETTERS; i++) {
    await kid.getByLabel('Sua resposta').waitFor({ timeout: 30_000 });
    await answer(kid, answerOf(last!).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase());
    await answer(phone, i % 2 ? answerOf(last!).slice(0, -1) : 'xyz');
    await tv.locator('.rv-timeup').waitFor({ timeout: 30_000 });
    await wait(INTRO_MS + 1500);
    if (i === 1) await shot(tv, '22-tv-letra-2-trio');
    await tvBtn(tv, /Próxima letra/);
    step(`letra ${i + 1} ok`);
  }

  await tv.locator('.podium').waitFor({ timeout: 30_000 });
  await wait(3500);
  await shot(tv, '23-tv-podio-top10-e-todos');
  await kid.locator('.p-final').waitFor();
  await shot(kid, '24-aluno-final');
  await shot(phone, '25-celular-final');
  if (errors.length) throw new Error(`Erros no console:\n${errors.join('\n')}`);
  step(`ok: ${OUT}/`);
} finally {
  sockets.forEach((s) => s.close());
  await browser.close();
}
