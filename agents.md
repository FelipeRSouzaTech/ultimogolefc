# agents.md — Instruções para agentes IA (Último Gole FC)

> **Memória persistente do projeto** — Atualize este arquivo a cada tarefa concluída.
> Próxima sessão: leia este arquivo primeiro e continue de onde parou.

---

## 📌 Contexto do projeto

- **Stack**: Next.js 15 + React 19 + TypeScript + Prisma + PostgreSQL + Tailwind
- **Arquitetura**: App Router, Server Actions, modules/ (domain-driven)
- **Deploy**: Docker + GitHub Actions → Vercel/Railway (repo **privado** em produção)
- **Repo**: https://github.com/FelipeRSouzaTech/ultimogolefc
- **Três áreas**: portal público (`app/(public)`), painel administrativo em `/admin` (`app/(admin)`) e portal financeiro em `/financeiro` (`app/(financeiro)`)
- **Documentação detalhada**: `docs/STATUS.md` (o que foi verificado e o que falta), `docs/ARQUITETURA.md` (decisões, permissões, regras), `docs/FINANCEIRO.md`, `docs/IMPLANTACAO.md`, `docs/BACKUP.md`

---

## 🔄 Fluxo de trabalho obrigatório

1. **Nunca commit direto na `main`**
2. Crie branch: `feat/...` | `fix/...` | `chore/...` — o agente Claude usa o prefixo `claude/...` (ex.: `claude/financeiro`), combinado com o usuário
3. Implemente → `git add` → `git commit` → `git push`
4. **Crie PR via `gh pr create`** (title, body, base=main, head=branch). Nas sessões em nuvem do Claude esse comando falha (GraphQL bloqueado); lá o PR é aberto pela API REST: `gh api repos/FelipeRSouzaTech/ultimogolefc/pulls --method POST --input corpo.json`
5. Usuário revisa + aprova + merge no GitHub
6. Após merge: `git checkout main && git pull origin main`
7. **Antes de começar**, atualize a `main` e veja os PRs abertos: há mais de um agente trabalhando no repositório
8. **Confira o CI do PR** (GitHub Actions: migrations, lint, typecheck, testes unitários, testes de integração e build) e corrija o que falhar antes de pedir a revisão

---

## 📝 Padrões de código

| Área | Padrão |
|------|--------|
| **Validação** | Zod em todos `actions.ts` (server-only) |
| **DB** | Prisma — zero raw SQL com input do usuário |
| **Rate limit** | `/api/*` usam `lib/rate-limit.ts` (60 req/min default, 20 para busca) |
| **Auth** | `withPermission` + `requirePagePermission` em todas actions/admin; no portal financeiro, `requireFinance` (`lib/auth/finance-guard.ts`). Permissão sempre verificada no servidor |
| **Funções (RBAC)** | 6 funções em `lib/auth/permissions.ts`: SUPERADMIN, ADMIN, EDITOR, FOOTBALL_MANAGER, TREASURER, VIEWER. Tesoureiro só usa `/financeiro` |
| **Auditoria** | Toda operação de escrita chama `audit()` (`lib/audit.ts`), de preferência dentro da mesma transação |
| **Formulários** | `ActionForm` + `Field` + Server Action que devolve `ActionState`; não usar `window.confirm`/`prompt` novos |
| **Regras puras** | Lógica de negócio em `modules/*/rules.ts` sem banco nem cookies, com teste unitário; acesso a dados em `service.ts` |
| **Cores** | Só os tokens de `app/globals.css` (`@theme`); a paleta padrão do Tailwind foi removida |
| **Migrations** | Sempre versionadas em `prisma/migrations`. Nunca reescrever uma migration que já está na `main` |
| **Financeiro** | Lançamento nunca é apagado: corrige-se por estorno (`voidedAt`). Mensalidade e folha têm telas próprias |
| **Pessoas no site** | Jogador, comissão e diretoria só aparecem no portal com `isPublished` (divulgação autorizada) |
| **Sem inventar dados** | Nada de dados institucionais, resultados, Pix ou pessoas fictícios fora do seed de demonstração |
| **Upload** | Chaves validadas por regex `^\d{4}/\d{2}/[a-f0-9]{24}\.(png|jpg|webp)$` |
| **Dinheiro** | Centavos (inteiros) — `parseMoney`, `formatMoney` |
| **Datas** | UTC no banco, America/Sao_Paulo na exibição (`lib/datetime.ts`) |
| **Labels** | pt-BR nos enums (`DIRECTOR_ROLE_LABELS`, `CATEGORY_LABELS`, etc.) |
| **Testes** | `vitest` (unit/integration) + `playwright` (e2e) |

