import "server-only";

import type { InstagramPostStatus, Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { saoPauloLocalToUtc } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { createInstagramClient, instagramConfig, InstagramApiError, type InstagramClient } from "@/lib/instagram/client";
import { SITE_URL } from "@/lib/site";
import { s3PublicBase } from "@/lib/storage";
import { LOCK_TIMEOUT_MS, publicImageUrl, RUN_BATCH_SIZE, shiftWeek, statusAfterFailure } from "./rules";

export type PublishResult = { status: InstagramPostStatus; message: string };

type PublishOptions = {
  /** Quem pediu a publicação (null = agendador). */
  userId: string | null;
  /** Estados a partir dos quais a publicação pode começar. */
  from: InstagramPostStatus[];
  client?: InstagramClient;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Publica uma postagem no Instagram: cria o contêiner, espera o processamento e publica.
 * A postagem é "reservada" (PUBLISHING + lockedAt) numa única atualização condicional, para que dois disparos
 * simultâneos do agendador, ou o agendador e o botão "Publicar agora", nunca publiquem a mesma coisa duas vezes.
 */
export async function publishPost(id: string, options: PublishOptions): Promise<PublishResult> {
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? defaultSleep;
  const config = options.client?.config ?? instagramConfig();
  if (!config) return { status: "SCHEDULED", message: "A integração com o Instagram não está configurada neste ambiente." };
  const client = options.client ?? createInstagramClient(config);

  const startedAt = now();
  const claimed = await prisma.instagramPost.updateMany({
    where: {
      id,
      OR: [{ status: { in: options.from } }, { status: "PUBLISHING", lockedAt: { lt: new Date(startedAt.getTime() - LOCK_TIMEOUT_MS) } }],
    },
    data: { status: "PUBLISHING", lockedAt: startedAt, attempts: { increment: 1 }, lastError: null },
  });
  if (claimed.count === 0) return { status: "PUBLISHING", message: "Esta publicação já está sendo publicada ou não pode ser publicada agora." };

  const post = await prisma.instagramPost.findUniqueOrThrow({ where: { id } });

  try {
    const imageUrl = publicImageUrl(post.imagePath, SITE_URL, s3PublicBase());
    if (!imageUrl) {
      throw new InstagramApiError({
        message: "A imagem não tem um endereço público HTTPS. Em desenvolvimento local o Instagram não alcança o seu computador: veja docs/INSTAGRAM.md.",
        retryable: false,
      });
    }

    const containerId = await client.createContainer({ format: post.format, imageUrl, caption: post.format === "FEED" ? post.caption : null });
    await prisma.instagramPost.update({ where: { id }, data: { containerId } });

    // O Instagram processa a imagem antes de liberar a publicação; em fotos costuma levar poucos segundos.
    let ready = false;
    for (let check = 0; check < 6 && !ready; check += 1) {
      const status = await client.containerStatus(containerId);
      if (status.code === "FINISHED") ready = true;
      else if (status.code === "ERROR" || status.code === "EXPIRED") {
        const detail = status.detail ? ` Resposta do Instagram: ${status.detail}.` : "";
        throw new InstagramApiError({ message: `O Instagram não conseguiu processar a imagem. Confira o formato (JPEG) e a proporção.${detail}`, retryable: false });
      } else await sleep(2_000);
    }
    if (!ready) throw new InstagramApiError({ message: "O Instagram ainda está processando a imagem. A publicação será tentada de novo.", retryable: true });

    const mediaId = await client.publish(containerId);
    const permalink = await client.permalink(mediaId);
    const publishedAt = now();

    await prisma.$transaction(async (tx) => {
      await tx.instagramPost.update({
        where: { id },
        data: { status: "PUBLISHED", lockedAt: null, mediaId, permalink, publishedAt, accountLabel: config.accountLabel, lastError: null },
      });
      await audit(
        {
          userId: options.userId,
          action: "instagram.publish",
          entity: "InstagramPost",
          entityId: id,
          summary: `Publicou no Instagram (${post.format === "FEED" ? "feed" : "story"}) em ${config.accountLabel}`,
          after: { mediaId, permalink, account: config.accountLabel },
        },
        tx,
      );
    });
    return { status: "PUBLISHED", message: `Publicado em ${config.accountLabel}.` };
  } catch (error) {
    const known = error instanceof InstagramApiError;
    if (!known) console.error("[instagram] falha inesperada ao publicar", error);
    const message = known ? error.message : "Falha inesperada ao publicar. A publicação será tentada de novo.";
    const status = statusAfterFailure(post.attempts, known ? error.retryable : true);
    await prisma.$transaction(async (tx) => {
      await tx.instagramPost.update({
        where: { id },
        // Na nova tentativa o agendador pega a postagem de novo: ela precisa ter um horário.
        data: { status, lockedAt: null, lastError: message, scheduledAt: post.scheduledAt ?? startedAt },
      });
      await audit(
        {
          userId: options.userId,
          action: "instagram.fail",
          entity: "InstagramPost",
          entityId: id,
          summary: `Falha ao publicar no Instagram (tentativa ${post.attempts}): ${message}`,
          after: { status, attempts: post.attempts },
        },
        tx,
      );
    });
    return { status, message };
  }
}

export type RunSummary = { configured: boolean; processed: { id: string; status: InstagramPostStatus }[] };

/** Disparado pelo agendador (rota /api/cron/instagram): publica o que já passou do horário. */
export async function runDuePosts(now: Date = new Date(), client?: InstagramClient): Promise<RunSummary> {
  if (!client && !instagramConfig()) return { configured: false, processed: [] };
  const due = await prisma.instagramPost.findMany({
    where: {
      OR: [
        { status: "SCHEDULED", scheduledAt: { lte: now } },
        { status: "PUBLISHING", lockedAt: { lt: new Date(now.getTime() - LOCK_TIMEOUT_MS) } },
      ],
    },
    orderBy: { scheduledAt: "asc" },
    take: RUN_BATCH_SIZE,
    select: { id: true },
  });
  const processed: RunSummary["processed"] = [];
  for (const { id } of due) {
    const result = await publishPost(id, { userId: null, from: ["SCHEDULED"], client });
    processed.push({ id, status: result.status });
  }
  return { configured: true, processed };
}

const agendaSelect = {
  id: true,
  format: true,
  caption: true,
  imagePath: true,
  status: true,
  origin: true,
  scheduledAt: true,
  publishedAt: true,
  permalink: true,
  accountLabel: true,
  lastError: true,
  attempts: true,
} satisfies Prisma.InstagramPostSelect;

export type AgendaPost = Prisma.InstagramPostGetPayload<{ select: typeof agendaSelect }>;

/** Publicações de uma semana (segunda a domingo, horário de São Paulo), exceto as canceladas. */
export async function listWeek(startKey: string): Promise<AgendaPost[]> {
  const start = saoPauloLocalToUtc(`${startKey}T00:00`);
  const end = saoPauloLocalToUtc(`${shiftWeek(startKey, 1)}T00:00`);
  if (!start || !end) return [];
  return prisma.instagramPost.findMany({
    where: {
      status: { not: "CANCELED" },
      OR: [{ publishedAt: { gte: start, lt: end } }, { publishedAt: null, scheduledAt: { gte: start, lt: end } }],
    },
    select: agendaSelect,
    orderBy: { scheduledAt: "asc" },
  });
}

/** Fila do painel: o que ainda vai sair (ou precisa de atenção) e as últimas publicadas. */
export async function listQueue(): Promise<{ pending: AgendaPost[]; recent: AgendaPost[] }> {
  const [pending, recent] = await Promise.all([
    prisma.instagramPost.findMany({
      where: { status: { in: ["SCHEDULED", "PUBLISHING", "FAILED", "DRAFT"] } },
      select: agendaSelect,
      orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: 100,
    }),
    prisma.instagramPost.findMany({
      where: { status: { in: ["PUBLISHED", "CANCELED"] } },
      select: agendaSelect,
      orderBy: { updatedAt: "desc" },
      take: 15,
    }),
  ]);
  return { pending, recent };
}
