// Conexão com o servidor e estado da sala compartilhado entre as telas.
import { io, type Socket } from 'socket.io-client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Ack, ClientEvents, PublicRoom, ServerEvents } from '../../shared/protocol.ts';

export const SERVER_URL: string = import.meta.env.VITE_SERVER_URL || `${location.protocol}//${location.hostname}:3000`;

export const socket: Socket<ServerEvents, ClientEvents> = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnectionDelayMax: 4000,
});

let room: PublicRoom | null = null;
let kicked = false;
const offsets: number[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

// O relógio do servidor manda: a amostra com menor atraso de rede é a de maior diferença.
const sample = (serverNow: number) => {
  offsets.push(serverNow - Date.now());
  if (offsets.length > 12) offsets.shift();
};
export const serverNow = () => Date.now() + (offsets.length ? Math.max(...offsets) : 0);

socket.on('state', (r) => {
  sample(r.serverNow);
  room = r;
  emit();
});
// Só a TV recebe: um aluno respondeu a letra atual.
socket.on('answered', ({ id }) => markAnswered(id));
socket.on('kicked', () => {
  kicked = true;
  room = null;
  saveSession(null);
  emit();
});

export const clearRoom = () => {
  room = null;
  kicked = false;
  emit();
};

// Marca quem respondeu na hora (o próprio aluno, ou a TV ao receber `answered`).
export function markAnswered(id: string) {
  if (!room || room.phase !== 'question') return;
  room = { ...room, players: room.players.map((p) => (p.id === id ? { ...p, answered: true } : p)) };
  emit();
}

const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => void listeners.delete(f);
};
export const useRoom = () => useSyncExternalStore(subscribe, () => room);
export const useKicked = () => useSyncExternalStore(subscribe, () => kicked);

let connected = socket.connected;
socket.on('connect', () => ((connected = true), emit()));
socket.on('disconnect', () => ((connected = false), emit()));
export const useConnected = () => useSyncExternalStore(subscribe, () => connected);

export async function send<E extends keyof ClientEvents>(
  event: E,
  payload: Parameters<ClientEvents[E]>[0],
): Promise<Parameters<Parameters<ClientEvents[E]>[1]>[0]> {
  try {
    // @ts-expect-error emitWithAck não consegue inferir o tipo do ack genérico
    return await socket.timeout(8000).emitWithAck(event, payload);
  } catch {
    return { ok: false, error: 'Sem resposta do servidor. Verifique a internet.' } as Ack as never;
  }
}

// Tempo que falta na letra (ou na revelação), atualizado algumas vezes por segundo.
export function useRemaining(r: PublicRoom | null, every = 250) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), every);
    return () => clearInterval(t);
  }, [every]);
  if (!r) return 0;
  return Math.max(0, r.paused ? r.left : r.endsAt - serverNow());
}

// Sessão salva para voltar depois de recarregar a página.
export type Session =
  | { role: 'teacher'; code: string; token: string }
  | { role: 'player'; code: string; token: string; playerId: string };
const KEY = 'roda-ao-vivo:sessao';
export function loadSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}
export function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* modo anônimo sem storage: a sessão só vale até recarregar */
  }
}
