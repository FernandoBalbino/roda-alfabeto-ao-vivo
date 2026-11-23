// Tela do aluno (Chromebook): só a letra, a definição e o campo de resposta. Depois de enviar, a resposta fica borrada.
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import type { PublicPlayer, PublicRoom } from '../../shared/protocol.ts';
import { HIGHLIGHT, MAX_ANSWER, PODIUM, markTime, rankPlayers, revealPlan } from '../../shared/rules.ts';
import { markAnswered, send, useRemaining } from './net.ts';
import { Avatar, Logo, Mark, ruleText } from './ui.tsx';

export default function Player({ room, playerId, onExit }: { room: PublicRoom; playerId: string; onExit: () => void }) {
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return <main className="center-screen"><div className="spinner" /></main>;
  return (
    <main className="player" style={{ '--c': me.color } as CSSProperties}>
      <header className="p-bar">
        <Avatar name={me.name} color={me.color} size={40} />
        <div className="p-who">
          <strong>{me.name}</strong>
          <small>Sala {room.code}</small>
        </div>
        {/* Na revelação o placar some: o aluno só descobre se acertou quando o card dele aparece na TV. */}
        {room.phase !== 'reveal' && <span className="p-score" aria-label={`${me.score} acertos`}>⭐ {me.score}</span>}
      </header>
      {room.phase === 'lobby' && <Waiting me={me} onExit={onExit} />}
      {room.phase === 'question' && <Question room={room} me={me} key={room.idx} />}
      {room.phase === 'reveal' && <Result room={room} me={me} />}
      {room.phase === 'finished' && <PlayerFinal room={room} me={me} onExit={onExit} />}
    </main>
  );
}

function Waiting({ me, onExit }: { me: PublicPlayer; onExit: () => void }) {
  return (
    <section className="p-center">
      <Logo />
      <div className="float"><Avatar name={me.name} color={me.color} size={110} /></div>
      <h1>Você está na sala, {me.name.split(' ')[0]}!</h1>
      <p className="muted">Olhe para a TV. Quando a roleta parar numa letra, a definição aparece aqui. Digite a resposta e aperte Enter.</p>
      <p className="muted small">Pode escrever sem acento e em minúsculas. Uma letra trocada também vale.</p>
      <button className="btn btn-ghost btn-sm" onClick={onExit}>Sair da sala</button>
    </section>
  );
}

