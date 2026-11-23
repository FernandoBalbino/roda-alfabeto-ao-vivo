// Peças visuais reaproveitadas pela TV e pelo aluno.
import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import type { PublicQuestion, WheelLetter } from '../../shared/protocol.ts';
import { CATEGORIES } from '../../shared/rules.ts';
import { toggleMuted, useMuted } from './sound.ts';

export const BASE = import.meta.env.BASE_URL;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const ruleText = (q: Pick<PublicQuestion, 'rule'>) => (q.rule === 'contains' ? 'Contém' : 'Começa com');
export const joinUrl = () => `${location.host}${BASE}`.replace(/\/$/, '');

export function Logo({ small }: { small?: boolean }) {
  return (
    <span className={`logo ${small ? 'logo-sm' : ''}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd45a" />
            <stop offset="1" stopColor="#7c5cff" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="17" fill="url(#lg)" />
        <circle cx="20" cy="20" r="11" fill="#101c34" />
        {Array.from({ length: 8 }, (_, i) => (
          <circle key={i} cx={20 + 14 * Math.cos((i * Math.PI) / 4)} cy={20 + 14 * Math.sin((i * Math.PI) / 4)} r="1.9" fill="#fff" />
        ))}
        <text x="20" y="25" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff" fontFamily="Fredoka, sans-serif">A</text>
      </svg>
      <span>Roda do <b>Alfabeto</b></span>
      {!small && <em className="live">ao vivo</em>}
    </span>
  );
}

// Bolinha com a inicial: a cor diferencia cada aluno.
export function Avatar({ name, color, size = 48 }: { name: string; color: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <span className="avatar" style={{ '--c': color, width: size, height: size, fontSize: size * 0.4 } as CSSProperties} aria-hidden="true">
      {initials}
    </span>
  );
}

export function CategoryChip({ category }: { category: string }) {
  const c = CATEGORIES[category];
  if (!c) return null;
  return <span className="cat" style={{ '--c': c.color } as CSSProperties}>{c.label}</span>;
}

// ✓ verde ou ✕ vermelho desenhados com traço (animação de "risco").
export function Mark({ ok, className = '' }: { ok: boolean; className?: string }) {
  return (
    <svg className={`mark ${ok ? 'mark-ok' : 'mark-bad'} ${className}`} viewBox="0 0 100 100" role="img" aria-label={ok ? 'Certo' : 'Errado'}>
      <circle cx="50" cy="50" r="44" className="mark-bg" />
      {ok ? (
        <path d="M27 52 L44 68 L74 34" className="mark-line" pathLength={1} />
      ) : (
        <>
          <path d="M32 32 L68 68" className="mark-line" pathLength={1} />
          <path d="M68 32 L32 68" className="mark-line mark-line-2" pathLength={1} />
        </>
      )}
    </svg>
  );
}

// Texto aparecendo letra por letra: `shown` letras já digitadas.
export function Typed({ text, shown, className = '' }: { text: string; shown: number; className?: string }) {
  const done = shown >= text.length;
  return (
    <span className={`typed ${className}`} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, Math.max(0, shown))}</span>
      {!done && <span className="caret" aria-hidden="true" />}
    </span>
  );
}

// Posição de cada letra ao redor da roda, em % do diâmetro, começando no topo.
const wheelPos = (i: number, n: number, r = 43) => {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { left: `${50 + r * Math.cos(a)}%`, top: `${50 + r * Math.sin(a)}%` };
};

// A roleta: o anel de letras gira até a letra da vez parar embaixo do ponteiro (só `transform`).
export function Wheel({ letters, idx, active, center, spinning }: {
  letters: WheelLetter[];
  idx: number;
  active: boolean;
  center: ReactNode;
  spinning?: boolean;
}) {
  const n = Math.max(1, letters.length);
  // Duas voltas inteiras a cada letra. A roda nasce na letra anterior e gira até a da vez no quadro seguinte.
  const turn = (i: number) => (i >= 0 ? -(i * 360) / n - 720 * (i + 1) : 0);
  const target = turn(idx);
  const [angle, setAngle] = useState(() => (spinning ? (idx > 0 ? turn(idx - 1) : 0) : target));
  useEffect(() => {
    if (angle === target) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setAngle(target))));
    return () => (cancelAnimationFrame(outer), cancelAnimationFrame(inner));
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  const ball = Math.min(11.5, (250 / n) * 0.92);
  return (
    <div className={`wheel ${spinning ? 'is-spinning' : ''}`} style={{ '--ball': ball } as CSSProperties}>
      <span className="wheel-glow" aria-hidden="true" />
      <span className="wheel-pointer" aria-hidden="true" />
      <div className="wheel-ring" style={{ transform: `rotate(${angle}deg)` }}>
        <span className="wheel-dash" aria-hidden="true" />
        {letters.map((l, i) => {
          const state = active && i === idx ? 'current' : l.pct === null ? 'pending' : l.pct >= 50 ? 'good' : 'low';
          return (
            <span key={l.letter} className={`wl wl-${state}`} style={wheelPos(i, n)}>
              <span style={{ transform: `rotate(${-angle}deg)` }}>{l.letter}</span>
            </span>
          );
        })}
      </div>
      <div className="wheel-center">{center}</div>
    </div>
  );
}

export function MuteBtn() {
  const muted = useMuted();
  return (
    <button className="btn btn-sm btn-ghost" onClick={toggleMuted} aria-label={muted ? 'Ligar som' : 'Desligar som'} title={muted ? 'Ligar som' : 'Desligar som'}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

const fsListeners = new Set<() => void>();
document.addEventListener('fullscreenchange', () => fsListeners.forEach((f) => f()));
export function FullscreenBtn() {
  const on = useSyncExternalStore((f) => (fsListeners.add(f), () => void fsListeners.delete(f)), () => Boolean(document.fullscreenElement));
  const toggle = () => (on ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
  return (
    <button className="btn btn-sm btn-ghost" onClick={toggle} aria-label={on ? 'Sair da tela cheia' : 'Tela cheia'} title="Tela cheia">
      {on ? '🗗' : '⛶'}
    </button>
  );
}

// Força uma nova renderização a cada `every` ms (relógios e animações guiadas pelo tempo do servidor).
export function useTick(every: number) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), every);
    return () => clearInterval(t);
  }, [every]);
}

export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s);
};
