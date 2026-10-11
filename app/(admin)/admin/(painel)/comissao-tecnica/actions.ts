import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { technicalStaffSchema } from "@/lib/validation/site";

export async function saveTechnicalStaffAction(
  id: string | null,
  formData: FormData,
): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    const parsed = technicalStaffSchema.safeParse({
      name: field(formData, "name"),
      nickname: field(formData, "nickname"),
      role: field(formData, "role"),
      seasonIds: formData.getAll("seasonIds").map(String),
      status: field(formData, "status"),
      categories: formData.getAll("categories").map(String),
      sortOrder: field(formData, "sortOrder"),
      isPublished: formData.get("isPublished") === "on",
    });
    if (!parsed.success) return zodErrorState(parsed.error);

    const data = parsed.data;

    if (id) {
      const existing = await prisma.technicalStaff.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return { error: "Registro não encontrado." };

      await prisma.technicalStaff.update({
        where: { id },
        data: {
          name: data.name,
          nickname: data.nickname,
          role: data.role,
          status: data.status,
          categories: data.categories,
          sortOrder: data.sortOrder,
          isPublished: data.isPublished,
          seasons: {
            deleteMany: {},
            create: data.seasonIds.map((seasonId) => ({ seasonId })),
          },
        },
      });
      await audit({ userId: user.id, action: "UPDATE", entity: "TechnicalStaff", entityId: id, summary: `Atualizou ${data.name}` });
    } else {
      const created = await prisma.technicalStaff.create({
        data: {
          name: data.name,
          nickname: data.nickname,
          role: data.role,
          status: data.status,
          categories: data.categories,
          sortOrder: data.sortOrder,
          isPublished: data.isPublished,
          seasons: {
            create: data.seasonIds.map((seasonId) => ({ seasonId })),
          },
        },
      });
      await audit({ userId: user.id, action: "CREATE", entity: "TechnicalStaff", entityId: created.id, summary: `Cadastrou ${data.name}` });
    }
    return { ok: true, redirect: "/admin/comissao-tecnica" };
  });
}

export async function deleteTechnicalStaffAction(id: string): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    const existing = await prisma.technicalStaff.findUnique({ where: { id }, select: { name: true } });
    if (!existing) return { error: "Registro não encontrado." };

    await prisma.technicalStaff.delete({ where: { id } });
    await audit({ userId: user.id, action: "DELETE", entity: "TechnicalStaff", entityId: id, summary: `Removeu ${existing.name}` });
    return { ok: true };
  });
}