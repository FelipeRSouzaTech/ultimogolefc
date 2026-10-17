# Instagram — publicação no feed e nos stories

Integração do painel com a API oficial do Instagram (Graph API), para publicar e agendar postagens do clube.
Mockups aprovados pelo usuário em 16/10/2026: tela de nova publicação, agenda semanal com fila e artes automáticas.

## Etapas

| Etapa | O que entra | Situação |
|-------|-------------|----------|
| **1** | Modelo `InstagramPost`, publicação manual (agora ou agendada) no feed e no story, agenda semanal, fila, agendador por rota protegida, histórico e auditoria | Este PR |
| **2** | Automações (resultado do jogo, chamada 24 h antes, escalação, notícia publicada) e geração das artes no servidor (JPEG 1080 × 1350 e 1080 × 1920) a partir dos dados do jogo | Feita (ver abaixo) |
| **3** | Troca da conta de teste pela conta do clube, revisão do app pela Meta (se necessária) e publicação em produção | Planejada |

## Conta de teste x conta do clube

O usuário vai testar tudo com a **própria conta** e só depois ligar a conta do time, sem publicar testes no perfil do clube.
Por isso a conta **não fica no banco nem no código**: vem das variáveis de ambiente.

| Variável | Para que serve |
|----------|----------------|
| `INSTAGRAM_USER_ID` | Id da conta profissional do Instagram que publica |
| `INSTAGRAM_ACCESS_TOKEN` | Token de acesso de longa duração (≈ 60 dias). **Segredo**: nunca no Git, no chat ou no front-end |
| `INSTAGRAM_ACCOUNT_LABEL` | Nome mostrado no painel e gravado em cada publicação (ex.: `@minha.conta.teste`) |
| `INSTAGRAM_API_HOST` | `graph.instagram.com` (padrão, login do Instagram) ou `graph.facebook.com` (login do Facebook) |
| `INSTAGRAM_API_VERSION` | Versão da Graph API (padrão `v25.0`) |
| `CRON_SECRET` | Segredo do agendador (mínimo 16, recomendado 32+ caracteres aleatórios) |

Trocar de conta = trocar `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_ACCOUNT_LABEL` e reiniciar. Cada publicação guarda
em `accountLabel` a conta em que saiu, então o histórico separa o que foi teste do que foi do clube.

Sem `INSTAGRAM_USER_ID` e `INSTAGRAM_ACCESS_TOKEN` o painel funciona (rascunhos e agendamentos), mostra um aviso e não publica nada.

## Como obter o token (conta de teste)

Há dois caminhos na Meta. O **login do Instagram** é o mais simples e **não exige Página do Facebook**:

1. A conta do Instagram precisa ser **profissional** (Criador ou Empresa): Configurações → Tipo de conta e ferramentas.
2. Em developers.facebook.com, crie um app e adicione o produto **Instagram** → "API com login do Instagram".
3. Em "Gerar tokens de acesso", adicione a conta do Instagram (ela vira testadora do app em modo de desenvolvimento) e gere o token
   com as permissões `instagram_business_basic` e `instagram_business_content_publish`.
4. Anote o **id da conta** (aparece junto do token) → `INSTAGRAM_USER_ID`; o token → `INSTAGRAM_ACCESS_TOKEN`.

O caminho pelo **login do Facebook** (`INSTAGRAM_API_HOST=graph.facebook.com`) exige a conta vinculada a uma Página do Facebook e as
permissões `instagram_basic`, `instagram_content_publish` e `pages_read_engagement`. Só vale a pena se o clube já usar a Página.

Enquanto o app estiver em **modo de desenvolvimento**, ele só publica em contas cadastradas como testadoras. Para a conta do clube basta
cadastrá-la também; a revisão do app pela Meta só é necessária para publicar em contas de terceiros.

O token expira em cerca de 60 dias. Quando expirar, as publicações falham com a mensagem "O token da conta do Instagram é inválido
ou expirou" e o painel mostra o aviso na agenda. A renovação automática do token fica para a etapa 3.

## Como funciona a publicação

```
painel (Publicar agora)  ─┐
                          ├─► publishPost(id)
agendador (a cada 5 min) ─┘      1. reserva a postagem (PUBLISHING + lockedAt) numa atualização condicional
                                 2. POST /{ig-user-id}/media           → contêiner (story: media_type=STORIES)
                                 3. GET  /{container-id}?fields=status_code até FINISHED (até 6 × 2 s)
                                 4. POST /{ig-user-id}/media_publish   → id da mídia
                                 5. GET  /{media-id}?fields=permalink
                                 6. grava PUBLISHED + auditoria
```

