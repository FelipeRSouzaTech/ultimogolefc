"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { teamProfileSchema } from "@/lib/validation/site";
import { ATHLETE_CATEGORY_LABELS, isAthleteCategory } from "@/modules/squad/rules";

/** Salva o nome de exibição e a imagem do cartão de uma equipe (categoria de atletas). */
export async function saveTeamProfileAction(category: string, formData: FormData): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    if (!isAthleteCategory(category)) return { error: "Categoria não encontrada." };
    const parsed = teamProfileSchema.safeParse({
      name: field(formData, "name"),
      coverPath: field(formData, "coverPath"),
    });
    if (!parsed.success) return zodErrorState(parsed.error);

    await prisma.teamProfile.upsert({ where: { category }, create: { category, ...parsed.data }, update: parsed.data });
    await audit({
      userId: user.id,
      action: "team.update",
      entity: "TeamProfile",
      entityId: category,
      summary: `Editou a equipe "${parsed.data.name ?? ATHLETE_CATEGORY_LABELS[category]}"`,
      after: parsed.data,
    });
    return { ok: true, message: "Equipe salva." };
  });
}
