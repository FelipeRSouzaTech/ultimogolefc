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
- **Documentação detalhada**: `docs/STATUS.md` (o que foi verificado e o que falta), `docs/ARQUITETURA.md` (decisões, permissões, regras), `docs/FINANCEIRO.md`, `docs/IMPLANTACAO.md`, `docs/BACKUP.md`, `docs/INSTAGRAM.md`

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
| **Regras puras** | Lógica de negócio em `modules/*/rules.ts` (no financeiro, pasta `modules/finance/rules/`) sem banco nem cookies, com teste unitário; acesso a dados em `service.ts` |
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
| `modules/finance/rules/` | Regras financeiras divididas por assunto (`catalog`, `money`, `months`, `dues`, `directors`, `payroll`, `summary`, `csv`), reexportadas por `index.ts` — importe de `@/modules/finance/rules`. `directors.ts` tem `DIRECTOR_ROLES` (30 roles) |
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

### 8. `fix/remove-diretoria-institucional` (PR #8 merged)
- **Branch**: `fix/remove-diretoria-institucional` → `main` (incluído no merge do #8/athlete-categories)
- **Mudança**: Remove seção "Diretoria" da página institucional pública `/clube` e painel "Diretoria e comissão técnica" de `/admin/institucional`
- **Arquivos**:
  - `app/(public)/clube/page.tsx` — remove query `StaffMember` (BOARD) e seção Diretoria
  - `app/(admin)/admin/(painel)/institucional/page.tsx` — remove painel completo com listagem e formulário

### 9. `feat/technical-staff` (PR #10 merged)
- **Branch**: `feat/technical-staff` → `main` (`3ed220f`)
- **Mudança**: Nova aba **Comissão Técnica** em `/admin/comissao-tecnica` com CRUD completo
- **Banco**: migration `20261011032514_technical_staff` — enum `TechnicalStaffRole` + models `TechnicalStaff` e `TechnicalStaffSeason` (N:N com Season)
- **Arquivos**:
  - `prisma/schema.prisma` — novos enum e models
  - `modules/squad/rules.ts` — `TECHNICAL_STAFF_ROLES`, `TECHNICAL_STAFF_ROLE_LABELS`
  - `lib/validation/site.ts` — `technicalStaffSchema` (Zod com arrays)
  - `app/(admin)/admin/(painel)/comissao-tecnica/actions.ts` — `saveTechnicalStaffAction`, `deleteTechnicalStaffAction`
  - `app/(admin)/admin/(painel)/comissao-tecnica/technical-staff-form.tsx` — formulário com multi-selects
  - `app/(admin)/admin/(painel)/comissao-tecnica/page.tsx` — lista + painel "Novo membro"
- **Campos**: Nome, Apelido, Função (10 opções), Competições/Temporadas (multi-select), Situação (Ativo/Inativo), Categorias (multi-select, usa `AthleteCategory`), Ordem, Divulgação autorizada

### 10. `claude/futebol-comissao-tecnica` (PR #13 merged — Claude)
- **Pedido**: comissão técnica aparecer abaixo de "Atacantes" em `/futebol`
- **Causa do problema**: a página pública lia a tabela antiga `StaffMember`, mas o painel **Comissão Técnica** (PR #10) grava em `TechnicalStaff`. A lista chegava vazia, então mudar só a posição do bloco (commits `ee1e551`…`e41af93`) não tinha efeito
- **Mudança**:
  - `app/(public)/futebol/page.tsx` — lê `prisma.technicalStaff` (`isPublished: true`, `status: ACTIVE`); `StaffMember` (TECHNICAL) só é usado enquanto o cadastro novo estiver vazio
  - `app/(public)/futebol/futebol-content.tsx` — em cada categoria, depois dos grupos de posição (logo abaixo de Atacantes), bloco "Comissão técnica" com o mesmo `<h3>`; quem não atua em nenhuma categoria com jogadores publicados aparece em um bloco no fim (só com o filtro em "Todas as categorias")
  - `modules/squad/rules.ts` — `staffForCategory`, `staffOutsideCategories` (regras puras, com testes em `tests/unit/site.test.ts`)
- **Ajuste de layout (mesmo PR)**: título de cada posição maior (`text-xl`, abaixo do título da categoria, que chega a 1,5rem) e espaço entre os grupos de posição (`space-y-10`) em `futebol-content.tsx`
- **Para aparecer**: membro com "Divulgação autorizada", situação Ativo e a categoria marcada
- **Não verificado**: tela não foi aberta em navegador (ambiente do agente não instala dependências); validação = CI do PR

### 11. `claude/campeonatos-cards` (PR #14 merged — Claude)
- **Pedido**: trocar os cartões de `/campeonatos` pelo modelo de cartão-retrato da referência (imagem enviada pelo usuário), nas cores do projeto, e permitir upload de imagem 500×600 em `/admin/campeonatos`
- **Banco**: migration `20261011230000_competition_cover` — `Competition.coverPath` (TEXT, opcional)
- **Mudança**:
  - `app/globals.css` — classe `.competition-tile` (retrato 5:6, gradiente azul-marinho só com tokens, hover e foco)
  - `app/(public)/campeonatos/page.tsx` — grade de cartões (2 colunas; 3 a partir de `lg`); o cartão inteiro é o link; com imagem ela cobre o cartão, sem imagem aparece o nome; selo "Encerrada" nos inativos. Descrição e lista de temporadas saíram do cartão (continuam na página do campeonato)
  - `app/(admin)/admin/(painel)/campeonatos/{competition-form.tsx,actions.ts}` — campo "Imagem do cartão" (`ImageField`)
  - `lib/validation/football.ts` — `imagePath` compartilhado; `competitionSchema.coverPath`
- **Decisão**: 500×600 é tamanho **recomendado** (texto de ajuda); o envio não recusa outras medidas — a imagem é recortada para preencher (`object-cover`). Não há redimensionamento no servidor
- **Não verificado**: tela não foi aberta em navegador; validação = CI do PR

### 12. `claude/equipes` (PR #15 merged — Claude)
- **Pedido**: mesmo modelo de cartão em `/equipes`; em `/admin/equipes`, editar as categorias de atletas em uma tela com upload de imagem 500×600
- **Banco**: migration `20261011233000_team_profile` — model `TeamProfile` (`category AthleteCategory @id`, `name?`, `coverPath?`)
- **Decisão**: as categorias continuam **fixas** (enum `AthleteCategory`, usado por `Athlete` e `TechnicalStaff`). "Editar" = nome de exibição + imagem do cartão. Criar/excluir categoria exigiria trocar o enum por tabela — não foi feito
- **Mudança**:
  - `modules/squad/rules.ts` — `isAthleteCategory`, `resolveCategoryLabels(profiles)` (nome do painel ou padrão)
  - `lib/validation/site.ts` — `teamProfileSchema`
  - `app/(admin)/admin/(painel)/equipes/` — `page.tsx` lista todas as categorias com miniatura e botão Editar; `[category]/page.tsx` + `team-form.tsx` + `actions.ts` (`saveTeamProfileAction`, upsert + auditoria)
  - `app/(public)/equipes/page.tsx` — cartões-retrato (`.competition-tile` + `.tile-caption` em `globals.css`), foto com faixa azul e nome; link para `/futebol?categoria=<CATEGORIA>`
  - `app/(public)/futebol/{page,futebol-content}.tsx` — usa os nomes editados e abre já filtrado por `?categoria=`
- **Pendente**: formulários do painel (Elenco, Comissão Técnica) ainda mostram os nomes padrão de `ATHLETE_CATEGORY_LABELS`
- **Não verificado**: telas não foram abertas em navegador; validação = CI do PR

### 13. `claude/folha-categorias` (PR #16 merged — Claude)
- **Pedido**: em `/financeiro/folha`, categoria selecionável — Jogadores, Comissão técnica (dropdown da comissão) e Outras despesas (tipo de serviço: Fotógrafo, Arbitragem, Transmissão, Outros + campo livre); novo texto de descrição; remover "Total por jogador no mês"
- **Banco**: migration `20261012001500_folha_categorias` — `FinanceCategory.STAFF_PAYMENT`; `FinanceEntry.technicalStaffId` (FK `TechnicalStaff`, Restrict) e `FinanceEntry.payrollService` (texto)
- **Mudança**:
  - `modules/finance/rules.ts` — `PAYROLL_CATEGORIES`, `PAYROLL_SERVICES`/labels, `isPayrollOnlyCategory`, `payrollServiceName`, `payrollRecipientName`; removido `totalsByAthlete`
  - `lib/validation/finance.ts` — `payrollSchema` com `category` e campo obrigatório conforme a categoria
  - `modules/finance/service.ts` — `createEntry` aceita `technicalStaffId`/`payrollService`; `listEntries({ payroll: true })`
  - `app/(financeiro)/financeiro/(portal)/` — `actions.ts` (`createPayrollAction`), `folha/{page,payroll-form}.tsx`, `lancamentos/{page,entry-form}.tsx`, `exportar/route.ts` (colunas Comissão técnica e Tipo de serviço)
  - `app/(admin)/admin/(painel)/comissao-tecnica/actions.ts` — não exclui membro com pagamentos (orienta inativar)
- **Decisão**: em "Outras despesas", todos os tipos (inclusive Arbitragem) entram na categoria `OTHER_EXPENSE`, como pedido; a categoria `REFEREE` de Lançamentos continua existindo à parte. A folha lista `PLAYER_PAYMENT`, `STAFF_PAYMENT` e as `OTHER_EXPENSE` com `payrollService` preenchido
- **Não verificado**: tela não foi aberta em navegador; validação = CI do PR

### 14. `claude/mensalidades-form` (PR #17 merged — Claude)
- **Pedido**: mudar a inclusão de mensalidades em `/financeiro/mensalidades` — formulário de inclusão, manter a navegação por mês, resumo do mês, usando os diretores de `/admin/diretores`
- **Sem migration** (usa `MembershipDue` como está: uma por diretor e mês)
- **Mudança**:
  - `modules/finance/service.ts` — `createDue` (em aberto ou já paga, na mesma transação), `removeDue` (só não paga); `payDue` reaproveitado via `payDueIn(tx, …)`
  - `modules/finance/rules.ts` — `summarizeDues`, `DUE_ENTRY_MODES`/labels
  - `lib/validation/finance.ts` — `dueCreateSchema`; removido `dueSettingsSchema`
  - `app/(financeiro)/financeiro/(portal)/actions.ts` — `createDueAction(month)`, `removeDueAction`; removidos `generateDuesAction` e `saveDueSettingsAction`
  - `app/(financeiro)/financeiro/(portal)/mensalidades/{page,due-form}.tsx` — painéis "Resumo de <mês>" e "Nova mensalidade"; saíram "Gerar cobranças" e "Valor e vencimento"
- **Ajuste (`claude/mensalidades-ajuste`)**: o formulário "Nova mensalidade" passa a aparecer sempre; diretor que já tem mensalidade no mês fica desabilitado no dropdown (antes o formulário sumia quando todos já tinham, p. ex. após o antigo "Gerar cobranças")
- **Atenção**: `generateDues`, `getDueSettings` e `saveDueSettings` continuam em `service.ts` (cobertos por testes de integração), mas **sem tela**; remover ou reaproveitar se a geração em lote voltar
- **Não verificado**: tela não foi aberta em navegador; validação = CI do PR

### 15. `claude/toasts` (PR #19 merged — Claude)
- **Pedido**: todos os alertas como notificação moderna tipo "toast" no canto da tela (referência com sucesso, erro, atenção e informação)
- **Como usar**: `import { toast } from "@/lib/toast"` → `toast("success" | "error" | "warning" | "info", mensagem)` em componente cliente; em página de servidor, `<FlashToast kind message />` (`components/ui/toaster.tsx`). **Não criar novos `<p className="alert …">` para resultado de ação**
- **Mudança**:
  - `lib/toast.ts` — fila pura (`toast`, `subscribeToasts`, `pushToast`, `toastDuration`); testes em `tests/unit/toast.test.ts`
  - `components/ui/toaster.tsx` — `<Toaster />` (montado em `app/layout.tsx`) e `<FlashToast />`
  - `components/ui/{action-form,action-button,confirm-button,image-field}.tsx` e `components/news/share-link.tsx` — resultado de ação vira toast; erros por campo (`FieldError`) continuam ao lado do campo
  - `app/globals.css` — tokens `--color-success` e `--color-warning` (só para notificações) e classes `.toast*`
  - `app/(admin)/admin/(painel)/page.tsx` — "acesso negado" vira toast
- **Mantidos como aviso fixo na página** (estado permanente, não resultado de ação): `ReadOnlyNotice`, conta sem acesso no login do financeiro, aviso de escalação em jogos, filtro ativo em Lançamentos, "esta é a sua conta" em usuários.
- **Não verificado**: não foi aberto em navegador; validação = CI do PR

### 16. `claude/modal-exclusao` (PR #20 merged — Claude)
- **Pedido**: modal para o botão Excluir e alerta (toast) na exclusão, no projeto todo
- **Mudança**:
  - `components/ui/confirm-button.tsx` — troca o `window.confirm` por um modal (`<dialog>` nativo com `showModal()`): título, pergunta, Cancelar (foco inicial) e botão vermelho; Esc e clique fora fecham. Toda exclusão/remoção passa a mostrar toast de sucesso (mensagem da ação, `successMessage` ou o padrão de `confirmTexts`)
  - `lib/confirm.ts` — `confirmTexts(label)` (título e aviso padrão); testes em `tests/unit/toast.test.ts`
  - `app/globals.css` — `.modal*` e `.btn-danger-solid`
- **Alcance**: todos os usos de `<ConfirmButton>` (clubes, campeonatos, temporadas, jogos e lances, elenco, comissão técnica, diretores, patrocinadores, notícias e categorias, galeria e fotos, mídia, mensagens, mensalidades, revogar sessões). **Não usar `window.confirm` em telas novas**
- **Não verificado**: não foi aberto em navegador; validação = CI do PR

### 17. `claude/responsivo` (PR #21 merged — Claude)
- **Pedido**: melhorar a responsividade; componentes distorcendo no celular (Poco X7 Pro, ~393 px de largura)
- **Como foi avaliado**: as páginas foram renderizadas fora do Next (React SSR com banco falso e Tailwind compilado localmente) e fotografadas no Chromium em 320, 360, 393, 412, 768 e 1280 px, com detecção automática de rolagem lateral. Não é o app rodando de verdade (sem banco real nem interação)
- **Causas encontradas e correções**:
  - Itens de grade não encolhiam (tabela/texto longo alargava a página) → `.grid > * { min-width: 0 }` e `.card { min-width: 0 }` em `globals.css`
  - Legenda `sr-only` de tabela escapava da área com rolagem → `.table { position: relative }`; tabela do Resumo do financeiro e a classificação ganharam `overflow-x-auto`
  - Menu do painel/financeiro no celular era faixa rolável com grupo aberto no meio → `components/layout/admin-nav.tsx`: botão "Menu · página atual" que abre a lista em coluna (desktop igual)
  - `MonthNav` cabe em uma linha no celular (só setas); títulos (`PageTitle`, `AdminHeading`) menores no celular
  - Classificação no celular: Pos, Time, Pts, J, SG (V/E/D a partir de `sm`, GP/GC a partir de `md`)
  - `/futebol`: 2 cartões por linha no celular (`PersonCard` mais compacto); removida `}` sobrando no texto "no total"
  - Tabelas largas do painel (`.table-wide`, min 40rem) rolam de lado dentro do cartão em vez de espremer
  - Formulários do financeiro na coluna lateral ficam em 1 coluna em `xl` (2 colunas em `2xl`)
  - Card de jogo: espaço antes da vírgula na data
- **Não verificado**: interação real no aparelho (abrir menus, teclado virtual); validação = CI do PR + teste do usuário no celular

### 18. `claude/home-countdown` (PR #22 merged — Claude)
- **Pedido**: na home, contagem regressiva do jogo mais próximo (cores do projeto) e "Próximos jogos" com os 4 próximos, etiqueta com a categoria (ex.: Principal / Adulto) no lugar de "Masculino"; "Ver todos" continua em `/jogos`
- **Banco**: migration `20261012220000_match_category` — `Match.category AthleteCategory @default(ADULT)` (partidas antigas ficam como Principal / Adulto)
- **Mudança**:
  - `modules/matches/rules.ts` — `countdownParts(alvo, agora)` (testes em `tests/unit/matches.test.ts`)
  - `modules/matches/service.ts` — `nextMatches(clubId | null, 4)` (substitui `nextOwnMatch`); `saveMatch` grava `category` e a auditoria inclui o campo
  - `components/football/match-countdown.tsx` (cliente, atualiza a cada segundo; mostra "--" até montar) e `components/football/upcoming-match.tsx` (`CountdownBar`, `UpcomingMatchCard`)
  - `app/(public)/page.tsx` — faixa da contagem acima do banner; seção "Próximos jogos" (4 cartões; no celular deslizam de lado)
  - Painel de jogos: campo **Categoria** no formulário (`match-form.tsx`, `actions.ts`, `jogos/data.ts` → `loadCategoryLabels` com os nomes editados em Equipes)
- **Não verificado**: contagem rodando no navegador (a renderização local não executa o JavaScript do cliente); validação = CI do PR

### 19. `claude/instagram` (PR aberto — Claude) — etapa 1 da integração com o Instagram
- **Pedido**: publicar no feed e nos stories do Instagram pelo painel, com agendador; mockups aprovados (nova publicação, agenda semanal, artes automáticas). O usuário testa com a **própria conta** e só depois liga a do clube
- **Banco**: migration `20261016220000_instagram` — enums `InstagramFormat`, `InstagramPostStatus`, `InstagramPostOrigin` e model `InstagramPost` (validada aplicando todas as migrations num PostgreSQL 16 local)
- **Permissão nova**: `instagram:publish` (superadministrador, administrador, editor). Ver a agenda usa `content:read`
- **Mudança**:
  - `modules/instagram/rules.ts` (puro, testado) e `modules/instagram/service.ts` (`publishPost` com reserva condicional anti-duplicidade, `runDuePosts`, `listWeek`, `listQueue`)
  - `lib/instagram/client.ts` — conta lida de `INSTAGRAM_*` (trocar de conta = trocar variáveis); token no corpo/cabeçalho, nunca na URL
  - `app/api/cron/instagram/route.ts` — agendador, exige `Authorization: Bearer <CRON_SECRET>`; precisa de chamada externa a cada 5 min (cron-job.org ou Supabase pg_cron; Vercel Cron gratuito roda 1×/dia)
  - `app/(admin)/admin/(painel)/instagram/` — agenda semanal + fila, nova publicação com prévia, detalhe/edição; item "Instagram" no menu
  - `components/ui/image-field.tsx` ganhou `onChange` opcional; `components/ui/action-form.tsx` segue `redirectTo` também quando a action devolve erro (publicação salva que o Instagram recusou)
  - `lib/storage` expõe `s3PublicBase()`; `vitest.config.ts` usa o stub de `server-only` (para testar o cliente com `fetch` falso)
- **Regras do Instagram**: só JPEG; imagem com endereço público HTTPS (localhost não funciona — ver `docs/INSTAGRAM.md`); story sem legenda; legenda até 2.200 caracteres e 30 hashtags
- **Fora desta etapa**: automações e geração das artes (etapa 2), renovação automática do token e troca para a conta do clube (etapa 3). Plano em `docs/INSTAGRAM.md`
- **Verificação**: testes unitários rodados localmente por camada de compatibilidade (Bun + zod local): 166 passando, 21 novos. Lint, typecheck, build e telas **não** verificados no ambiente do agente (npm bloqueado); validação = CI do PR. Nenhuma chamada real à API do Instagram foi feita

## 🎯 Próximas tarefas planejadas

- [ ] Instagram etapa 2: automações e geração das artes (ver `docs/INSTAGRAM.md`)
- [ ] Instagram: usuário configurar a conta de teste (`INSTAGRAM_*`), o `CRON_SECRET` e o serviço que chama o agendador
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
- Branch atual: `main` (último commit `3ed220f`)
- Main está em: `3ed220f` (PR #10 feat/technical-staff merged)
- Última tarefa: cria aba Comissão Técnica (/admin/comissao-tecnica) com cadastro completo
- Próxima tarefa: [a definir]
- Arquivos relevantes: prisma/schema.prisma, modules/squad/rules.ts, app/(admin)/admin/(painel)/comissao-tecnica/
```

---

## 📌 Notas importantes

- **Repo em produção = privado** (não gasta tokens, não afeta chat)
- **Contexto do chat ≈ 200k tokens** — use leitura seletiva
- **PRs criados via `gh pr create`** — title, body, base=main, head=branch
- **Build/test**: `npm run build`, `npm run typecheck`, `npm run lint` — todos passando
- **Tudo de uma vez**: `npm run check` (lint + tipos + testes + build). Testes com banco: `npm run test:integration`, com `TEST_DATABASE_URL` apontando para um banco exclusivo de testes
- **Primeiro administrador**: `npm run admin:create` (nenhuma senha fica no código nem no seed)
- **Depois de merge com migration** (`prisma/migrations/` mudou): rodar `npm run db:migrate` e reiniciar o `npm run dev`; sem isso as telas que leem a tabela alterada quebram (ex.: financeiro após o PR #16)
- **Lint**: aspas dentro de texto JSX quebram o build (`react/no-unescaped-entities`); use `&quot;` ou reescreva a frase
- **Um agente por branch**: não altere o branch de outro agente; se precisar do trabalho dele, espere o merge e atualize a partir da `main`