- **Sem duplicidade**: a reserva é uma única atualização condicional (`updateMany` com o estado esperado). Dois disparos do agendador,
  ou o agendador e o botão "Publicar agora", nunca publicam a mesma postagem duas vezes. Uma postagem presa em "Publicando" por mais
  de 10 minutos (servidor caiu no meio) volta a ser pega.
- **Falhas**: erros temporários (rede, limite de chamadas, instabilidade) são repetidos no próximo disparo, até 3 tentativas. Erros
  permanentes (token, permissão, imagem inválida) marcam "Falhou" na hora, com a mensagem em português em `lastError`.
- **Token**: vai no corpo do POST ou no cabeçalho `Authorization`, nunca na URL.

### Regras do Instagram que o painel já confere

- **Só JPEG.** O formulário e o servidor recusam PNG e WebP para o Instagram.
- **Imagem com endereço público HTTPS.** O Instagram baixa a imagem do nosso servidor. Com `STORAGE_DRIVER=s3` usa `S3_PUBLIC_URL`;
  senão, `NEXT_PUBLIC_SITE_URL` + `/midia/...`. Endereços `http://` e `localhost` são recusados com aviso.
- **Story não leva legenda** pela API: o campo some no formulário e o servidor recusa legenda em story.
- **Marcar pessoas (@) em story**: campo "Marcar pessoas" no formulário (até 20, separados por espaço ou vírgula), enviado como
  `user_tags` só com o nome de usuário (em story a posição é opcional; recurso da API desde jul/2025). Só contas **públicas**
  podem ser marcadas; um @ inexistente ou privado faz o Instagram recusar e a mensagem dele aparece na falha. No feed a marcação
  exigiria a posição de cada pessoa na foto e não foi feita. Automações não marcam ninguém.
- **A menção da API fica escondida**: não vira o adesivo "@fulano" do aplicativo. Por isso, com a opção "Escrever os @ na imagem"
  (ligada por padrão), ao salvar o portal gera uma cópia da foto em 9:16 com os @ em etiquetas brancas na parte de baixo
  (`renderStoryMentions` em `lib/instagram/art.ts`) e guarda em `InstagramPost.publishImagePath`; é essa cópia que vai ao
  Instagram. A foto original continua em `imagePath`. A notificação "mencionou você" chega no **Direct** de quem foi marcado
  (em Solicitações, se a pessoa não segue a conta). Testado em 17/10/2026: a API recusa @ inexistente ou privado (código 110/2207018).
- **Legenda**: até 2.200 caracteres e 30 hashtags.
- **Limite**: 100 publicações por 24 h por conta (de sobra para o clube).
- **Proporção**: feed entre 4:5 e 1,91:1; story 9:16. O formulário lê as dimensões da imagem e avisa antes de salvar: no feed, fora
  da faixa, mostra erro (o Instagram recusa); no story, só um aviso (o Instagram corta ou põe bordas). O servidor não mede a imagem.
- **Diagnóstico**: toda falha mostra a nossa explicação **e** o texto original do Instagram com os códigos (ex.: `código 9004/2207052`),
  porque o Instagram usa o mesmo código para problemas diferentes. Em erro de processamento, o motivo vem do campo `status` do contêiner.

### Testar no computador (desenvolvimento local)

O Instagram precisa baixar a imagem, e ele não alcança `localhost`. Duas saídas:

1. **Armazenamento S3 com endereço público** (recomendado, é o que vai para produção): Supabase Storage ou Cloudflare R2 com
   `STORAGE_DRIVER=s3` e `S3_PUBLIC_URL`. As imagens enviadas no painel já ficam públicas.
2. **Túnel** (`cloudflared tunnel --url http://localhost:3000` ou ngrok) e `NEXT_PUBLIC_SITE_URL` apontando para o endereço do túnel.

## Agendador

Rota: `GET` ou `POST /api/cron/instagram`, com o cabeçalho `Authorization: Bearer <CRON_SECRET>`.
Sem `CRON_SECRET` a rota responde 503; com segredo errado, 401. Cada disparo publica até 5 postagens vencidas e devolve um resumo.

**Agendador interno (padrão)**: quando o portal roda em servidor próprio (`npm run dev`, `npm start` ou Docker), o
`instrumentation.ts` liga um agendador dentro do próprio servidor, que chama essa rota a cada minuto. Não há nada a configurar
além do `CRON_SECRET`. Ele fica desligado na Vercel (sem servidor permanente) e pode ser desligado com `INSTAGRAM_SCHEDULER=externo`;
`INSTAGRAM_SCHEDULER=interno` força ligar. Com o servidor desligado, nada é publicado; o que venceu nesse período sai assim que
ele volta.

**Agendador externo**: na Vercel, a rota precisa ser chamada **a cada 5 minutos** por um serviço externo. Opções sem custo:

