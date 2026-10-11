## Descrição

Adiciona **filtro por categoria** na página pública `/futebol`, permitindo que o usuário selecione uma categoria específica (Base, Adulto, Veterano, etc.) para ver apenas os jogadores vinculados a ela.

### Mudanças

**`app/(public)/futebol/page.tsx`** (Server Component)
- Remove imports não usados (`displayName`, `POSITION_LABELS`)
- Prepara dados do servidor e passa tipados para o componente cliente
- Mantém busca de atletas publicados/ativos e comissão técnica

**`app/(public)/futebol/futebol-content.tsx`** (novo — Client Component `"use client"`)
- Componente interativo com filtro `select` por categoria
- Estado `selectedCategory` com `"all"` como padrão
- Lista `availableCategories` derivada **apenas das categorias que têm jogadores** (não mostra categorias vazias)
- Filtro `useMemo` reativo — troca instantânea sem nova requisição
- Contador de jogadores exibido dinamicamente
- Reutiliza `PersonCard`, `EmptyState`, `ATHLETE_CATEGORY_LABELS`, `POSITION_LABELS`

### Comportamento

| Estado | Exibição |
|--------|----------|
| `"all"` (padrão) | Todas as categorias com jogadores, agrupadas por categoria → posição |
| Categoria específica | Apenas a categoria selecionada; se vazia, mostra `EmptyState` |

O select **só lista categorias que têm pelo menos um jogador** — categorias sem atletas não aparecem no dropdown.

### Testes
- `npm run build` ✅
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run test` ✅ (126 passam)