---

## 📁 Arquivos-chave (leia estes primeiro)

| Arquivo | Descrição |
|---------|-----------|
| `prisma/schema.prisma` | Modelo de dados completo |
| `modules/finance/rules.ts` | Regras financeiras + `DIRECTOR_ROLES` (30 roles) |
| `modules/sponsors/rules.ts` | `SPONSOR_TIERS`, `groupByTier`, `isSponsorVisible` |
| `lib/rate-limit.ts` | Rate limiting APIs públicas |
| `app/(public)/page.tsx` | Home — patrocinadores agrupados por tier |
| `app/(admin)/admin/(painel)/diretores/` | CRUD diretores com select de roles |
| `lib/auth/guard.ts` | `withPermission`, `requirePagePermission` |
| `lib/auth/permissions.ts` | Funções, permissões, matriz e `homePathFor` (destino após o login) |
| `lib/auth/session.ts` / `password.ts` | Sessão em banco (cookie `ug_session`) e hash de senha com scrypt |
| `modules/competitions/standings.ts` | Cálculo da classificação e critérios de desempate (não é gravada, é calculada na leitura) |
| `modules/matches/rules.ts` / `events.ts` | Validação de partidas, lances e escalação |
| `modules/finance/service.ts` | Lançamentos, estorno, mensalidades dos diretores e folha de pagamento |
| `modules/media/rules.ts` + `lib/storage/` | Validação de imagens e armazenamento (pasta local ou S3, por `STORAGE_DRIVER`) |
| `app/(financeiro)/financeiro/(portal)/` | Telas do portal financeiro e `actions.ts` |
| `components/ui/` | `ActionForm`, `Field`, `ImageField`, `ConfirmButton`, `ActionButton`, `SmartImage` |
| `middleware.ts` | Primeira barreira de `/admin` e `/financeiro` (só confere o cookie; a validação real é no servidor) |
| `lib/validation/` | Schemas Zod por domínio |

---

## ✅ Tarefas concluídas (histórico)

### 0. Construção inicial pelo agente Claude (commits diretos na `main`, antes do fluxo de PR)

Feita em 09/10/2026, a partir da especificação do usuário. O detalhe de cada etapa está em `docs/STATUS.md`.

- **Fase 1** (`ea5e120`) — fundação: Next.js, design system com tokens, schema Prisma, login com sessão em banco, RBAC, auditoria, Docker, CI. Portal: home, jogos, resultados, competições com classificação automática, notícias. Painel: notícias, clubes, competições, temporadas, jogos, usuários.
- **Fase 2** (`4abe2ef`) — elenco, patrocinadores, institucional (configurações do site), apoio (Pix), contato com anti-spam, privacidade, sitemap e robots.
- **Fase 3** (`90bf7ba`) — upload de imagens (PNG/JPG/WebP até 5 MB, validadas pelo conteúdo), galeria, capa de notícia, banner. Armazenamento local ou S3 com assinatura SigV4 própria.
- **Fase 4** (`2536eb7`) — lances e escalação das partidas, classificação manual, página do jogador, testes de integração com banco.
- **Escudo** (`477c9e4`) — versão com fundo transparente em `public/brand/escudo.png` (448×505) e ícone em `app/icon.png`.
- **Correções**: `.gitignore` que excluía `lib/storage` (`82322ca`) e tempo limite dos testes de senha (`d824e9b`).

### 0.1. `claude/financeiro` (PR #3 merged)
- **Branch**: `claude/financeiro` → `main` (`86a8211`)
- **Mudança**: portal financeiro em `/financeiro`, separado do painel, com login (`/financeiro/login`), menu e página de conta próprios, reaproveitando contas, sessão, permissões, auditoria e componentes do painel
- **Telas**: Resumo, Lançamentos (com estorno e exportação CSV), Folha de pagamento (pagamentos aos jogadores, categoria "Jogadores", ligados a elenco, competição e partida), Mensalidades (dos **diretores**; só situação Ativo é cobrada), Patrocínios e doações, Custos por jogo
- **Painel**: cadastro de Diretores em `/admin/diretores` (nome, função, situação, foto)
- **Banco**: migration `20261010222000_financeiro` — `FinanceEntry`, `MembershipDue`, `FinanceAgreement`, `Director`, função `TREASURER`
- **Acesso**: superadministrador e tesoureiro lançam; administrador só consulta; tesoureiro não entra em `/admin`
- **Preparado, não feito**: pagamento pela plataforma (`FinanceEntry.source` e `externalReference` único)
- **Regras**: `docs/FINANCEIRO.md`

