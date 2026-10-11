## Descrição

Cria nova aba **Comissão Técnica** em `/admin/comissao-tecnica` com formulário completo de cadastro.

### Mudanças

**`prisma/schema.prisma`**
- Novo enum `TechnicalStaffRole` (10 funções)
- Novo model `TechnicalStaff` com: nome, apelido, função, situação (Ativo/Inativo), categorias (array multi-seleção), ordem, divulgação autorizada
- Novo model `TechnicalStaffSeason` (N:N com `Season`) para vincular às competições/temporadas
- Relacionamento adicionado em `Season.technicalStaff`

**`modules/squad/rules.ts`**
- `TECHNICAL_STAFF_ROLES` + `TECHNICAL_STAFF_ROLE_LABELS` (pt-BR)

**`lib/validation/site.ts`**
- `technicalStaffSchema` (Zod) com validação de arrays para `seasonIds` e `categories`

**`app/(admin)/admin/(painel)/comissao-tecnica/`** (novos arquivos)
- `actions.ts` — `saveTechnicalStaffAction`, `deleteTechnicalStaffAction` (com auditoria)
- `technical-staff-form.tsx` — Formulário com selects múltiplos para competições e categorias
- `page.tsx` — Lista + painel de cadastro

### Campos do formulário

| Campo | Tipo | Detalhes |
|-------|------|----------|
| **Nome** | text | Obrigatório, máx. 120 chars |
| **Apelido** | text | Opcional, máx. 60 chars |
| **Função** | select | Técnico, Aux. Técnico, Preparador Físico, Treineiro de Goleiros, Fisioterapeuta, Médico, Nutricionista, Psicólogo, Analista de Desempenho, Outro |
| **Competições/Temporadas** | multi-select | Obrigatório — lista temporadas atuais (`Season.isCurrent = true`) com nome da competição |
| **Situação** | select | Ativo / Inativo |
| **Categorias** | multi-select | Obrigatório — usa `AthleteCategory` (Base U7–U20, Adulto, Veterano, Master, Super Master, Sessentão) |
| **Ordem** | number | Para ordenação na listagem |
| **Divulgação autorizada** | checkbox | Para publicação no portal |

### Testes
- `npm run build` ✅
- `npm run typecheck` ✅
- `npm run lint` ✅
- Migration aplicada: `20261011032514_technical_staff`