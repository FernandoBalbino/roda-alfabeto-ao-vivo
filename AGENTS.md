# AGENTS.md — Roda do Alfabeto ao vivo

Versão em tempo real do Jogo 19 da CentralJogos. Professor na TV (notebook espelhado, 1366×768), alunos em Chromebook. Textos em português com acentos.

## Arquitetura
- `server/bank.ts`: as 84 definições (cópia de `js/alphabet-wheel-data.mjs` da CentralJogos). **Só no servidor**: a web nunca importa este arquivo; o professor recebe o banco por `teacher:bank`.
- `server/answer.ts`: correção tolerante (`normalize`, distância com troca de vizinhas, 1 erro a partir de 4 letras e 2 a partir de 10, nunca aceita outro termo exato do banco).
- `server/game.ts`: regras sem rede, relógio injetável (`Clock`). Toda regra nova ganha teste em `tests/game.test.ts` com `fakeClock`.
- `server/index.ts`: Socket.IO. Servidor autoritativo; estado completo (`state`) só em mudança de fase/entrada; resposta enviada vira evento `answered` pequeno **só para a TV** (sala `CODE:tv`).
- `shared/rules.ts`: constantes e **linha do tempo da revelação** (`revealPlan`, `markTime`). Servidor e telas calculam tudo a partir de `endsAt` + relógio do servidor, sem ticks pela rede. Recarregar a TV volta no ponto certo.

## Fluxo de uma letra
1. `question`: `endsAt = agora + SPIN_MS + segundos`. Os primeiros 2,6 s são o giro da roleta (TV e aluno mostram "girando").
2. Fecha no tempo, no botão do professor ou quando **todos os alunos conectados responderam** (`early`).
3. `reveal`: `INTRO_MS` (tempo esgotado + resposta certa digitada) → trios (`CARD_GAP_MS` entre cards, `TRIO_HOLD_MS` no fim do trio) → `OUTRO_MS` (placar parcial). Ordem = ordem de envio. "Próximo trio" (`skip`) pula para o próximo marco; "Próxima letra" (`next`) avança.
4. O aluno só vê o próprio ✓/✕ quando o card dele é marcado na TV (`markTime`); o placar do aluno some durante a revelação.

## Telas
- `Host.tsx`: sala de espera + configurações (tempo, editor de letras), pergunta com a roleta (`Wheel` em `ui.tsx`) e pódio (top 10, top 5 nos degraus, lista com todos).
- `Reveal.tsx`: revelação na TV. `Player.tsx`: aluno (resposta borrada depois de enviada, envio automático do rascunho no fim do tempo).
- `Wheel`: o anel gira só com `transform` (duas voltas por letra) e as letras giram ao contrário para ficarem em pé.

## Desempenho (Chromebook) e banda (Render free)
- Anime só `transform`/`opacity` (exceção: o anel do cronômetro). Respeite `prefers-reduced-motion`.
- Sons sintetizados com Web Audio, só na TV.

## Verificação
`npm run check && npm test && npm run build`, depois `npm run e2e` com servidor e Vite locais (gera `qa-evidence/`). Em produção, só teste leve (`ROBOS=2 LETRAS=2`).