function Question({ room, me }: { room: PublicRoom; me: PublicPlayer }) {
  const remaining = useRemaining(room, 200);
  const total = room.seconds * 1000;
  const spinning = remaining > total;
  const left = Math.min(remaining, total);
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const q = room.q!;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy || me.answered || room.paused) return;
    setBusy(true);
    const res = await send('player:answer', { text });
    setBusy(false);
    if (res.ok) {
      setSent(text);
      markAnswered(me.id);
      setMsg('');
    } else setMsg(res.error);
  };

  useEffect(() => {
    if (!spinning) input.current?.focus();
  }, [spinning]);
  // Digitou mas não apertou Enter: envia sozinho no finalzinho do tempo.
  const auto = useRef(false);
  useEffect(() => {
    if (!spinning && !room.paused && left <= 900 && !auto.current && draft.trim() && !me.answered) {
      auto.current = true;
      void submit();
    }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  if (spinning) {
    return (
      <section className="p-center p-spin">
        <div className="p-spinner" aria-hidden="true">
          {'ABCDEFGH'.split('').map((l, i) => <span key={l} style={{ '--i': i } as CSSProperties}>{l}</span>)}
        </div>
        <h1>A roleta está girando…</h1>
        <p className="muted">Olhe para a TV!</p>
      </section>
    );
  }
  return (
    <section className="p-question">
      <div className="p-timer" aria-hidden="true">
        <span style={{ transform: `scaleX(${left / total})` }} className={left < 5500 ? 'urgent' : ''} />
      </div>
      <div className="p-letter">
        <span className="p-rule">{ruleText(q)}</span>
        <strong>{q.letter}</strong>
        <span className="p-secs" role="timer">{Math.ceil(left / 1000)}s</span>
      </div>
      <p className="p-clue">{q.clue}</p>
      {room.paused && <p className="banner">⏸ O professor pausou</p>}
      {me.answered ? (
        <div className="p-sent">
          <span className="p-sent-ok">✓ Resposta enviada</span>
          <p className="p-sent-text" aria-label="Sua resposta está escondida">{sent || '••••••••'}</p>
          <small className="muted">Borrada para ninguém espiar. O resultado aparece na TV quando o tempo acabar.</small>
        </div>
      ) : (
        <form className="p-form" onSubmit={submit}>
          <input
            ref={input} value={draft} maxLength={MAX_ANSWER} onChange={(e) => setDraft(e.target.value)}
            placeholder={`Resposta com ${q.letter}…`} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            aria-label="Sua resposta" disabled={room.paused || busy}
          />
          <button className="btn btn-primary" disabled={!draft.trim() || busy || room.paused}>Responder</button>
        </form>
      )}
      {msg && <p className="error" role="alert">{msg}</p>}
    </section>
  );
}

// Suspense igual ao da TV: o próprio resultado só aparece quando o card do aluno é marcado no telão.
function Result({ room, me }: { room: PublicRoom; me: PublicPlayer }) {
  const remaining = useRemaining(room, 250);
  const plan = revealPlan(room.reveal.length);
  const elapsed = plan.total - remaining;
  const i = room.reveal.findIndex((e) => e.id === me.id);
  const mine = room.reveal[i];
  const at = mine ? markTime(plan, i, mine.given.length) : plan.outro;
  if (elapsed < at) {
    const trio = mine ? Math.floor(i / 3) + 1 : 0;
    return (
      <section className="p-center p-wait">
        <h1 className="p-timeup">{room.early ? '✋ Todos responderam!' : '⏰ Tempo esgotado!'}</h1>
        <div className="eyes" aria-hidden="true">👀</div>
        <p>Olhe para a TV!</p>
        <p className="muted">{mine ? `Sua resposta aparece no trio ${trio} de ${plan.starts.length}.` : 'Você não respondeu esta letra.'}</p>
      </section>
    );
  }
  return (
    <section className={`p-center p-result ${mine ? (mine.ok ? 'r-ok' : 'r-bad') : 'r-none'}`}>
      {mine ? <Mark ok={mine.ok} className="p-mark" /> : <div className="eyes" aria-hidden="true">⌛</div>}
      <h1>{mine ? (mine.ok ? 'Acertou!' : 'Não foi dessa vez') : 'Sem resposta'}</h1>
      {mine && <p className="muted">Você respondeu: <b className="p-given">{mine.given}</b></p>}
      <div className="r-answer">
        <small>Resposta certa</small>
        <strong>{room.answer}</strong>
      </div>
      <p className="muted small">Total: {me.score} {me.score === 1 ? 'acerto' : 'acertos'}</p>
    </section>
  );
}

function PlayerFinal({ room, me, onExit }: { room: PublicRoom; me: PublicPlayer; onExit: () => void }) {
  const ranked = rankPlayers(room.players);
  const mine = ranked.find((p) => p.id === me.id)!;
  return (
    <section className="p-center p-final">
      <p className="kicker">Fim da roleta!</p>
      <h1 className="big-place">{mine.place}º lugar</h1>
      <p>
        {mine.score} {mine.score === 1 ? 'acerto' : 'acertos'} em {room.letters.length} letras
        {mine.place <= HIGHLIGHT ? ' · você está no top 5! 🏆' : mine.place <= PODIUM ? ' · você está no top 10! 🎉' : ''}
      </p>
      <p className="muted small">O pódio completo está na TV. Se o professor começar outra partida, você entra direto.</p>
      <button className="btn btn-ghost btn-sm" onClick={onExit}>Sair da sala</button>
    </section>
  );
}
