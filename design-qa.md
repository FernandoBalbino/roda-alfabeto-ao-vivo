# Design QA — Roda do Alfabeto ao vivo

Verificado com `npm run e2e` (Chrome, TV 1366×768, aluno em Chromebook 1366×768 e celular 412×860, 14 robôs). Prints em `qa-evidence/`.

| Tela | Print | Conferido |
| --- | --- | --- |
| Início | `00-inicio` | Código + nome; aviso de servidor acordando |
| Editor de letras | `01-tv-editor-letras` | Definição por letra, tempo por letra, letra fora da roda |
| Sala de espera (TV) | `03-tv-sala-de-espera` | Código grande, nomes, configurações, estimativa de duração |
| Sala de espera (aluno) | `02-aluno-sala-de-espera` | Dica de que acento/letra trocada valem |
| Roleta girando | `04`, `05` | Anel gira com `transform`; aluno vê "girando" |
| Letra + definição | `06`, `07`, `08` | Letra gigante no centro, cronômetro, definição em card branco; aluno só vê letra, definição e campo |
| Resposta borrada | `09` | Texto com `blur`, sem seleção |
| Quem respondeu (TV) | `10` | Contador + nomes acendendo |
| Revelação | `11`–`18` | Tempo esgotado → resposta certa digitada → cards um a cada 2 s, digitação letra a letra, ✓ verde / ✕ vermelho desenhados |
| Resultado do aluno | `12`, `19`, `20` | Suspense até o card dele; placar some na revelação |
| Placar parcial | `21` | Acertos/erros/sem resposta + top 5 |
| Pódio | `23` | Top 5 nos degraus, 6º–10º abaixo, lista com todos |
| Final do aluno | `24`, `25` | Colocação e acertos |

Checklist: sem erros no console; textos com acento; contraste alto nos cards brancos; animações só com `transform`/`opacity`; `prefers-reduced-motion` desliga animações e mostra o texto inteiro.