### 1. `feat/sponsors-home-grouped-by-tier` (PR #2 merged)
- **Branch**: `feat/sponsors-home-grouped-by-tier` → `main` (`9e1186e`)
- **Mudança**: Home page exibe patrocinadores agrupados por tier (MASTER → OFFICIAL → SUPPORTER → INSTITUTIONAL)
- **Arquivos**: `app/(public)/page.tsx` (importa `groupByTier` de `modules/sponsors/rules.ts`)
- **Labels**: "Patrocinador master", "Patrocinadores oficiais", "Apoiadores", "Parceiros institucionais"

### 2. `feat/directors-roles-select` (PR #4 merged)
- **Branch**: `feat/directors-roles-select` → `main` (`0b135b7`)
- **Mudança**: Campo "Função" vira `<select>` com 30 roles pré-definidos (igual padrão `CATEGORY_LABELS`)
- **Arquivos**:
  - `modules/finance/rules.ts` + `DIRECTOR_ROLES` + `DIRECTOR_ROLE_LABELS`
  - `app/(admin)/admin/(painel)/diretores/director-form.tsx` (select)
  - `app/(admin)/admin/(painel)/diretores/page.tsx` (exibe label)
  - `app/(admin)/admin/(painel)/diretores/[id]/page.tsx` (cabeçalho com label)
- **Roles**: PRESIDENT, VICE_PRESIDENT, FOOTBALL_DIRECTOR, FINANCIAL_DIRECTOR, TREASURER, ADMINISTRATIVE_DIRECTOR, HERITAGE_DIRECTOR, COMMUNICATION_DIRECTOR, MARKETING_SPONSORSHIP_DIRECTOR, EVENTS_DIRECTOR, LOGISTICS_DIRECTOR, FIELD_FOOTBALL_DIRECTOR, FOOTBALL_SUPERVISOR, TECHNICAL_COORDINATOR, SOCIAL_DIRECTOR, COUNCILOR, REFEREE_DIRECTOR, UNIFORM_EQUIPMENT_DIRECTOR, REGISTRATION_COMPETITION_DIRECTOR, FUNDRAISING_DIRECTOR, INSTITUTIONAL_RELATIONS_DIRECTOR, YOUTH_DIRECTOR, SPONSORSHIP_CAPTATION_DIRECTOR, MATCH_OPERATIONS_DIRECTOR, SECRETARY, MESARIO, SQUAD_COORDINATOR, TECHNICAL_STAFF_RESPONSIBLE, PLAYER_RELATIONS_DIRECTOR

