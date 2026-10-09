# Status do projeto

Atualizado em 09/10/2026.

## Verificação

**Etapa 1 (fundação, jogos, resultados, competições, notícias, painel)** — instalada e executada na máquina
do responsável pelo projeto em 09/10/2026: `npm install`, migration inicial em banco limpo e `npm run check`
(lint, tipos, testes e build) concluídos sem erros, conforme relatado por ele. A migration e o
`package-lock.json` estão versionados.

**Etapa 2 (elenco, patrocinadores, institucional, apoio, contato, privacidade, sitemap)** — escrita em ambiente
sem acesso ao npm, portanto **ainda não instalada, compilada nem executada por completo**:

| Verificação | Situação da etapa 2 |
| --- | --- |
| Migration das novas tabelas | **Não gerada** — rode `npm run db:migrate -- --name fase2` |
| `npm run lint`, `npm run typecheck`, `npm run build` | **Não executados** |
| `npm run test` (Vitest) | **Não executado com o Vitest**; os arquivos rodaram por camada de compatibilidade (abaixo) |
| `npm run test:e2e` (Playwright) | **Não executado** (nem na etapa 1) |
| Docker / Docker Compose da aplicação | **Não executado** |

O que foi executado na etapa 2:

1. **Testes unitários — 74 de 74 passaram** (59 da etapa 1 + 15 novos), com `tsx` e o executor nativo do Node,
   usando um substituto mínimo de `describe/it/expect` e o Zod real. Os novos cobrem: validação de endereços
   (bloqueio de `javascript:` e afins), configurações do site, vigência e agrupamento de patrocinadores,
   agrupamento do elenco, validação e limite de envios do contato e as novas permissões.
2. **Checagem parcial de tipos com `tsc`**, com declarações substitutas para Next.js, React e Prisma.
   Não valida o uso das APIs dessas bibliotecas.

Depois de atualizar: `git pull`, `npm install`, `npm run db:migrate -- --name fase2`, `npm run check`.

## Implementado

**Fundação**
- Design system com tokens (`app/globals.css`), Dockerfile, Docker Compose, CI.
- Autenticação com sessões em banco, senhas com scrypt, bloqueio após 5 falhas em 15 minutos.
- RBAC com 5 funções verificado no servidor em toda página e operação. Auditoria das operações críticas.

**Portal público**
- Página inicial: banner configurável, próximo jogo, últimos resultados, notícias, classificação,
  patrocinadores e chamada de apoio.
- Jogos com filtros, resultados, detalhes da partida, competições (classificação, calendário, resultados,
  participantes, regulamento), notícias (busca, categorias, paginação, relacionadas, compartilhamento, SEO).
- Futebol (elenco por posição e comissão técnica), Clube (história, missão, associação, diretoria),
  Patrocinadores por categoria, Apoie (Pix com botão de copiar), Contato (formulário com validação,
  campo-armadilha e limite de envios), Política de privacidade, `sitemap.xml` e `robots.txt`.
- Estados vazios em todas as áreas. Nada é simulado quando não há dados.

**Painel administrativo**
- Notícias, categorias, clubes, competições, temporadas, participantes, partidas com histórico,
  elenco, patrocinadores, institucional (textos, contato, redes, Pix, banner, rodapé, diretoria e comissão),
  mensagens de contato, usuários, auditoria e troca da própria senha.

**API (somente leitura):** `/api/health`, `/api/matches`, `/api/news`, `/api/seasons/:id/standings`.

## Pendente

- **Galeria e upload de mídia** (armazenamento S3, validação do tipo real do arquivo). Enquanto isso, fotos,
  logotipos, escudos e QR Code usam caminho de imagem local, e o menu Galeria abre "Seção em preparação".
- Imagem de capa das notícias e imagem do banner da home (dependem do módulo de mídia).
- Escalações e eventos de partida; página individual de jogador; linha do tempo e documentos do clube.
- Digitação da classificação manual pelo painel (o modo existe e o portal o identifica, mas falta a tela).
- Testes de integração com banco e execução dos testes E2E.
- Envio de e-mail do formulário de contato: hoje a mensagem fica registrada no painel e o portal informa
  "mensagem recebida", sem afirmar que um e-mail foi enviado.
- React Hook Form e shadcn/ui previstos na especificação não foram adotados: os formulários usam
  Server Actions com validação Zod no servidor.
- A política de privacidade descreve o que o sistema faz; precisa de revisão da diretoria antes de valer como texto oficial.

## Decisões que merecem sua confirmação

- **Imagens:** escudos, fotos e logotipos por enquanto só aceitam caminho de imagem local; sem imagem, aparecem as iniciais ou o nome.
- **Divulgação de pessoas:** jogadores, diretoria e comissão só aparecem no portal com a caixa "Divulgação autorizada" marcada (padrão: desmarcada).
- **Mensagens de contato:** visíveis apenas para Administrador e Superadministrador, por conterem dados pessoais.
- **Ano "1990" do escudo:** não foi usado em nenhum texto como data de fundação, por não ter sido informado.
- **Cor de erro:** além da paleta oficial há um vermelho (`#B42318`) usado só em mensagens de erro e ações destrutivas.
- **Cinza-médio `#9CA3AF`:** usado em bordas e ícones, não em textos, porque não atinge contraste AA sobre branco.
