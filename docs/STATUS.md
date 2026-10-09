# Status do projeto

Atualizado em 09/10/2026.

## Aviso importante sobre verificação

O código desta entrega foi escrito em um ambiente **sem acesso ao registro npm**. Não foi possível instalar
Next.js, Prisma, Vitest, Playwright, ESLint nem as definições de tipos do React. Por isso:

| Verificação | Situação |
| --- | --- |
| `npm install` | **Não executado** |
| `prisma validate` / migrations em banco limpo | **Não executado** — a primeira migration ainda precisa ser gerada (`npm run db:migrate -- --name init`) |
| `npm run lint` | **Não executado** |
| `npm run typecheck` | **Não executado** com os tipos reais. Foi feita só uma checagem parcial (abaixo) |
| `npm run build` | **Não executado** |
| `npm run test` (Vitest) | **Não executado com o Vitest**. Os mesmos arquivos de teste rodaram por uma camada de compatibilidade (abaixo) |
| `npm run test:e2e` (Playwright) | **Não executado** |
| Docker / Docker Compose | **Não executado** |

### O que foi de fato executado

1. **Testes unitários das regras puras — 59 de 59 passaram.**
   Os arquivos em `tests/unit/` foram executados com `tsx` e o executor de testes nativo do Node,
   usando um substituto mínimo para `describe/it/expect` no lugar do Vitest, e o Zod 3.25 real.
   Cobrem: cálculo de classificação e todos os critérios de desempate, validação e correção de
   resultados de partidas, visibilidade e agendamento de notícias, hash de senhas, matriz de
   permissões, regras de gestão de usuários, datas em America/Sao_Paulo, slugs e validações de formulário.
   Um teste falhou na primeira rodada por erro no próprio dado de teste (não na regra) e foi corrigido.
2. **Checagem parcial de tipos com `tsc`** sobre todos os arquivos, com declarações substitutas (tipo `any`)
   para Next.js, React, Prisma e Lucide. Ela pega erros de sintaxe, imports quebrados, variáveis não usadas
   e erros de nulidade no código próprio — encontrou e corrigiu 1 erro real. **Não** valida o uso das APIs
   do Next.js, do React e do Prisma.

Consequência prática: espere ajustes na primeira instalação. Rode `npm run check` e traga os erros.

## Implementado nesta entrega

**Fundação**
- Configuração do projeto, design system com tokens (`app/globals.css`), Dockerfile, Docker Compose, CI.
- Schema Prisma: usuários, sessões, tentativas de login, auditoria, notícias, categorias, clubes,
  competições, temporadas, participantes, partidas e classificação manual.
- Autenticação com sessões em banco (token aleatório, só o hash é gravado), cookie `httpOnly`/`sameSite`/`secure`,
  senhas com scrypt, bloqueio após 5 falhas em 15 minutos.
- RBAC com 5 funções, verificado no servidor em toda página e toda operação. Auditoria das operações críticas.

**Portal público**
- Cabeçalho com navegação desktop e menu mobile, rodapé, página inicial (próximo jogo, últimos resultados,
  notícias, classificação), jogos com filtros, resultados, detalhes da partida, competições com classificação,
  calendário, resultados, participantes e regulamento, notícias com busca, categorias, paginação, página
  individual, relacionadas, compartilhamento e metadados SEO.
- Estados vazios em todas as listagens. Nada é simulado quando não há dados.

**Painel administrativo**
- Login, visão geral, notícias (rascunho, publicação, agendamento, arquivamento, pré-visualização, exclusão),
  categorias, clubes, competições, temporadas (pontuação, critérios de desempate, modo), participantes,
  partidas (com placar, status e histórico de alterações), usuários (criar, função, ativar/desativar,
  revogar sessões, redefinir senha), auditoria e troca da própria senha.

**API (somente leitura):** `/api/health`, `/api/matches`, `/api/news`, `/api/seasons/:id/standings`.

## Pendente

**Para fechar esta etapa (depende de instalar e executar)**
- Gerar e versionar a primeira migration e o `package-lock.json`.
- Rodar lint, tipos, testes, build e E2E de verdade e corrigir o que aparecer.
- Testes de integração com banco (persistência, transações, correção de resultado refletida na classificação).

**Fases seguintes da especificação**
- Elenco e comissão técnica; escalações e eventos de partida.
- Patrocinadores, galeria, upload de mídia com armazenamento S3 e validação do tipo real do arquivo.
- Páginas institucionais (história, diretoria), apoio ao clube (Pix), formulário de contato com anti-spam.
  Hoje esses links do menu abrem uma página "Seção em preparação".
- Configurações do site pelo painel (banner da home, rodapé, redes sociais).
- Digitação da classificação manual pelo painel (o modo existe e o portal o identifica, mas falta a tela).
- Sitemap, robots.txt, política de privacidade e procedimentos LGPD.
- React Hook Form e shadcn/ui previstos na especificação ainda não foram adotados: os formulários usam
  Server Actions com validação Zod no servidor.
- Imagem de capa das notícias (depende do módulo de mídia).

## Decisões que merecem sua confirmação

- **Escudos dos adversários:** por enquanto só aceitam caminho de imagem local; sem imagem, aparecem as iniciais.
- **Ano "1990" do escudo:** não foi usado em nenhum texto como data de fundação, por não ter sido informado.
- **Cor de erro:** além da paleta oficial há um vermelho (`#B42318`) usado só em mensagens de erro e ações destrutivas.
- **Cinza-médio `#9CA3AF`:** usado em bordas e ícones, não em textos, porque não atinge contraste AA sobre branco.
