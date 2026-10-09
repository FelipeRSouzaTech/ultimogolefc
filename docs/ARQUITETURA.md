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
| Mídia | Arquivos em pasta local ou S3; banco só com metadados; entrega por `/midia/<chave>` | Atende à regra de não gravar binários no banco e permite trocar de armazenamento por variável de ambiente. |
| Cliente S3 | Assinatura SigV4 própria (`lib/storage/sigv4.ts`), sem o SDK da AWS | Evita uma dependência grande para duas operações (PUT e DELETE); coberta pelo vetor de teste oficial da AWS. |
| Imagens enviadas | Entregues sem o otimizador do Next.js | O otimizador não foi validado com a rota `/midia`; fica como melhoria. |
| Schema | Só as entidades usadas em cada etapa | As demais (elenco, patrocinadores, galeria, mídia etc.) entram por migrations nas fases correspondentes. |

## Permissões

| Permissão | Superadmin | Admin | Editor | Gestor de futebol | Consulta |
| --- | :-: | :-: | :-: | :-: | :-: |
| Ver painel | ✔ | ✔ | ✔ | ✔ | ✔ |
| Notícias: consultar | ✔ | ✔ | ✔ | ✔ | ✔ |
| Notícias: criar/editar, publicar, excluir | ✔ | ✔ | ✔ | — | — |
| Futebol: consultar | ✔ | ✔ | ✔ | ✔ | ✔ |
| Futebol: criar/editar, excluir | ✔ | ✔ | — | ✔ | — |
| Institucional e patrocinadores: consultar | ✔ | ✔ | ✔ | ✔ | ✔ |
| Institucional e patrocinadores: alterar | ✔ | ✔ | ✔ | — | — |
| Enviar imagens | ✔ | ✔ | ✔ | ✔ | — |
| Galeria e exclusão de mídia | ✔ | ✔ | ✔ | — | — |
| Mensagens de contato | ✔ | ✔ | — | — | — |
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

**Lances e escalação** (`modules/matches/events.ts`)
- Os lances são informativos: o placar oficial é o da partida. Se a soma dos gols lançados divergir do
  placar, o painel avisa, mas não altera nada.
- Gol contra é creditado ao adversário do jogador.
- Jogadores do elenco só podem ser ligados a lances do nosso clube; para adversários, o nome é digitado.
- Escalação: até 11 titulares, sem repetição. No portal aparecem só jogadores com divulgação autorizada.

**Classificação manual** (`modules/competitions/manual.ts`)
- Uma linha por participante, posições de 1 a N sem repetição e jogos = vitórias + empates + derrotas.
- Só pode ser gravada quando a temporada está no modo manual; o portal identifica a tabela como manual.

**Notícias** (`modules/news/rules.ts`)
- Visível no portal somente se `PUBLISHED` e com data de publicação já alcançada. Data futura = agendamento.
- Publicar, agendar e arquivar exigem a permissão `news:publish`.

**Conteúdo institucional** (`modules/site/settings.ts`)
- Chaves fixas definidas no código; cada uma com tipo (texto, endereço, e-mail, caminho de imagem) e limite.
- Endereços aceitam só caminho interno ou `https://`, o que bloqueia `javascript:` e similares.
- Campo em branco não aparece no portal. Chave Pix e demais dados nunca têm valor padrão.

**Patrocinadores, elenco e diretoria**
- Patrocinador aparece se estiver ativo e dentro da vigência (`modules/sponsors/rules.ts`).
- Pessoas só aparecem com "Divulgação autorizada" marcada.

**Mídia** (`modules/media/rules.ts`)
- O tipo é identificado pelos primeiros bytes do arquivo; a extensão precisa ser coerente com ele.
- As chaves são geradas pelo sistema (`AAAA/MM/<24 hex>.<ext>`); qualquer outro formato é recusado na
  gravação e na leitura, o que impede acesso a outras pastas do servidor.
- Um arquivo só pode ser excluído se não estiver em uso (galeria, capa, escudo, foto, logotipo, configurações).
- Fotos de galeria exigem texto alternativo.

**Contato** (`modules/site/contact.ts`)
- Validação no servidor, campo-armadilha contra robôs e limite de 3 mensagens por IP por hora (40 no total).
- Nenhum e-mail é enviado; o portal informa apenas que a mensagem foi recebida.

## API

Respostas em JSON no formato `{ "data": ... }` ou `{ "error": { "message": ... } }`.

| Rota | Descrição |
| --- | --- |
| `GET /api/health` | Saúde da aplicação e do banco |
| `GET /api/matches?tipo=proximos\|resultados&competicao=&temporada=` | Partidas |
| `GET /api/news?pagina=&busca=&categoria=` | Notícias publicadas |
| `GET /api/seasons/:id/standings` | Classificação da temporada |

As operações de escrita não são expostas por HTTP público: são Server Actions autenticadas.
