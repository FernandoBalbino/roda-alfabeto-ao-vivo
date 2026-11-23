// Revelação na TV: "Tempo esgotado!", resposta certa, alunos de 3 em 3 (um a cada 2 s, digitando a resposta
// e marcando ✓ ou ✕) e o placar parcial. Tudo guiado pelo relógio do servidor: recarregar volta no ponto certo.
import { useRef, type CSSProperties } from 'react';
import type { PublicRoom, RevealEntry } from '../../shared/protocol.ts';
import {
  CARD_GAP_MS, INTRO_MS, TRIO, TYPE_DELAY_MS, markAt, rankPlayers, revealPlan, typeMs,
} from '../../shared/rules.ts';
import { useRemaining } from './net.ts';
import { play, type SoundName } from './sound.ts';
import { Avatar, Mark, Typed, reducedMotion, ruleText } from './ui.tsx';

const TIMEUP_MS = 1400;
const typedChars = (text: string, t: number) =>
  reducedMotion() ? text.length : Math.floor(((t - TYPE_DELAY_MS) / Math.max(1, typeMs(text.length))) * text.length);

export default function Reveal({ room }: { room: PublicRoom }) {
  const remaining = useRemaining(room, 50);
  const entries = room.reveal;
  const plan = revealPlan(entries.length);
  const elapsed = plan.total - remaining;
  const answer = room.answer ?? '';
  const q = room.q!;

  // Sons disparados uma vez por evento (marcas, letras digitadas), mesmo com várias renderizações.
  const fired = useRef(new Set<string>());
  const once = (key: string, name: SoundName, volume?: number) => {
    const k = `${room.idx}:${key}`;
    if (fired.current.has(k)) return;
    fired.current.add(k);
    play(name, volume);
  };

  const trio = plan.starts.findLastIndex((s) => elapsed >= s);
  const inOutro = elapsed >= plan.outro;

  // ---------- abertura ----------
  if (elapsed < INTRO_MS) {
    if (elapsed < TIMEUP_MS) {
      if (elapsed < 400) once('timeup', 'timeup');
      return (
        <section className="rv-stage rv-intro">
          <h1 className="rv-timeup">{room.early ? '✋ Todos responderam!' : '⏰ Tempo esgotado!'}</h1>
        </section>
      );
    }
    const shown = typedChars(answer, elapsed - TIMEUP_MS);
    if (shown > 0 && shown <= answer.length) once(`a${shown}`, 'type', 0.05);
    return (
      <section className="rv-stage rv-intro">
        <p className="rv-kicker">A resposta da letra <b>{q.letter}</b> era</p>
        <h1 className="rv-answer"><Typed text={answer} shown={shown} /></h1>
        <p className="muted rv-sub">{entries.length ? `Agora as respostas da turma, de 3 em 3…` : 'Ninguém respondeu esta letra.'}</p>
      </section>
    );
  }

  const head = (
    <header className="rv-head">
      <span className="rv-ball">{q.letter}</span>
      <span className="rv-head-text"><small>{ruleText(q)} {q.letter} · resposta certa</small><b>{answer}</b></span>
      <span className="spacer" />
      {!inOutro && plan.starts.length > 0 && (
        <span className="rv-progress" aria-label={`Trio ${trio + 1} de ${plan.starts.length}`}>
          <small>Trio {trio + 1} de {plan.starts.length}</small>
          <span className="rv-dots">
            {plan.starts.map((_, i) => <i key={i} className={i < trio ? 'done' : i === trio ? 'now' : ''} />)}
          </span>
        </span>
      )}
    </header>
  );

  // ---------- placar parcial ----------
  if (inOutro || trio < 0) {
    const right = entries.filter((e) => e.ok).length;
    const silent = Math.max(0, room.players.length - entries.length);
    const top = rankPlayers(room.players).slice(0, 5);
    const last = room.idx + 1 >= room.letters.length;
    return (
      <section className="rv-stage rv-outro-wrap">
        {head}
        <div className="rv-outro">
          <div className="rv-stats">
            <div className="st st-ok"><Mark ok /><b>{right}</b><span>{right === 1 ? 'acertou' : 'acertaram'}</span></div>
            <div className="st st-bad"><Mark ok={false} /><b>{entries.length - right}</b><span>{entries.length - right === 1 ? 'errou' : 'erraram'}</span></div>
            {silent > 0 && <div className="st st-none"><span className="st-ico">⌛</span><b>{silent}</b><span>sem resposta</span></div>}
          </div>
          <div className="panel rv-top">
            <h2>Placar parcial</h2>
            <ol>
              {top.map((p) => (
                <li key={p.id} style={{ '--c': p.color } as CSSProperties}>
                  <span className="rt-place">{p.place}º</span>
                  <Avatar name={p.name} color={p.color} size={34} />
                  <span className="rt-name">{p.name}</span>
                  <b>{p.score}</b>
                </li>
              ))}
            </ol>
            <p className="rv-next">{last ? '🏆 Essa foi a última letra! Agora o pódio…' : `Próxima letra: ${room.letters[room.idx + 1].letter}`}</p>
          </div>
        </div>
      </section>
    );
  }

  // ---------- trio da vez ----------
  const t0 = plan.starts[trio];
  const group = entries.slice(trio * TRIO, trio * TRIO + TRIO);
  return (
    <section className="rv-stage">
      {head}
      <div className="rv-cards" key={trio}>
        {group.map((e, j) => {
          const t = elapsed - t0 - j * CARD_GAP_MS;
          return t >= 0 && <Card key={e.id} e={e} t={t} once={(k, s, v) => once(`${trio}:${j}:${k}`, s, v)} />;
        })}
      </div>
    </section>
  );
}

function Card({ e, t, once }: { e: RevealEntry; t: number; once: (key: string, name: SoundName, volume?: number) => void }) {
  const shown = typedChars(e.given, t);
  const marked = reducedMotion() || t >= markAt(e.given.length);
  if (shown > 0 && shown <= e.given.length) once(`c${shown}`, 'type', 0.05);
  if (marked) once('mark', e.ok ? 'ok' : 'bad');
  return (
    <article className={`rv-card ${marked ? (e.ok ? 'is-ok' : 'is-bad') : ''}`} style={{ '--c': e.color } as CSSProperties}>
      <div className="rc-who">
        <Avatar name={e.name} color={e.color} size={64} />
        <strong className="rc-name">{e.name}</strong>
      </div>
      <small className="rc-label">respondeu</small>
      <p className="rc-answer"><Typed text={e.given} shown={shown} /></p>
      {marked && <Mark ok={e.ok} className="rc-mark" />}
    </article>
  );
}
