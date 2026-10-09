"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { staffSchema } from "@/lib/validation/site";
import { SETTING_GROUPS, validateSetting } from "@/modules/site/settings";

/** Salva um grupo de configurações. Só as chaves definidas em SETTING_GROUPS são aceitas. */
export async function saveSettingsAction(groupId: string, formData: FormData): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const group = SETTING_GROUPS.find((item) => item.id === groupId);
    if (!group) return { error: "Grupo de configurações inválido." };

    const values: { key: string; value: string }[] = [];
    const fieldErrors: Record<string, string[]> = {};
    for (const def of group.settings) {
      const value = field(formData, def.key);
      const problem = validateSetting(def, value);
      if (problem) fieldErrors[def.key] = [problem];
      values.push({ key: def.key, value });
    }
    if (Object.keys(fieldErrors).length > 0) return { error: "Revise os campos destacados.", fieldErrors };

    await prisma.$transaction(async (tx) => {
      for (const { key, value } of values) {
        await tx.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
      }
      await audit(
        { userId: user.id, action: "settings.update", entity: "SiteSetting", entityId: group.id, summary: `Atualizou as configurações de "${group.title}"` },
        tx,
      );
    });
    return { ok: true, message: "Configurações salvas." };
  });
}

export async function saveStaffAction(id: string | null, formData: FormData): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const parsed = staffSchema.safeParse({
      name: field(formData, "name"),
      role: field(formData, "role"),
      group: field(formData, "group"),
      sortOrder: field(formData, "sortOrder") || "0",
      isPublished: formData.get("isPublished") === "on",
    });
    if (!parsed.success) return zodErrorState(parsed.error);
    if (id && !(await prisma.staffMember.findUnique({ where: { id }, select: { id: true } }))) return { error: "Registro não encontrado." };
    const member = id ? await prisma.staffMember.update({ where: { id }, data: parsed.data }) : await prisma.staffMember.create({ data: parsed.data });
    await audit({
      userId: user.id,
      action: id ? "staff.update" : "staff.create",
      entity: "StaffMember",
      entityId: member.id,
      summary: `${id ? "Editou" : "Cadastrou"} "${member.name}" (${member.role})`,
    });
    return { ok: true, message: "Registro salvo." };
  });
}

export async function deleteStaffAction(id: string): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const member = await prisma.staffMember.findUnique({ where: { id } });
    if (!member) return { error: "Registro não encontrado." };
    await prisma.staffMember.delete({ where: { id } });
    await audit({ userId: user.id, action: "staff.delete", entity: "StaffMember", entityId: id, summary: `Removeu "${member.name}" (${member.role})` });
    return { ok: true };
  });
}
