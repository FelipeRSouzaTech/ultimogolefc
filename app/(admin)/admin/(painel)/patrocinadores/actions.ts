"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { saoPauloLocalToUtc } from "@/lib/datetime";
import { sponsorSchema } from "@/lib/validation/site";

export async function saveSponsorAction(id: string | null, formData: FormData): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const parsed = sponsorSchema.safeParse({
      name: field(formData, "name"),
      tier: field(formData, "tier"),
      description: field(formData, "description"),
      logoPath: field(formData, "logoPath"),
      websiteUrl: field(formData, "websiteUrl"),
      instagramUrl: field(formData, "instagramUrl"),
      startsAt: field(formData, "startsAt"),
      endsAt: field(formData, "endsAt"),
      sortOrder: field(formData, "sortOrder") || "0",
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) return zodErrorState(parsed.error);

    // A vigência vale do início do primeiro dia ao fim do último, no horário de Brasília.
    const startsAt = parsed.data.startsAt ? saoPauloLocalToUtc(`${parsed.data.startsAt}T00:00`) : null;
    const endsAt = parsed.data.endsAt ? saoPauloLocalToUtc(`${parsed.data.endsAt}T23:59`) : null;
    if (parsed.data.startsAt && !startsAt) return { error: "Revise os campos destacados.", fieldErrors: { startsAt: ["Data inválida."] } };
    if (parsed.data.endsAt && !endsAt) return { error: "Revise os campos destacados.", fieldErrors: { endsAt: ["Data inválida."] } };
    if (startsAt && endsAt && endsAt < startsAt) {
      return { error: "Revise os campos destacados.", fieldErrors: { endsAt: ["O fim da vigência deve ser depois do início."] } };
    }

    const data = { ...parsed.data, startsAt, endsAt };
    if (id && !(await prisma.sponsor.findUnique({ where: { id }, select: { id: true } }))) return { error: "Patrocinador não encontrado." };
    const sponsor = id ? await prisma.sponsor.update({ where: { id }, data }) : await prisma.sponsor.create({ data });
    await audit({
      userId: user.id,
      action: id ? "sponsor.update" : "sponsor.create",
      entity: "Sponsor",
      entityId: sponsor.id,
      summary: `${id ? "Editou" : "Cadastrou"} o patrocinador "${sponsor.name}"`,
    });
    return { ok: true, message: "Patrocinador salvo.", redirectTo: id ? undefined : "/admin/patrocinadores" };
  });
}

export async function deleteSponsorAction(id: string): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const sponsor = await prisma.sponsor.findUnique({ where: { id } });
    if (!sponsor) return { error: "Patrocinador não encontrado." };
    await prisma.sponsor.delete({ where: { id } });
    await audit({ userId: user.id, action: "sponsor.delete", entity: "Sponsor", entityId: id, summary: `Excluiu o patrocinador "${sponsor.name}"` });
    return { ok: true, redirectTo: "/admin/patrocinadores" };
  });
}
