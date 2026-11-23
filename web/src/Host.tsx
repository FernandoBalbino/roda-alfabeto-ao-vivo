// Tela do professor, feita para a TV: sala de espera e configuração, roleta, revelação e pódio.
import confetti from 'canvas-confetti';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { BankItem, PublicPlayer, PublicRoom, StartOptions, TeacherAction } from '../../shared/protocol.ts';
import {
  ALPHABET, DEFAULT_SECONDS, HIGHLIGHT, PODIUM, SECONDS_OPTIONS, SPIN_MS, rankPlayers, revealPlan,
} from '../../shared/rules.ts';
import { send, useRemaining } from './net.ts';
import Reveal from './Reveal.tsx';
import { play } from './sound.ts';
import {
  Avatar, CategoryChip, FullscreenBtn, Logo, MuteBtn, Wheel, fmtClock, joinUrl, reducedMotion, ruleText,
} from './ui.tsx';

const act = (action: TeacherAction, playerId?: string) => send('teacher:action', { action, playerId });

export default function Host({ room, onExit }: { room: PublicRoom; onExit: () => void }) {
  if (room.phase === 'lobby') return <Lobby room={room} onExit={onExit} />;
  if (room.phase === 'finished') return <Final room={room} onExit={onExit} />;
  return <Game room={room} />;
}

function TvBar({ room, children }: { room: PublicRoom; children?: ReactNode }) {
  return (
    <header className="tv-bar">
      <Logo small />
      <span className="pill">Sala <b>{room.code}</b></span>
      {room.phase !== 'lobby' && room.phase !== 'finished' && (
        <span className="pill">Letra <b>{room.idx + 1}</b> de {room.letters.length}</span>
      )}
      <span className="spacer" />
      {children}
      <MuteBtn />
      <FullscreenBtn />
    </header>
  );
}

// ---------- configuração (fica salva no navegador do professor) ----------
// pick[letra]: '' = sorteada, 'off' = fora da roda, ou o id da definição escolhida.
interface Config { seconds: number; pick: Record<string, string>; time: Record<string, number> }
const CFG_KEY = 'roda-ao-vivo:config';
function loadConfig(): Config {
  const def: Config = { seconds: DEFAULT_SECONDS, pick: {}, time: {} };
  try {
    return { ...def, ...JSON.parse(localStorage.getItem(CFG_KEY) ?? '{}') };
  } catch {
    return def;
  }
}
function useConfig() {
  const [cfg, setCfg] = useState(loadConfig);
  useEffect(() => {
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    } catch { /* sem storage */ }
  }, [cfg]);
  return [cfg, setCfg] as const;
}

let bankCache: BankItem[] | null = null;
function useBank() {
  const [bank, setBank] = useState(bankCache);
  useEffect(() => {
    if (bankCache) return;
    send('teacher:bank', null).then((res) => {
      if (res.ok) setBank((bankCache = res.bank));
    });
  }, []);
  return bank;
}