| Opção | Observação |
|-------|------------|
| **cron-job.org** | Gratuito, aceita cabeçalho personalizado. Mais simples |
| **Supabase `pg_cron` + `pg_net`** | Se o banco for para o Supabase: um `cron.schedule` que faz `net.http_post` na rota |
| **Vercel Cron** | No plano gratuito roda só **uma vez por dia**: não serve para agendar horários |
| **GitHub Actions `schedule`** | Funciona, mas a cada 5 min consome ~8.600 min/mês, acima da cota gratuita de repositório privado |

Exemplo para testar à mão:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<portal>/api/cron/instagram
```

## Permissões

- Ver a agenda: `content:read` (todos que entram no painel, inclusive consulta).
- Criar, editar, agendar, publicar, cancelar e excluir: `instagram:publish` — superadministrador, administrador e editor.
- Publicadas e agendadas não são excluídas (cancela-se o agendamento primeiro); o que já saiu fica no histórico.
- Toda operação gera auditoria (`instagram.create`, `.update`, `.publish`, `.fail`, `.cancel`, `.delete`).

## Arquivos

| Arquivo | Conteúdo |
|---------|----------|
| `prisma/migrations/20261016220000_instagram` | Enums `InstagramFormat`, `InstagramPostStatus`, `InstagramPostOrigin` e tabela `InstagramPost` |
| `modules/instagram/rules.ts` | Regras puras: legenda, estados, tentativas, endereço público, erros da API, semana da agenda |
| `modules/instagram/service.ts` | `publishPost`, `runDuePosts`, `listWeek`, `listQueue` |
| `lib/instagram/client.ts` | Configuração por ambiente e cliente da Graph API (`fetch` injetável nos testes) |
| `lib/validation/instagram.ts` | Schema Zod do formulário |
| `app/api/cron/instagram/route.ts` | Rota do agendador |
| `app/(admin)/admin/(painel)/instagram/` | Agenda (`page.tsx`), nova publicação (`novo/`), detalhe e edição (`[id]/`), formulário com prévia |
| `tests/unit/instagram.test.ts` | Regras, validação e cliente com `fetch` falso |

## Etapa 2 — automações e artes

### Automações

Ligadas e desligadas no painel (`/admin/instagram`, painel "Automações"). **Começam desligadas.** Ao ligar, a automação só vale para o
que acontecer daí em diante (`enabledAt`), sem reprocessar o passado.

| Automação | Gatilho | O que cria |
|-----------|---------|------------|
| Resultado do jogo | Jogo do nosso clube encerrado (`FINISHED`, com placar) nos últimos 3 dias | Feed (com legenda) e story, 30 min depois |
| Chamada do jogo | Jogo agendado nas próximas 24 h (e com pelo menos 2 h de antecedência) | Story, 24 h antes |
| Escalação | Jogo agendado nas próximas 3 h com titulares salvos | Story, 2 h antes |
| Notícia publicada | Notícia publicada nas últimas 24 h | Feed (título, resumo e link), 10 min depois |

- Rodam no mesmo disparo do agendador (`runDuePosts` chama `runAutomations` antes de publicar).
- Cada publicação criada leva `origin = AUTOMATION` e uma chave única (`resultado:<matchId>:FEED` etc.): nunca sai duas vezes,
  mesmo com dois disparos ao mesmo tempo. Ela entra na fila como "Agendada" e pode ser editada ou cancelada antes de sair.
- Planejamento puro em `modules/instagram/automations.ts` (testado); busca de dados e gravação em `automation-service.ts`.
- **Privacidade**: nomes de atletas (gols e escalação) só aparecem com "Divulgação autorizada" (`isPublished`), a mesma regra da
  página do jogo. Titulares sem autorização entram como "+ N atletas".

### Artes

- Desenhadas com `next/og` (Satori) e convertidas para **JPEG** com `sharp` (`lib/instagram/art.ts`). O `sharp` já vem com o Next.
- Visual dos mockups aprovados: azul-marinho, branco e Montserrat. Satori não lê fonte variável, então `lib/instagram/fonts` tem
  Montserrat em pesos fixos (500 e 800), gerados a partir da fonte do site (licença OFL, junto dos arquivos).
- Escudos e capas vêm do próprio portal (`/brand/...` ou `/midia/...`, local ou S3). Sem escudo, a arte mostra as iniciais.
- **Prévia** sem publicar nada: botão "Ver arte de exemplo" em cada automação, que abre
  `/admin/instagram/previa/<AUTOMAÇÃO>?formato=FEED|STORY` com os dados mais recentes.
- As artes geradas são gravadas como mídia (`MediaAsset`) e contam como "em uso" enquanto houver publicação apontando para elas.
