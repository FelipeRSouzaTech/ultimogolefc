# Arquitetura

## Visão geral

Aplicação única em Next.js (App Router). As páginas são Server Components que leem o PostgreSQL via Prisma;
as alterações passam por Server Actions. Três camadas, separadas por pasta:

- **Apresentação** — `app/` e `components/`. Sem regra de negócio.
- **Regras de negócio** — `modules/`. Os arquivos `rules.ts` e `standings.ts` são funções puras (sem banco,
  sem cookies), o que permite testá-las isoladamente. Os arquivos `service.ts` combinam regras e persistência.
- **Infraestrutura** — `lib/` (banco, autenticação, auditoria, validação, datas).

## Decisões

| Tema | Decisão | Motivo |
| --- | --- | --- |
| Autenticação | Sessões próprias em banco, em vez de Auth.js | A especificação exige revogar sessões e desativar contas com efeito imediato; sessão em banco resolve isso sem depender de versão beta de biblioteca. O token é aleatório (256 bits) e só o hash SHA-256 é gravado. |
| Senhas | scrypt do Node (`N=2^16, r=8, p=2`), sal aleatório, parâmetros gravados com o hash | Sem dependência nativa extra; parâmetros recomendados pela OWASP; permite aumentar o custo depois. |
| Funções | `enum Role` fixo, com matriz de permissões em `lib/auth/permissions.ts` | As cinco funções são fixas na especificação; uma tabela de permissões editável traria complexidade sem uso. |
| Classificação | Calculada na leitura, nunca gravada (modo automático) | Evita dado derivado inconsistente: corrigir um resultado altera a tabela imediatamente, sem recálculo nem corrida entre operações. |
| Conteúdo de notícias | Texto puro com parágrafos e subtítulos (`## `) | Nenhum HTML é interpretado, o que elimina XSS no conteúdo editorial sem depender de sanitizador. |
| Datas | `timestamptz` em UTC; conversão para America/Sao_Paulo só na exibição e na leitura de formulários | Requisito da especificação; `lib/datetime.ts` concentra a conversão. |
| Renderização | Páginas públicas dinâmicas (`force-dynamic`) | O conteúdo muda pelo painel e o build não precisa de banco. Cache pode ser adicionado depois, onde for seguro. |
| Estilo | Tailwind CSS 4 com tokens em `@theme`; paleta padrão removida | Só existem as cores institucionais; impossível usar uma cor fora da paleta por engano. |
| Fontes | Fontes do sistema | Evita download externo no build e no navegador. |
| Schema | Só as entidades usadas nesta etapa | As demais (elenco, patrocinadores, galeria, mídia etc.) entram por migrations nas fases correspondentes. |

## Permissões

| Permissão | Superadmin | Admin | Editor | Gestor de futebol | Consulta |
| --- | :-: | :-: | :-: | :-: | :-: |
| Ver painel | ✔ | ✔ | ✔ | ✔ | ✔ |
| Notícias: consultar | ✔ | ✔ | ✔ | ✔ | ✔ |
| Notícias: criar/editar, publicar, excluir | ✔ | ✔ | ✔ | — | — |
| Futebol: consultar | ✔ | ✔ | ✔ | ✔ | ✔ |
| Futebol: criar/editar, excluir | ✔ | ✔ | — | ✔ | — |
| Auditoria | ✔ | ✔ | — | — | — |
| Usuários | ✔ | — | — | — | — |

Onde é verificado:

1. `middleware.ts` — sem cookie de sessão, `/admin/*` redireciona para o login (primeira barreira apenas).
2. `app/(admin)/admin/(painel)/layout.tsx` — valida a sessão no banco em toda página do painel.
3. `requirePagePermission()` — em cada página.
4. `withPermission()` — em **cada Server Action**, antes de qualquer alteração. Esconder botões na interface é só conveniência.

Regras de usuários (`modules/users/rules.ts`): ninguém altera a própria função nem desativa a própria conta;
o último superadministrador ativo não pode ser rebaixado nem desativado (verificado dentro de transação).

## Regras de negócio principais

**Classificação** (`modules/competitions/standings.ts`)
- Contam apenas partidas `FINISHED` com placar completo. Agendadas, em andamento, adiadas, canceladas e sem placar são ignoradas.
- Pontos por vitória, empate e derrota configuráveis por temporada.
- Ordenação: pontos e depois os critérios de desempate na ordem configurada (vitórias, saldo, gols pró,
  menos gols sofridos, confronto direto). Persistindo o empate, ordem alfabética.
- Confronto direto: mini-tabela só com os jogos entre as equipes empatadas (pontos, saldo, gols pró).

**Partidas** (`modules/matches/rules.ts`)
- Mandante e visitante diferentes e participantes da temporada.
- Encerrar exige placar completo e data não futura. Nada é encerrado automaticamente.
- Placar é descartado em partidas agendadas, adiadas ou canceladas.
- Toda alteração grava antes/depois na auditoria, exibida como histórico na tela da partida.

**Notícias** (`modules/news/rules.ts`)
- Visível no portal somente se `PUBLISHED` e com data de publicação já alcançada. Data futura = agendamento.
- Publicar, agendar e arquivar exigem a permissão `news:publish`.

## API

Respostas em JSON no formato `{ "data": ... }` ou `{ "error": { "message": ... } }`.

| Rota | Descrição |
| --- | --- |
| `GET /api/health` | Saúde da aplicação e do banco |
| `GET /api/matches?tipo=proximos\|resultados&competicao=&temporada=` | Partidas |
| `GET /api/news?pagina=&busca=&categoria=` | Notícias publicadas |
| `GET /api/seasons/:id/standings` | Classificação da temporada |

As operações de escrita não são expostas por HTTP público: são Server Actions autenticadas.
