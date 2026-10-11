"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { directorSchema } from "@/lib/validation/site";
import { DIRECTOR_STATUS_LABELS } from "@/modules/finance/rules";

export async function saveDirectorAction(id: string | null, formData: FormData): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const parsed = directorSchema.safeParse({
      name: field(formData, "name"),
      role: field(formData, "role"),
      status: field(formData, "status"),
      photoPath: field(formData, "photoPath"),
    });
    if (!parsed.success) return zodErrorState(parsed.error);

    const previous = id ? await prisma.director.findUnique({ where: { id } }) : null;
    if (id && !previous) return { error: "Diretor não encontrado." };
    const director = id ? await prisma.director.update({ where: { id }, data: parsed.data }) : await prisma.director.create({ data: parsed.data });
    await audit({
      userId: user.id,
      action: id ? "director.update" : "director.create",
      entity: "Director",
      entityId: director.id,
      summary: `${id ? "Editou" : "Cadastrou"} o diretor "${director.name}" (${DIRECTOR_STATUS_LABELS[director.status]})`,
      before: previous ? { role: previous.role, status: previous.status } : undefined,
      after: { role: director.role, status: director.status },
    });
    return { ok: true, message: "Diretor salvo.", redirectTo: id ? undefined : "/admin/diretores" };
  });
}

export async function deleteDirectorAction(id: string): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const director = await prisma.director.findUnique({ where: { id }, include: { _count: { select: { dues: true } } } });
    if (!director) return { error: "Diretor não encontrado." };
    // O histórico financeiro é preservado: quem tem mensalidades não é apagado, muda de situação.
    if (director._count.dues > 0) {
      return { error: 'Este diretor tem mensalidades registradas e não pode ser removido. Altere a situação para "Desligado".' };
    }
    await prisma.director.delete({ where: { id } });
    await audit({ userId: user.id, action: "director.delete", entity: "Director", entityId: id, summary: `Removeu o diretor "${director.name}"` });
    return { ok: true, redirectTo: "/admin/diretores" };
  });
}
