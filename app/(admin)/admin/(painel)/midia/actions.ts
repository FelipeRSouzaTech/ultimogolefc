"use server";

import { prisma } from "@/lib/db/prisma";
import type { ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { deleteMediaIfUnused, findMediaUsage } from "@/modules/media/service";

/** Exclui um arquivo da biblioteca, somente se não estiver em uso em nenhum lugar do site. */
export async function deleteMediaAction(id: string): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return { error: "Arquivo não encontrado." };
    const usage = await findMediaUsage(asset.key);
    if (usage.length > 0) return { error: `Em uso em: ${usage.join(", ")}.` };
    if (!(await deleteMediaIfUnused(asset.key))) return { error: "O arquivo passou a ser usado e não foi excluído." };
    await audit({ userId: user.id, action: "media.delete", entity: "MediaAsset", entityId: id, summary: `Excluiu a imagem ${asset.originalName ?? asset.key}` });
    return { ok: true };
  });
}
