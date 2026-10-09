"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { athleteSchema } from "@/lib/validation/site";

export async function saveAthleteAction(id: string | null, formData: FormData): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    const parsed = athleteSchema.safeParse({
      name: field(formData, "name"),
      nickname: field(formData, "nickname"),
      position: field(formData, "position"),
      shirtNumber: field(formData, "shirtNumber"),
      bio: field(formData, "bio"),
      photoPath: field(formData, "photoPath"),
      status: field(formData, "status"),
      isPublished: formData.get("isPublished") === "on",
    });
    if (!parsed.success) return zodErrorState(parsed.error);

    if (id && !(await prisma.athlete.findUnique({ where: { id }, select: { id: true } }))) return { error: "Jogador não encontrado." };
    const athlete = id ? await prisma.athlete.update({ where: { id }, data: parsed.data }) : await prisma.athlete.create({ data: parsed.data });
    await audit({
      userId: user.id,
      action: id ? "athlete.update" : "athlete.create",
      entity: "Athlete",
      entityId: athlete.id,
      summary: `${id ? "Editou" : "Cadastrou"} o jogador "${athlete.name}"`,
    });
    return { ok: true, message: "Jogador salvo.", redirectTo: id ? undefined : "/admin/elenco" };
  });
}

export async function deleteAthleteAction(id: string): Promise<ActionState> {
  return withPermission("football:delete", async (user) => {
    const athlete = await prisma.athlete.findUnique({ where: { id } });
    if (!athlete) return { error: "Jogador não encontrado." };
    await prisma.athlete.delete({ where: { id } });
    await audit({ userId: user.id, action: "athlete.delete", entity: "Athlete", entityId: id, summary: `Removeu o jogador "${athlete.name}"` });
    return { ok: true, redirectTo: "/admin/elenco" };
  });
}
