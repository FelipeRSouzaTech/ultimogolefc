"use server";

import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { saoPauloLocalToUtc } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { instagramConfig } from "@/lib/instagram/client";
import { instagramPostSchema } from "@/lib/validation/instagram";
import { initialStatus, isDeletable, isEditable, scheduleError } from "@/modules/instagram/rules";
import { publishPost } from "@/modules/instagram/service";

const LABEL = { FEED: "feed", STORY: "story" } as const;

/** Cria ou edita uma publicação. "Publicar agora" salva e publica na mesma requisição. */
export async function saveInstagramPostAction(id: string | null, formData: FormData): Promise<ActionState> {
  return withPermission("instagram:publish", async (user) => {
    const parsed = instagramPostSchema.safeParse({
      format: field(formData, "format"),
      imagePath: field(formData, "imagePath"),
      caption: typeof formData.get("caption") === "string" ? (formData.get("caption") as string) : "",
      when: field(formData, "when"),
      scheduledAt: field(formData, "scheduledAt"),
    });
    if (!parsed.success) return zodErrorState(parsed.error);
    const data = parsed.data;

    const previous = id ? await prisma.instagramPost.findUnique({ where: { id } }) : null;
    if (id && !previous) return { error: "Publicação não encontrada." };
    if (previous && !isEditable(previous.status)) return { error: "Esta publicação já saiu ou está saindo agora e não pode mais ser editada." };

    let scheduledAt: Date | null = null;
    if (data.when === "SCHEDULE") {
      scheduledAt = saoPauloLocalToUtc(data.scheduledAt);
      const problem = scheduledAt ? scheduleError(scheduledAt) : "Informe data e horário válidos.";
      if (problem) return { error: "Revise os campos destacados.", fieldErrors: { scheduledAt: [problem] } };
    }
    if (data.when === "NOW") {
      if (!instagramConfig()) return { error: "A integração com o Instagram não está configurada neste ambiente. Salve como rascunho ou agende." };
      scheduledAt = new Date();
    }

    const payload = {
      format: data.format,
      imagePath: data.imagePath,
      caption: data.format === "FEED" ? data.caption : null,
      status: initialStatus(data.when),
      scheduledAt,
      // Uma edição recomeça a contagem de tentativas e limpa o erro anterior.
      attempts: 0,
      lastError: null,
    };

    const saved = await prisma.$transaction(async (tx) => {
      const post = id ? await tx.instagramPost.update({ where: { id }, data: payload }) : await tx.instagramPost.create({ data: { ...payload, createdById: user.id } });
      await audit(
        {
          userId: user.id,
          action: id ? "instagram.update" : "instagram.create",
          entity: "InstagramPost",
          entityId: post.id,
          summary: `${id ? "Editou" : "Criou"} publicação do Instagram (${LABEL[post.format]}, ${post.status === "DRAFT" ? "rascunho" : "agendada"})`,
          before: previous ? { status: previous.status, scheduledAt: previous.scheduledAt?.toISOString() ?? null } : undefined,
          after: { status: post.status, format: post.format, scheduledAt: post.scheduledAt?.toISOString() ?? null },
        },
        tx,
      );
      return post;
    });

    if (data.when === "NOW") {
      const result = await publishPost(saved.id, { userId: user.id, from: ["SCHEDULED"] });
      if (result.status !== "PUBLISHED") return { error: result.message, redirectTo: `/admin/instagram/${saved.id}` };
      return { ok: true, message: result.message, redirectTo: `/admin/instagram/${saved.id}` };
    }
    return {
      ok: true,
      message: data.when === "DRAFT" ? "Rascunho salvo." : "Publicação agendada.",
      redirectTo: id ? undefined : "/admin/instagram",
    };
  });
}

export async function publishInstagramNowAction(id: string): Promise<ActionState> {
  return withPermission("instagram:publish", async (user) => {
    if (!instagramConfig()) return { error: "A integração com o Instagram não está configurada neste ambiente." };
    const result = await publishPost(id, { userId: user.id, from: ["DRAFT", "SCHEDULED", "FAILED", "CANCELED"] });
    return result.status === "PUBLISHED" ? { ok: true, message: result.message } : { error: result.message };
  });
}

export async function cancelInstagramPostAction(id: string): Promise<ActionState> {
  return withPermission("instagram:publish", async (user) => {
    const changed = await prisma.$transaction(async (tx) => {
      const result = await tx.instagramPost.updateMany({ where: { id, status: { in: ["SCHEDULED", "FAILED"] } }, data: { status: "CANCELED", lockedAt: null } });
      if (result.count === 1) {
        await audit({ userId: user.id, action: "instagram.cancel", entity: "InstagramPost", entityId: id, summary: "Cancelou o agendamento de uma publicação do Instagram" }, tx);
      }
      return result.count;
    });
    return changed === 1 ? { ok: true, message: "Agendamento cancelado." } : { error: "Só é possível cancelar publicações agendadas ou que falharam." };
  });
}

export async function deleteInstagramPostAction(id: string): Promise<ActionState> {
  return withPermission("instagram:publish", async (user) => {
    const post = await prisma.instagramPost.findUnique({ where: { id } });
    if (!post) return { error: "Publicação não encontrada." };
    if (!isDeletable(post.status)) return { error: "Publicações agendadas ou já publicadas não são excluídas. Cancele o agendamento primeiro." };
    await prisma.$transaction(async (tx) => {
      await tx.instagramPost.delete({ where: { id } });
      await audit(
        { userId: user.id, action: "instagram.delete", entity: "InstagramPost", entityId: id, summary: `Excluiu publicação do Instagram (${LABEL[post.format]})`, before: { status: post.status } },
        tx,
      );
    });
    return { ok: true, message: "Publicação excluída.", redirectTo: "/admin/instagram" };
  });
}
