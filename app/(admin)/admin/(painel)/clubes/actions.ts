"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { uniqueSlug } from "@/lib/slug";
import { clubSchema } from "@/lib/validation/football";

export async function saveClubAction(id: string | null, formData: FormData): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    const parsed = clubSchema.safeParse({
      name: field(formData, "name"),
      shortName: field(formData, "shortName"),
      crestPath: field(formData, "crestPath"),
    });
    if (!parsed.success) return zodErrorState(parsed.error);
    const isOwnClub = formData.get("isOwnClub") === "on";

    const duplicate = await prisma.club.findFirst({
      where: { name: { equals: parsed.data.name, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) },
      select: { id: true },
    });
    if (duplicate) return { error: "Revise os campos destacados.", fieldErrors: { name: ["Já existe um clube com este nome."] } };

    const saved = await prisma.$transaction(async (tx) => {
      // Só pode existir um "nosso clube": ao marcar um, os demais são desmarcados na mesma transação.
      if (isOwnClub) await tx.club.updateMany({ where: { isOwnClub: true, ...(id ? { id: { not: id } } : {}) }, data: { isOwnClub: false } });
      const data = { ...parsed.data, isOwnClub };
      let club;
      if (id) {
        if (!(await tx.club.findUnique({ where: { id }, select: { id: true } }))) return null;
        club = await tx.club.update({ where: { id }, data });
      } else {
        const slug = await uniqueSlug(parsed.data.name, async (candidate) => (await tx.club.findUnique({ where: { slug: candidate }, select: { id: true } })) !== null);
        club = await tx.club.create({ data: { ...data, slug } });
      }
      await audit(
        { userId: user.id, action: id ? "club.update" : "club.create", entity: "Club", entityId: club.id, summary: `${id ? "Editou" : "Criou"} o clube "${club.name}"` },
        tx,
      );
      return club;
    });
    if (!saved) return { error: "Clube não encontrado." };
    return { ok: true, message: "Clube salvo.", redirectTo: id ? undefined : "/admin/clubes" };
  });
}

export async function deleteClubAction(id: string): Promise<ActionState> {
  return withPermission("football:delete", async (user) => {
    const club = await prisma.club.findUnique({
      where: { id },
      include: { _count: { select: { seasons: true, homeMatches: true, awayMatches: true } } },
    });
    if (!club) return { error: "Clube não encontrado." };
    if (club._count.seasons + club._count.homeMatches + club._count.awayMatches > 0) {
      return { error: "Este clube participa de temporadas ou partidas e não pode ser excluído." };
    }
    await prisma.club.delete({ where: { id } });
    await audit({ userId: user.id, action: "club.delete", entity: "Club", entityId: id, summary: `Excluiu o clube "${club.name}"` });
    return { ok: true, redirectTo: "/admin/clubes" };
  });
}
