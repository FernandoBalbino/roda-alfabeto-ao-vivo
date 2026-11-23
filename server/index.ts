// Servidor de tempo real (Render free). Só troca mensagens pequenas; as telas ficam no GitHub Pages.
import express from 'express';
import { createServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { BankItem, ClientEvents, ServerEvents } from '../shared/protocol.ts';
import { QUESTIONS } from './bank.ts';
import { Game, GameError, type Clock, type Room } from './game.ts';

type Auth = { code: string; kind: 'teacher' } | { code: string; kind: 'player'; playerId: string };
type Sock = Socket<ClientEvents, ServerEvents, Record<string, never>, { auth?: Auth }>;

const BANK: BankItem[] = QUESTIONS.map(({ id, letter, rule, category, answer, clue }) => ({ id, letter, rule, category, answer, clue }));

export function createGameServer(origins: string[], clock?: Clock) {
  const app = express();
  app.disable('x-powered-by');
  const http = createServer(app);
  const io = new Server<ClientEvents, ServerEvents, Record<string, never>, { auth?: Auth }>(http, {
    cors: { origin: origins, methods: ['GET', 'POST'] },
    allowRequest: (req, cb) => cb(null, !req.headers.origin || origins.includes(req.headers.origin)),
    maxHttpBufferSize: 8192,
    perMessageDeflate: false,
    serveClient: false,
  });
  const tv = (code: string) => `${code}:tv`;

  // Várias mudanças no mesmo instante viram um único envio de estado.
  const pending = new Set<string>();
  const game = new Game({
    clock,
    onChange: (room) => {
      if (pending.has(room.code)) return;
      pending.add(room.code);
      queueMicrotask(() => {
        pending.delete(room.code);
        if (game.rooms.has(room.code)) io.to(room.code).emit('state', game.view(room));
      });
    },
  });
  setInterval(() => game.cleanup(), 15 * 60_000).unref();

  app.get('/health', (_req, res) => {
    res.set('Access-Control-Allow-Origin', '*').json({ ok: true, rooms: game.rooms.size });
  });

  const handle = <T extends object>(ack: unknown, fn: () => T) => {
    if (typeof ack !== 'function') return;
    try {
      ack({ ok: true, ...fn() });
    } catch (err) {
      ack({ ok: false, error: err instanceof GameError ? err.message : 'Erro inesperado. Tente de novo.' });
      if (!(err instanceof GameError)) console.error(err);
    }
  };

  const attach = (socket: Sock, room: Room, auth: Auth) => {
    socket.data.auth = auth;
    socket.join(room.code);
    if (auth.kind === 'teacher') socket.join(tv(room.code));
    socket.emit('state', game.view(room));
  };
  const socketsOf = (room: Room, playerId: string) =>
    [...io.sockets.sockets.values()].filter((s) => {
      const a = (s as Sock).data.auth;
      return a?.kind === 'player' && a.code === room.code && a.playerId === playerId;
    }) as Sock[];

  io.on('connection', (socket: Sock) => {
    const authed = () => {
      const auth = socket.data.auth;
      if (!auth) throw new GameError('Entre em uma sala primeiro.');
      return { auth, room: game.room(auth.code) };
    };
    const teacherRoom = () => {
      const { auth, room } = authed();
      if (auth.kind !== 'teacher') throw new GameError('Só o professor pode fazer isso.');
      return room;
    };

    socket.on('teacher:create', (_p, ack) =>
      handle(ack, () => {
        const room = game.createRoom();
        attach(socket, room, { code: room.code, kind: 'teacher' });
        return { code: room.code, token: room.teacherToken };
      }));

    socket.on('teacher:resume', (p, ack) =>
      handle(ack, () => {
        const room = game.teacher(p?.code, p?.token);
        attach(socket, room, { code: room.code, kind: 'teacher' });
        return {};
      }));

    // O banco com as respostas só vai para quem abriu a sala (o professor), nunca no código das telas.
    socket.on('teacher:bank', (_p, ack) => handle(ack, () => (teacherRoom(), { bank: BANK })));

    socket.on('teacher:start', (p, ack) => handle(ack, () => (game.start(teacherRoom(), p), {})));

    socket.on('teacher:action', (p, ack) =>
      handle(ack, () => {
        const room = teacherRoom();
        switch (p?.action) {
          case 'pause': game.setPaused(room, true); break;
          case 'resume': game.setPaused(room, false); break;
          case 'skip': game.skip(room); break;
          case 'next': game.next(room); break;
          case 'end': game.finish(room); break;
          case 'restart': game.restart(room); break;
          case 'kick': {
            const kicked = game.kick(room, p.playerId);
            for (const s of socketsOf(room, kicked.id)) {
              s.emit('kicked');
              s.leave(room.code);
              s.data.auth = undefined;
            }
            break;
          }
          default: throw new GameError('Ação desconhecida.');
        }
        return {};
      }));

    socket.on('player:join', (p, ack) =>
      handle(ack, () => {
        const { room, player } = game.join(p?.code, p?.name);
        attach(socket, room, { code: room.code, kind: 'player', playerId: player.id });
        return { playerId: player.id, token: player.token };
      }));

    socket.on('player:resume', (p, ack) =>
      handle(ack, () => {
        const { room, player } = game.resume(p?.code, p?.token);
        attach(socket, room, { code: room.code, kind: 'player', playerId: player.id });
        game.setOnline(room, player.id, true);
        return { playerId: player.id };
      }));

    // Resposta enviada: só a TV precisa saber quem respondeu (evento pequeno, sem reenviar a sala inteira).
    socket.on('player:answer', (p, ack) =>
      handle(ack, () => {
        const { auth, room } = authed();
        if (auth.kind !== 'player') throw new GameError('Só alunos respondem.');
        game.answer(room, auth.playerId, p?.text);
        io.to(tv(room.code)).emit('answered', { id: auth.playerId });
        return {};
      }));

    socket.on('disconnect', () => {
      const auth = socket.data.auth;
      if (auth?.kind !== 'player') return;
      const room = game.rooms.get(auth.code);
      // Outra aba do mesmo aluno ainda conectada? Então continua online.
      if (room && !socketsOf(room, auth.playerId).some((s) => s.id !== socket.id)) game.setOnline(room, auth.playerId, false);
    });
  });

  return { app, http, io, game };
}

if (import.meta.main) {
  const origins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim());
  const port = Number(process.env.PORT ?? 3000);
  createGameServer(origins).http.listen(port, () => console.log(`Roda do Alfabeto: servidor na porta ${port} (origens: ${origins.join(', ')})`));
}
