# Roda do Alfabeto ao vivo

Versão online do **Jogo 19 – Roda do Alfabeto Tech** da [CentralJogos](https://github.com/FernandoBalbino/CentralJogos) para jogar com a turma toda:
a **roleta gigante gira na TV** e cada aluno responde no **Chromebook**.

- **Jogar:** https://fernandobalbino.github.io/roda-alfabeto-ao-vivo/
- **Servidor (Render free):** https://roda-alfabeto-ao-vivo.onrender.com/health

## Como funciona

1. **Professor (TV):** abre o site e clica em *Sou professor: abrir sala na TV*. Aparece o código de 4 letras.
2. **Configurações da sala:** tempo para responder cada letra (15 s a 90 s) e, em *Escolher definição e tempo de cada letra*,
   qual definição aparece em cada letra (ou sorteada), um tempo próprio por letra e quais letras ficam fora da roda.
   A configuração fica salva no navegador do professor.
3. **Alunos (Chromebook):** abrem o mesmo endereço, digitam o código e o nome. No Chromebook aparece só a **letra**, a **definição**
   e o **campo de resposta**. Depois de enviar, a resposta fica **borrada** para o colega do lado não ver.
4. **Fim do tempo (ou todos responderam):** a TV mostra *Tempo esgotado!*, digita a resposta certa e revela os alunos
   **de 3 em 3**, um card a cada 2 segundos, com a resposta aparecendo letra por letra e um **risco verde (✓)** ou **X vermelho**.
   Depois vem o placar parcial e a roleta gira para a próxima letra.
5. **Final:** pódio com o **top 10** (top 5 em destaque nos degraus) e a lista com **todos os jogadores**.

A correção aceita resposta **sem acento**, em **maiúsculas ou minúsculas**, sem hífen/espaço e com **uma letra errada**
(duas em palavras com 10 letras ou mais). Siglas curtas (CPU, GPU, USB) precisam estar certas, e digitar outro termo do banco
(ex.: *fonte* no lugar de *fone*) não conta como erro de digitação.

### Atalhos da TV
`Espaço` pausa/continua · `→` encerra o tempo (na pergunta) ou pula para o próximo trio (na revelação) · o botão *Próxima letra* pula a revelação.

## Desenvolvimento

```bash
npm install
npm run dev:server   # Socket.IO em http://localhost:3000
npm run dev:web      # telas em http://localhost:5173/roda-alfabeto-ao-vivo/
npm run check && npm test && npm run build
npm run e2e          # partida completa com prints em qa-evidence/ (servidor e Vite rodando)
```

Teste leve em produção (2 robôs, 2 letras):

```bash
E2E_URL=https://fernandobalbino.github.io/roda-alfabeto-ao-vivo/ SERVER_URL=https://roda-alfabeto-ao-vivo.onrender.com ROBOS=2 LETRAS=2 OUT=qa-evidence/producao node scripts/e2e.ts
```

## Publicação

- **Telas:** GitHub Pages pelo workflow `.github/workflows/pages.yml` (checa tipos, roda os testes e compila a cada push na `main`).
- **Servidor:** Render free (`render.yaml`), só `express` + `socket.io`, sem banco; as salas ficam em memória por até 4 horas.
  Na primeira abertura do dia o servidor pode levar até 1 minuto para acordar: abra o site na TV alguns minutos antes da aula.

O banco de 84 definições (`server/bank.ts`) fica **só no servidor**: as respostas não vão no código que o aluno baixa.
