# Backup e restauração

> Comandos padrão do PostgreSQL; ainda não exercitados neste projeto (veja `docs/STATUS.md`).

O banco guarda todo o conteúdo do portal. As imagens enviadas ficarão em armazenamento de objetos (fase de mídia)
e terão backup próprio.

## Backup

Com o Docker Compose de desenvolvimento:

```bash
mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/ultimogole-$(date +%F-%H%M).dump
```

Em produção, com acesso direto ao banco:

```bash
pg_dump "$DATABASE_URL" -Fc -f ultimogole-$(date +%F-%H%M).dump
```

Recomendações:

- Backup diário automático, guardando pelo menos 7 diários e 4 semanais.
- Cópia fora do servidor (outro provedor ou bucket), com acesso restrito e criptografia.
- O arquivo contém dados pessoais (nomes e e-mails de usuários do painel): trate-o conforme a LGPD.

## Restauração

A restauração **substitui** os dados atuais. Pare a aplicação antes.

```bash
# Docker Compose
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < backups/ARQUIVO.dump

# Acesso direto
pg_restore -d "$DATABASE_URL" --clean --if-exists --no-owner ARQUIVO.dump
```

Depois, aplique migrations que sejam mais novas que o backup e suba a aplicação:

```bash
npm run db:deploy
```

## Teste de restauração

Um backup só vale depois de restaurado com sucesso. Pelo menos uma vez por mês, restaure o arquivo mais recente
em um banco vazio separado e confira se o portal abre e se as últimas notícias e partidas estão lá.