### 3. `feat/api-rate-limiting` (PR #5 merged)
- **Branch**: `feat/api-rate-limiting` → `main` (`72a6fdb`)
- **Mudança**: Rate limiting nas APIs públicas
- **Arquivos**:
  - `lib/rate-limit.ts` (novo — `checkRateLimit`, `withRateLimit`, `rateLimitHeaders`)
  - `app/api/matches/route.ts` (60 req/min)
  - `app/api/news/route.ts` (20 req/min - busca)
  - `app/api/seasons/[id]/standings/route.ts` (60 req/min)
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` no 429

### 4. `chore/agents-md` (PR #6 merged)
- **Branch**: `chore/agents-md` → `main` (`7447cd1`)
- **Mudança**: Criação deste arquivo `agents.md` como memória persistente

### 5. `claude/agents-md` (esta branch)
- **Branch**: `claude/agents-md`
- **Mudança**: o agente Claude acrescenta ao `agents.md` o histórico da construção inicial e do financeiro, as decisões em aberto, o estado da verificação e os padrões que faltavam. Só documentação

---

## 🧪 Estado da verificação

- **CI do GitHub** roda em todo PR: migrations em banco limpo, lint, typecheck, testes unitários (Vitest), testes de integração com PostgreSQL e build. O PR #3 passou em todas as etapas.
- **O agente Claude não tem acesso ao npm no ambiente dele**: não instala dependências nem roda o site. Escreve o código, testa as regras puras por uma camada de compatibilidade e depende do CI e do usuário para o resto. Por isso as migrations dele são escritas à mão no formato do Prisma e validadas num PostgreSQL local.
- **Nunca executado por ninguém**: testes E2E (Playwright), a aplicação em Docker e o armazenamento S3 contra um serviço real.
- **Sem confirmação visual**: boa parte das telas não foi conferida no navegador, em especial as do portal financeiro e as de mídia.

## ❓ Decisões em aberto (aguardam o usuário)

- **Hospedagem**: avaliado Vercel + Supabase com custo zero. Pendências se for por aí: URL de banco com pool e outra direta para migrations, limite de upload de 4 MB (a Vercel recusa acima de 4,5 MB), imagens no Supabase Storage via S3, e o plano gratuito da Vercel não permite uso comercial (patrocínio pago e pagamento pela plataforma podem cair nisso).
- **Duas listas de diretoria**: o cadastro `Director` (interno, base das mensalidades) e a diretoria pública da página "Clube" (`StaffMember`, em Institucional) são mantidos à parte. Falta decidir se unifica.
- **Política de privacidade**: o texto em `/privacidade` descreve o que o sistema faz; precisa de revisão da diretoria.
- **Ano "1990" do escudo**: não é usado como data de fundação em nenhum texto, por não ter sido confirmado.
- **Senhas antigas no histórico**: um commit antigo incluiu senhas de banco local no `.env.example` (já revertido). São de desenvolvimento; não reutilizar.

## ✅ Tarefas concluídas (histórico)

### 6. `feat/athlete-categories` (PR #7 merged)
- **Branch**: `feat/athlete-categories` → `main` (`48b1511`)
- **Mudança**: Adiciona campo **Categoria** aos atletas (12 categorias: Base, Adulto, Veterano, Master, Super Master, Sessentão)
- **Arquivos**:
  - `prisma/schema.prisma` — enum `AthleteCategory` + campo `category` no `Athlete`
  - `modules/squad/rules.ts` — `ATHLETE_CATEGORIES`, `ATHLETE_CATEGORY_LABELS`, `ATHLETE_CATEGORY_GROUPS`, `sortCategoriesByGroup()`, `getCategoryGroup()`
  - `app/(admin)/admin/(painel)/elenco/athlete-form.tsx` — `<select>` "Categoria"
  - `app/(admin)/admin/(painel)/elenco/page.tsx` — lista agrupada: Categoria → Posição
  - `app/(public)/futebol/page.tsx` — página pública agrupada por Categoria → Posição
  - `lib/validation/site.ts` — `category` no `athleteSchema` (Zod)
  - `app/(admin)/admin/(painel)/elenco/actions.ts` — `category` no `saveAthleteAction`
- **Fix posterior** (`8a9d3e8`): `saveAthleteAction` não estava salvando a categoria — corrigido adicionando `category` no parse do form

### 7. `fix/athlete-category-save` (commit direto na main)
- **Commit**: `8a9d3e8`
- **Problema**: Apenas categoria "Principal / Adulto (livre)" era salva — as outras não
- **Causa**: `saveAthleteAction` não incluía `category` no `athleteSchema` parse
- **Solução**: Adicionado `category: field(formData, "category")` no `athleteSchema` e no `saveAthleteAction`

## 🎯 Próximas tarefas planejadas

- [ ] Aguardar próxima instrução do usuário
- [ ] Pendências conhecidas (detalhe em `docs/STATUS.md`): redimensionamento de imagens, envio de e-mail do contato, edição de acordos financeiros, relatório financeiro anual, escalação do adversário, linha do tempo e documentos do clube, integração de pagamento

---

## 🔍 Como manter contexto leve

- Peça leitura cirúrgica (`read` com `offset`/`limit`)
- Use `grep` com padrão exato
- Evite `shell` com outputs longos desnecessários
- Se contexto encher: usuário passa resumo de 3 linhas (branch, main, última tarefa, próxima)

---

## 📋 Template de "reset rápido" (para próxima sessão)

```markdown
**Contexto atual:**
- Branch atual: `main` (último commit `8a9d3e8`)
- Main está em: `8a9d3e8` (fix categoria atleta salva)
- Última tarefa: fix saveAthleteAction para salvar categoria selecionada
- Próxima tarefa: [a definir]
- Arquivos relevantes: lib/validation/site.ts, app/(admin)/admin/(painel)/elenco/actions.ts
```

---

## 📌 Notas importantes

- **Repo em produção = privado** (não gasta tokens, não afeta chat)
- **Contexto do chat ≈ 200k tokens** — use leitura seletiva
- **PRs criados via `gh pr create`** — title, body, base=main, head=branch
- **Build/test**: `npm run build`, `npm run typecheck`, `npm run lint` — todos passando
- **Tudo de uma vez**: `npm run check` (lint + tipos + testes + build). Testes com banco: `npm run test:integration`, com `TEST_DATABASE_URL` apontando para um banco exclusivo de testes
- **Primeiro administrador**: `npm run admin:create` (nenhuma senha fica no código nem no seed)
- **Lint**: aspas dentro de texto JSX quebram o build (`react/no-unescaped-entities`); use `&quot;` ou reescreva a frase
- **Um agente por branch**: não altere o branch de outro agente; se precisar do trabalho dele, espere o merge e atualize a partir da `main`