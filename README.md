# Último Gole FC — Portal oficial

Portal público, painel administrativo e banco de dados do Último Gole FC.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript estrito · Tailwind CSS 4 · PostgreSQL 16 · Prisma 6 · Zod · Vitest · Playwright · Docker.

> **Estado atual:** fundação, futebol (jogos, resultados, competições, classificação, elenco), notícias,
> institucional, patrocinadores, apoio e contato. Falta galeria e upload de mídia.
> O que já foi verificado e o que ainda não foi está em [`docs/STATUS.md`](docs/STATUS.md).

## Requisitos

- Node.js 20.11 ou superior (recomendado: 22)
- Docker e Docker Compose (para o PostgreSQL local)

## Primeira execução

```bash
# 1. Variáveis de ambiente
cp .env.example .env          # ajuste POSTGRES_PASSWORD e a mesma senha em DATABASE_URL

# 2. Banco de dados
docker compose up -d db

# 3. Dependências (gera também o package-lock.json — faça commit dele)
npm install

# 4. Banco: aplica as migrations existentes e gera uma nova se o schema tiver mudado
#    (quando ele pedir um nome, ou passando --name; faça commit de prisma/migrations)
npm run db:migrate

# 5. Dados de demonstração (opcional; todos fictícios e identificados como tal)
npm run db:seed

# 6. Primeiro administrador (a senha é pedida na hora; nada fica no código)
npm run admin:create

# 7. Servidor de desenvolvimento
npm run dev
```

Portal: http://localhost:3000 · Painel: http://localhost:3000/admin

### Criar o primeiro administrador

`npm run admin:create` pergunta nome, e-mail e senha (mínimo de 12 caracteres) e cria um **superadministrador**.
Também aceita variáveis, útil em servidores:

```bash
ADMIN_NAME="Nome" ADMIN_EMAIL="voce@dominio.com" ADMIN_PASSWORD="uma-senha-longa" npm run admin:create
```

Os demais usuários são criados pelo painel, em **Usuários**.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm run start` | Build e servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes de navegação (Playwright; exige `npm run build` e banco migrado) |
| `npm run check` | Lint + tipos + testes + build |
| `npm run db:migrate` | Cria/aplica migrations em desenvolvimento |
| `npm run db:deploy` | Aplica migrations em produção |
| `npm run db:seed` | Seed de demonstração |
| `npm run admin:create` | Cria um superadministrador |

Para os testes E2E, instale os navegadores uma vez: `npx playwright install chromium`.

## Estrutura

```
app/(public)     páginas públicas            app/(admin)/admin   painel administrativo
app/api          endpoints HTTP (leitura)    components/         interface (ui, layout, football, news)
lib/             auth, banco, validação      modules/            regras de negócio e serviços
prisma/          schema e seed               tests/              unit e e2e
docs/            documentação                scripts/            utilitários de instalação
```

## Documentação

- [`docs/STATUS.md`](docs/STATUS.md) — o que está pronto, o que foi verificado e o que falta
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — decisões de arquitetura, permissões e regras
- [`docs/IMPLANTACAO.md`](docs/IMPLANTACAO.md) — implantação com Docker
- [`docs/BACKUP.md`](docs/BACKUP.md) — backup e restauração do banco

## Identidade visual

As cores e demais tokens ficam em `app/globals.css` (`@theme`). Os componentes consomem os tokens; não há códigos de cor espalhados.
Azul-marinho `#0F2145` (principal), branco (fundo), preto (texto) e cinzas (`#E5E7EB`, `#9CA3AF`, `#4B5563`).