function Lobby({ room, onExit }: { room: PublicRoom; onExit: () => void }) {
  const [cfg, setCfg] = useConfig();
  const bank = useBank();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const n = room.players.length;
  // Definição que sumiu do banco volta a ser sorteada.
  const pickOf = (l: string) => {
    const v = cfg.pick[l] ?? '';
    return v === 'off' || !v || !bank || bank.some((b) => b.id === v && b.letter === l) ? v : '';
  };
  const active = ALPHABET.filter((l) => pickOf(l) !== 'off');
  const chosen = active.filter((l) => pickOf(l)).length;
  const secsOf = (l: string) => cfg.time[l] || cfg.seconds;
  const estimate = Math.round(active.reduce((t, l) => t + SPIN_MS + secsOf(l) * 1000 + revealPlan(n).total, 0) / 60000);
  const start = async () => {
    const opts: StartOptions = {
      seconds: cfg.seconds,
      letters: active.map((letter) => ({ letter, qid: pickOf(letter) || null, seconds: cfg.time[letter] || null })),
    };
    setBusy(true);
    const res = await send('teacher:start', opts);
    setBusy(false);
    setError(res.ok ? '' : res.error);
  };
  return (
    <main className="lobby">
      <TvBar room={room}>
        <button className="btn btn-sm btn-ghost" onClick={onExit}>Sair</button>
      </TvBar>
      <section className="lobby-main">
        <p className="join-hint">Entre em <b>{joinUrl()}</b> e digite o código:</p>
        <div className="code-tiles" aria-label={`Código da sala: ${room.code}`}>
          {room.code.split('').map((c, i) => <span key={i} style={{ '--i': i } as CSSProperties}>{c}</span>)}
        </div>
        <h2 className="lobby-count">{n ? `${n} ${n === 1 ? 'aluno' : 'alunos'} na sala` : 'Esperando os alunos…'}</h2>
        <ul className="lobby-players">
          {room.players.map((p) => (
            <li key={p.id} className={`lobby-player ${p.online ? '' : 'off'}`} style={{ '--c': p.color } as CSSProperties}>
              <Avatar name={p.name} color={p.color} size={38} />
              <span className="lp-name">{p.name}</span>
              <button className="kick" onClick={() => act('kick', p.id)} aria-label={`Remover ${p.name}`} title="Remover">✕</button>
            </li>
          ))}
        </ul>
      </section>
      <aside className="panel lobby-panel">
        <h2>Configurações da sala</h2>
        <div className="field">
          <span>Tempo para responder cada letra</span>
          <div className="seg">
            {SECONDS_OPTIONS.map((s) => (
              <button key={s} className={cfg.seconds === s ? 'on' : ''} onClick={() => setCfg({ ...cfg, seconds: s })}>{s}s</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Letras e definições da roleta</span>
          <button className="letter-strip" onClick={() => setEditing(true)} aria-label="Escolher a definição de cada letra">
            {ALPHABET.map((l) => {
              const v = pickOf(l);
              return <span key={l} className={`ls ${v === 'off' ? 'ls-off' : v ? 'ls-pick' : ''}`}>{l}</span>;
            })}
          </button>
          <p className="muted small">
            {active.length} letras · {chosen ? `${chosen} com definição escolhida, ` : ''}{active.length - chosen} sorteadas
          </p>
          <button className="btn btn-sm" onClick={() => setEditing(true)}>Escolher definição e tempo de cada letra</button>
        </div>
        <p className="muted small">
          ≈ {estimate} min {n ? `com ${n} ${n === 1 ? 'aluno' : 'alunos'}` : ''} (a revelação de 3 em 3 cresce com a turma; dá para pular trios).
        </p>
        <button className="btn btn-primary btn-xl" disabled={!n || !active.length || busy} onClick={start}>Girar a roleta ▶</button>
        {error && <p className="error" role="alert">{error}</p>}
      </aside>
      {editing && <LetterEditor bank={bank} cfg={cfg} setCfg={setCfg} pickOf={pickOf} onClose={() => setEditing(false)} />}
    </main>
  );
}

function LetterEditor({ bank, cfg, setCfg, pickOf, onClose }: {
  bank: BankItem[] | null;
  cfg: Config;
  setCfg: (c: Config) => void;
  pickOf: (l: string) => string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);
  const setPick = (l: string, v: string) => setCfg({ ...cfg, pick: { ...cfg.pick, [l]: v } });
  const setTime = (l: string, v: number) => setCfg({ ...cfg, time: { ...cfg.time, [l]: v } });
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Letras e definições">
      <div className="editor">
        <header className="editor-head">
          <div>
            <h2>Letras e definições</h2>
            <p className="muted">
              Escolha qual definição aparece em cada letra (ou deixe sorteada), o tempo de cada uma e tire letras da roda se quiser uma partida mais curta.
            </p>
          </div>
          <div className="editor-actions">
            <button className="btn btn-sm" onClick={() => setCfg({ ...cfg, pick: {} })}>🎲 Todas sorteadas</button>
            <button className="btn btn-sm" onClick={() => setCfg({ ...cfg, time: {} })}>Mesmo tempo em todas</button>
            <button className="btn btn-sm btn-primary" onClick={onClose}>Pronto</button>
          </div>
        </header>
        {!bank ? (
          <div className="center-screen"><div className="spinner" /></div>
        ) : (
          <div className="editor-grid">
            {ALPHABET.map((l) => {
              const v = pickOf(l);
              const options = bank.filter((b) => b.letter === l);
              const chosen = options.find((b) => b.id === v);
              return (
                <div key={l} className={`le-row ${v === 'off' ? 'off' : ''}`}>
                  <span className="le-ball">{l}</span>
                  <div className="le-main">
                    <div className="le-selects">
                      <select value={v} onChange={(e) => setPick(l, e.target.value)} aria-label={`Definição da letra ${l}`}>
                        <option value="">🎲 Sorteada ({options.length} opções)</option>
                        {options.map((b) => (
                          <option key={b.id} value={b.id}>{b.answer}{b.rule === 'contains' ? ` (contém ${l})` : ''}</option>
                        ))}
                        <option value="off">🚫 Não usar esta letra</option>
                      </select>
                      <select
                        value={cfg.time[l] || 0} onChange={(e) => setTime(l, Number(e.target.value))}
                        aria-label={`Tempo da letra ${l}`} disabled={v === 'off'}
                      >
                        <option value={0}>Padrão ({cfg.seconds}s)</option>
                        {SECONDS_OPTIONS.map((s) => <option key={s} value={s}>{s}s</option>)}
                      </select>
                    </div>
                    <p className="le-clue">
                      {v === 'off' ? 'Fora da roda.' : chosen ? chosen.clue : 'Uma das definições desta letra é sorteada quando a partida começa.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- letra em jogo ----------
function Game({ room }: { room: PublicRoom }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') (e.preventDefault(), act(room.paused ? 'resume' : 'pause'));
      if (e.key === 'ArrowRight') act('skip');
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [room.paused]);

  const question = room.phase === 'question';
  return (
    <main className={`tv phase-${room.phase} ${room.paused ? 'paused' : ''}`}>
      <TvBar room={room}>
        <button className="btn btn-sm" onClick={() => act(room.paused ? 'resume' : 'pause')}>
          {room.paused ? '▶ Continuar' : '⏸ Pausar'}
        </button>
        <button className="btn btn-sm" onClick={() => act('skip')}>{question ? '⏭ Encerrar tempo' : '⏭ Próximo trio'}</button>
        {!question && <button className="btn btn-sm" onClick={() => act('next')}>⏩ Próxima letra</button>}
        <button className="btn btn-sm btn-danger" onClick={() => confirm('Encerrar a partida agora e ir para o pódio?') && act('end')}>
          Encerrar
        </button>
      </TvBar>
      {question ? <Question room={room} /> : <Reveal room={room} />}
      {room.paused && <div className="paused-badge">⏸ Pausado</div>}
    </main>
  );
}

function Question({ room }: { room: PublicRoom }) {
  const remaining = useRemaining(room, 200);
  const total = room.seconds * 1000;
  const spinning = remaining > total;
  const left = Math.min(remaining, total);
  const secs = Math.ceil(left / 1000);
  const q = room.q!;
  const answered = room.players.filter((p) => p.answered).length;

  // Estalinhos da roleta freando, e um acorde quando ela para.
  useEffect(() => {
    if (!spinning || reducedMotion()) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 0;
    for (let i = 0; t < SPIN_MS - 250; i++) {
      timers.push(setTimeout(() => play('tick', 0.05), t));
      t += 45 + i * i * 2.2;
    }
    timers.push(setTimeout(() => play('land'), SPIN_MS - 150));
    return () => timers.forEach(clearTimeout);
  }, [room.idx]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!spinning && !room.paused && secs > 0 && secs <= 5) play('count', 0.12);
  }, [secs]); // eslint-disable-line react-hooks/exhaustive-deps

  const C = 2 * Math.PI * 46;
  return (
    <section className="tv-q">
      <div className="wheel-wrap">
        <Wheel
          letters={room.letters} idx={room.idx} active spinning={spinning}
          center={spinning ? (
            <span className="wc-spin" key="spin">?</span>
          ) : (
            <div className="wc" key={room.idx}>
              <svg className={`wc-ring ${secs <= 5 ? 'urgent' : ''}`} viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="46" className="wc-ring-bg" />
                <circle cx="50" cy="50" r="46" className="wc-ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - left / total)} />
              </svg>
              <span className="wc-rule">{ruleText(q)}</span>
              <strong className="wc-letter">{q.letter}</strong>
              <span className={`wc-time ${secs <= 5 ? 'urgent' : ''}`} role="timer" aria-label={`${secs} segundos`} key={secs <= 5 ? secs : 0}>
                {fmtClock(left)}
              </span>
            </div>
          )}
        />
      </div>
      <aside className={`q-side ${spinning ? 'is-waiting' : ''}`} key={room.idx}>
        <p className="kicker">Letra {room.idx + 1} de {room.letters.length} <CategoryChip category={q.category} /></p>
        <div className="rule-chip"><span>{ruleText(q)}</span><b>{q.letter}</b></div>
        <p className="clue">{spinning ? 'Girando a roleta…' : q.clue}</p>
        <div className="answered">
          <p><strong>{answered}</strong> de {room.players.length} responderam</p>
          <div className="answered-bar"><span style={{ transform: `scaleX(${room.players.length ? answered / room.players.length : 0})` }} /></div>
          <ul className="answered-chips">
            {room.players.map((p) => (
              <li key={p.id} className={`${p.answered ? 'on' : ''} ${p.online ? '' : 'off'}`} style={{ '--c': p.color } as CSSProperties}>
                {p.answered && <span aria-hidden="true">✓ </span>}{p.name}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </section>
  );
}

// ---------- pódio ----------
const PODIUM_ORDER = [3, 1, 0, 2, 4]; // 4º, 2º, 1º, 3º, 5º da esquerda para a direita

function Final({ room, onExit }: { room: PublicRoom; onExit: () => void }) {
  const ranked = rankPlayers(room.players);
  const top = ranked.slice(0, HIGHLIGHT);
  const runners = ranked.slice(HIGHLIGHT, PODIUM);
  const fired = useRef(false);
  useEffect(() => {
    play('fanfare');
    if (fired.current || reducedMotion()) return;
    fired.current = true;
    const end = Date.now() + 3200;
    const burst = () => {
      confetti({ particleCount: 40, spread: 75, origin: { x: Math.random(), y: 0.15 }, disableForReducedMotion: true });
      if (Date.now() < end) setTimeout(burst, 320);
    };
    setTimeout(burst, 1600);
  }, []);
  return (
    <main className="final">
      <TvBar room={room}>
        <button className="btn btn-sm btn-primary" onClick={() => act('restart')}>↻ Jogar de novo com a mesma turma</button>
        <button className="btn btn-sm btn-ghost" onClick={onExit}>Sair</button>
      </TvBar>
      <section className="podium-area">
        <p className="kicker">Fim da roleta · {room.letters.length} letras</p>
        <h1>Pódio</h1>
        <div className="podium">
          {PODIUM_ORDER.map((i) => top[i] && <Step key={top[i].id} p={top[i]} i={i} />)}
        </div>
        {runners.length > 0 && (
          <ol className="runners">
            {runners.map((p, k) => (
              <li key={p.id} style={{ '--c': p.color, '--d': `${2.2 + k * 0.12}s` } as CSSProperties}>
                <span className="rn-place">{p.place}º</span>
                <Avatar name={p.name} color={p.color} size={34} />
                <span className="rn-name">{p.name}</span>
                <span className="rn-score">{p.score}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <aside className="panel all-players">
        <h2>Todos os jogadores <small className="muted">({ranked.length})</small></h2>
        <ol className={`all-list ${ranked.length > 16 ? 'two-cols' : ''}`}>
          {ranked.map((p) => (
            <li key={p.id} className={p.place <= HIGHLIGHT ? 'hl' : p.place <= PODIUM ? 'top10' : ''} style={{ '--c': p.color } as CSSProperties}>
              <span className="al-place">{p.place}º</span>
              <span className="al-dot" />
              <span className="al-name">{p.name}</span>
              <span className="al-score">{p.score}</span>
            </li>
          ))}
        </ol>
        <p className="muted small">Mais acertos na frente. Empate: quem respondeu mais rápido nas letras que acertou.</p>
      </aside>
    </main>
  );
}

function Step({ p, i }: { p: PublicPlayer & { place: number }; i: number }) {
  return (
    <div className={`step step-${i + 1}`} style={{ '--c': p.color, '--d': `${(4 - i) * 0.3}s` } as CSSProperties}>
      {i === 0 && <span className="crown" aria-hidden="true">👑</span>}
      <Avatar name={p.name} color={p.color} size={i === 0 ? 96 : 72} />
      <strong className="step-name">{p.name}</strong>
      <span className="step-score">{p.score} {p.score === 1 ? 'acerto' : 'acertos'}</span>
      <div className="step-block"><span>{p.place}º</span></div>
    </div>
  );
}
