# Implantação

> Este guia ainda não foi testado de ponta a ponta (veja `docs/STATUS.md`).

## Pré-requisitos

- Servidor com Docker, ou plataforma que rode contêineres.
- PostgreSQL 16 (gerenciado ou em contêiner com volume persistente).
- Domínio com HTTPS. O cookie de sessão é marcado como `secure` em produção e **não funciona sem HTTPS**.
- `prisma/migrations` e `package-lock.json` versionados no repositório.

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL. Use senha forte e exclusiva |
| `NEXT_PUBLIC_SITE_URL` | URL pública, por exemplo `https://www.seudominio.com.br` |
| `SESSION_TTL_DAYS` | Duração da sessão do painel em dias (padrão: 7) |
| `STORAGE_DRIVER` | `local` (padrão) ou `s3` |
| `STORAGE_LOCAL_DIR` | Pasta das imagens no driver local. No contêiner: `/app/storage/uploads` |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Acesso de escrita ao bucket (driver `s3`) |
| `S3_PUBLIC_URL` | Endereço público de leitura do bucket ou da CDN. **Obrigatório no driver `s3`** |

Guarde os valores no cofre de segredos da plataforma. Nunca no repositório.

## Passos

```bash
# 1. Build da imagem
docker build -t ultimogole:latest .

# 2. Execução (as migrations pendentes são aplicadas na inicialização)
docker run -d --name ultimogole -p 3000:3000 \
  -v ultimogole-uploads:/app/storage/uploads \
  -e DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/BANCO?schema=public" \
  -e NEXT_PUBLIC_SITE_URL="https://www.seudominio.com.br" \
  ultimogole:latest

# 3. Primeiro administrador (uma única vez)
docker exec -it ultimogole npm run admin:create
```

Coloque um proxy reverso com TLS (Caddy, Nginx, Traefik ou o da plataforma) na frente da porta 3000.
O proxy deve repassar o cabeçalho `X-Forwarded-For`, usado no bloqueio de tentativas de login por IP.

## Imagens enviadas

- **Driver local:** as imagens ficam em `/app/storage/uploads`. Monte um volume persistente nesse caminho
  (como no comando acima); sem ele, as imagens somem a cada atualização do contêiner.
- **Driver S3:** crie um bucket com leitura pública (ou atrás de uma CDN), gere uma chave com permissão de
  escrita e exclusão de objetos e preencha as variáveis `S3_*`. O portal grava e apaga pelo endpoint e
  redireciona as leituras para `S3_PUBLIC_URL`. Este driver ainda não foi testado contra um serviço real.
- O proxy reverso precisa aceitar corpos de até 6 MB (no Nginx: `client_max_body_size 6m;`).

## Depois de implantar

- Confira `GET /api/health` (deve responder `{"status":"ok"}`) e configure o monitoramento nessa rota.
- **Não** rode o seed de demonstração em produção.
- Configure o backup diário (`docs/BACKUP.md`) e teste uma restauração.

## Atualização

```bash
git pull && docker build -t ultimogole:latest .
docker stop ultimogole && docker rm ultimogole
# repita o docker run do passo 2
```

Faça um backup antes de qualquer atualização que traga migrations.
