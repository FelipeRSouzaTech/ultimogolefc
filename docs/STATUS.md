# Status do projeto

Atualizado em 09/10/2026.

## Verificação

**Etapa 1 (fundação, jogos, resultados, competições, notícias, painel)** — instalada e executada na máquina
do responsável pelo projeto em 09/10/2026: `npm install`, migration inicial em banco limpo e `npm run check`
(lint, tipos, testes e build) concluídos sem erros, conforme relatado por ele. A migration e o
`package-lock.json` estão versionados.

**Etapa 2 (elenco, patrocinadores, institucional, apoio, contato, privacidade, sitemap)** — instalada e
executada pelo responsável: migration `fase2` aplicada e `npm run check` sem erros, conforme relatado por ele.

**Etapa 3 (upload de imagens, galeria, capa de notícias, banner com imagem)** — escrita em ambiente sem
acesso ao npm, portanto **ainda não instalada, compilada nem executada por completo**:

| Verificação | Situação da etapa 3 |
| --- | --- |
| Migration das novas tabelas | **Não gerada** — rode `npm run db:migrate -- --name midia` |
| `npm run lint`, `npm run typecheck`, `npm run build` | **Não executados** |
| `npm run test` (Vitest) | **Não executado com o Vitest**; os arquivos rodaram por camada de compatibilidade (abaixo) |
| Upload pelo navegador, galeria e visualização ampliada | **Não testados** |
| Driver S3 contra um serviço real | **Não testado** |
| `npm run test:e2e` (Playwright) | **Não executado** (em nenhuma etapa) |
| Docker / Docker Compose da aplicação | **Não executado** |

O que foi executado na etapa 3:

1. **Testes unitários — 86 de 86 passaram** (74 anteriores + 12 novos), com `tsx` e o executor nativo do Node,
   usando um substituto mínimo de `describe/it/expect`. Os novos cobrem: detecção do tipo real da imagem
   pelos bytes, recusa de arquivo disfarçado (script renomeado para `.png`), limite de 5 MB, formato das
   chaves de armazenamento e bloqueio de `../`, regras da galeria e a assinatura S3.
2. **Assinatura S3 (AWS Signature V4)**: o código reproduz exatamente a assinatura do exemplo oficial da
   documentação da AWS. Isso valida o cálculo; o envio a um serviço real continua não testado.
3. **Driver local de armazenamento**: gravação, leitura, remoção, recusa de sobrescrita e recusa de chave
   fora do padrão foram executadas de verdade em uma pasta temporária.
4. **Checagem parcial de tipos com `tsc`**, com declarações substitutas para Next.js, React e Prisma.

Depois de atualizar: `git pull`, `npm install`, `npm run db:migrate -- --name midia`, `npm run check`.
Em seguida, teste manualmente um upload no painel (por exemplo, a capa de uma notícia).

## Implementado

**Fundação**
- Design system com tokens (`app/globals.css`), Dockerfile, Docker Compose, CI.
- Autenticação com sessões em banco, senhas com scrypt, bloqueio após 5 falhas em 15 minutos.
- RBAC com 5 funções verificado no servidor em toda página e operação. Auditoria das operações críticas.

**Portal público**
- Galeria: álbuns por categoria e visualização ampliada com navegação por teclado.
- Página inicial: banner configurável (com imagem de fundo opcional), próximo jogo, últimos resultados, notícias, classificação,
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
  galeria (álbuns, fotos, legendas, texto alternativo, ordem, publicar/arquivar), biblioteca de mídia,
  mensagens de contato, usuários, auditoria e troca da própria senha.
- Envio de imagens direto nos formulários: capa de notícia, escudo, foto de jogador, logotipo, QR Code e banner.

**Mídia**
- PNG, JPG e WebP até 5 MB, validados por tamanho, extensão e conteúdo real. SVG não é aceito.
- Armazenamento em pasta local ou em serviço compatível com S3, escolhido por `STORAGE_DRIVER`.
  O banco guarda só os metadados.

**API (somente leitura):** `/api/health`, `/api/matches`, `/api/news`, `/api/seasons/:id/standings`.

## Pendente

- Redimensionamento e otimização das imagens enviadas: hoje elas são entregues no tamanho original.
- Envio de várias fotos de uma vez na galeria (hoje é uma por envio) e reordenação por arrastar.
- Escalações e eventos de partida; página individual de jogador; linha do tempo e documentos do clube.
- Digitação da classificação manual pelo painel (o modo existe e o portal o identifica, mas falta a tela).
- Testes de integração com banco e execução dos testes E2E.
- Envio de e-mail do formulário de contato: hoje a mensagem fica registrada no painel e o portal informa
  "mensagem recebida", sem afirmar que um e-mail foi enviado.
- React Hook Form e shadcn/ui previstos na especificação não foram adotados: os formulários usam
  Server Actions com validação Zod no servidor.
- A política de privacidade descreve o que o sistema faz; precisa de revisão da diretoria antes de valer como texto oficial.

## Decisões que merecem sua confirmação

- **Imagens públicas:** todo arquivo enviado fica acessível por endereço direto (`/midia/...`), inclusive fotos de álbuns arquivados. Não envie pelo painel nada que precise ser privado.
- **SVG recusado no upload:** pode conter scripts. Arquivos SVG estáticos do projeto (pasta `public`) continuam aceitos por caminho.
- **Divulgação de pessoas:** jogadores, diretoria e comissão só aparecem no portal com a caixa "Divulgação autorizada" marcada (padrão: desmarcada).
- **Mensagens de contato:** visíveis apenas para Administrador e Superadministrador, por conterem dados pessoais.
- **Ano "1990" do escudo:** não foi usado em nenhum texto como data de fundação, por não ter sido informado.
- **Cor de erro:** além da paleta oficial há um vermelho (`#B42318`) usado só em mensagens de erro e ações destrutivas.
- **Cinza-médio `#9CA3AF`:** usado em bordas e ícones, não em textos, porque não atinge contraste AA sobre branco.
