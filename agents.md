# agents.md — Instruções para agentes IA (Último Gole FC)

> **Memória persistente do projeto** — Atualize este arquivo a cada tarefa concluída.
> Próxima sessão: leia este arquivo primeiro e continue de onde parou.

---

## 📌 Contexto do projeto

- **Stack**: Next.js 15 + React 19 + TypeScript + Prisma + PostgreSQL + Tailwind
- **Arquitetura**: App Router, Server Actions, modules/ (domain-driven)
- **Deploy**: Docker + GitHub Actions → Vercel/Railway (repo **privado** em produção)
- **Repo**: https://github.com/FelipeRSouzaTech/ultimogolefc

---

## 🔄 Fluxo de trabalho obrigatório

1. **Nunca commit direto na `main`**
2. Crie branch: `feat/...` | `fix/...` | `chore/...`
3. Implemente → `git add` → `git commit` → `git push`
4. Passe **link compare/PR**: `https://github.com/FelipeRSouzaTech/ultimogolefc/pull/new/<branch>`
5. **Não** crie PR via CLI — usuário cria + aprova + merge no GitHub
6. Após merge: `git checkout main && git pull origin main`

---

## 📝 Padrões de código

| Área | Padrão |
|------|--------|
| **Validação** | Zod em todos `actions.ts` (server-only) |
| **DB** | Prisma — zero raw SQL com input do usuário |
| **Rate limit** | `/api/*` usam `lib/rate-limit.ts` (60 req/min default, 20 para busca) |
| **Auth** | `withPermission` + `requirePagePermission` em todas actions/admin |
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
| `lib/validation/` | Schemas Zod por domínio |

---

## ✅ Tarefas concluídas (histórico)

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

### 4. `chore/agents-md` (esta branch — **em andamento**)
- **Branch**: `chore/agents-md`
- **Mudança**: Criação deste arquivo `agents.md` como memória persistente

---

## 🎯 Próximas tarefas planejadas

- [ ] Aguardar próxima instrução do usuário

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
- Branch atual: `chore/agents-md` (ou main se já merged)
- Main está em: `72a6fdb` (PR #5 merged)
- Última tarefa: Criação do agents.md
- Próxima tarefa: [a definir]
- Arquivos relevantes: agents.md
```

---

## 📌 Notas importantes

- **Repo em produção = privado** (não gasta tokens, não afeta chat)
- **Contexto do chat ≈ 200k tokens** — use leitura seletiva
- **PRs sempre via link compare** — não uso `gh pr create`
- **Build/test**: `npm run build`, `npm run typecheck`, `npm run lint` — todos passando