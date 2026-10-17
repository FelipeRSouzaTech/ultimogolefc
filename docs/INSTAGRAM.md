# Instagram — publicação no feed e nos stories

Integração do painel com a API oficial do Instagram (Graph API), para publicar e agendar postagens do clube.
Mockups aprovados pelo usuário em 16/10/2026: tela de nova publicação, agenda semanal com fila e artes automáticas.

## Etapas

| Etapa | O que entra | Situação |
|-------|-------------|----------|
| **1** | Modelo `InstagramPost`, publicação manual (agora ou agendada) no feed e no story, agenda semanal, fila, agendador por rota protegida, histórico e auditoria | Este PR |
| **2** | Automações (resultado do jogo, chamada 24 h antes, escalação, notícia publicada) e geração das artes no servidor (JPEG 1080 × 1350 e 1080 × 1920) a partir dos dados do jogo | Planejada |
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
- **Legenda**: até 2.200 caracteres e 30 hashtags.
- **Limite**: 100 publicações por 24 h por conta (de sobra para o clube).
- **Proporção**: feed entre 4:5 e 1,91:1; story 9:16. Hoje a proporção não é medida no envio; se estiver fora, a publicação falha
  com a mensagem do Instagram. A geração das artes na etapa 2 já sai no tamanho certo.

### Testar no computador (desenvolvimento local)

O Instagram precisa baixar a imagem, e ele não alcança `localhost`. Duas saídas:

1. **Armazenamento S3 com endereço público** (recomendado, é o que vai para produção): Supabase Storage ou Cloudflare R2 com
   `STORAGE_DRIVER=s3` e `S3_PUBLIC_URL`. As imagens enviadas no painel já ficam públicas.
2. **Túnel** (`cloudflared tunnel --url http://localhost:3000` ou ngrok) e `NEXT_PUBLIC_SITE_URL` apontando para o endereço do túnel.

## Agendador

Rota: `GET` ou `POST /api/cron/instagram`, com o cabeçalho `Authorization: Bearer <CRON_SECRET>`.
Sem `CRON_SECRET` a rota responde 503; com segredo errado, 401. Cada disparo publica até 5 postagens vencidas e devolve um resumo.

A rota precisa ser chamada **a cada 5 minutos** por um serviço externo. Opções sem custo:

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

## Etapa 2 (planejada) — automações e artes

- **Artes no servidor**: gerar o JPEG a partir de um modelo (placar, adversário, data, escudo) com `next/og` (`ImageResponse`, gera PNG)
  convertido para JPEG, ou com `sharp`. Decidir na etapa 2 pelo custo de dependência e pelo tempo de geração.
- **Automações**: tabela de regras ligáveis no painel (resultado do jogo, chamada 24 h antes, escalação, notícia publicada). Cada
  automação cria uma `InstagramPost` com `origin = AUTOMATION` e uma chave única (ex.: `resultado:<matchId>:FEED`) para não duplicar.
  A postagem entra na fila como qualquer outra e pode ser editada ou cancelada antes de sair.
- **Gatilhos**: o próprio agendador verifica jogos encerrados e jogos nas próximas 24 h; a notícia dispara ao publicar.
