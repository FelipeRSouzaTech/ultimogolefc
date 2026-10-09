# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
# Pasta das imagens enviadas (driver local); deve ser montada como volume persistente.
RUN mkdir -p /app/storage/uploads && chown -R node:node /app
USER node
EXPOSE 3000
# Aplica as migrations pendentes e inicia o servidor.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
