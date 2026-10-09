"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { createUserSchema, passwordSchema, updateUserSchema } from "@/lib/validation/auth";
import { checkUserChange } from "@/modules/users/rules";

export async function createUserAction(formData: FormData): Promise<ActionState> {
  return withPermission("users:manage", async (actor) => {
    const parsed = createUserSchema.safeParse({
      name: field(formData, "name"),
      email: field(formData, "email"),
      role: field(formData, "role"),
      password: String(formData.get("password") ?? ""),
    });
    if (!parsed.success) return zodErrorState(parsed.error);
    if (await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })) {
      return { error: "Revise os campos destacados.", fieldErrors: { email: ["Já existe um usuário com este e-mail."] } };
    }
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, passwordHash: await hashPassword(parsed.data.password) },
    });
    await audit({
      userId: actor.id,
      action: "user.create",
      entity: "User",
      entityId: user.id,
      summary: `Criou o usuário ${user.email} (${ROLE_LABELS[user.role]})`,
    });
    return { ok: true, message: "Usuário criado. Informe a senha inicial por um canal seguro e peça a troca no primeiro acesso." };
  });
}

export async function updateUserAction(id: string, formData: FormData): Promise<ActionState> {
  return withPermission("users:manage", async (actor) => {
    const parsed = updateUserSchema.safeParse({
      name: field(formData, "name"),
      role: field(formData, "role"),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) return zodErrorState(parsed.error);

    // Contagem e alteração na mesma transação, para não remover o último superadministrador em operações simultâneas.
    return prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({ where: { id } });
        if (!target) return { error: "Usuário não encontrado." };
        const activeSuperadmins = await tx.user.count({ where: { role: "SUPERADMIN", isActive: true } });
        const problem = checkUserChange(
          { id: actor.id, role: actor.role, isActive: true },
          { id: target.id, role: target.role, isActive: target.isActive },
          { role: parsed.data.role, isActive: parsed.data.isActive },
          activeSuperadmins,
        );
        if (problem) return { error: problem };

        await tx.user.update({ where: { id }, data: parsed.data });
        // Conta desativada ou com função alterada perde as sessões abertas.
        if (!parsed.data.isActive || parsed.data.role !== target.role) {
          await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        }
        await audit(
          {
            userId: actor.id,
            action: "user.update",
            entity: "User",
            entityId: id,
            summary: `Alterou o usuário ${target.email}`,
            before: { role: target.role, isActive: target.isActive, name: target.name },
            after: { role: parsed.data.role, isActive: parsed.data.isActive, name: parsed.data.name },
          },
          tx,
        );
        return { ok: true, message: "Usuário atualizado." };
      },
      { isolationLevel: "Serializable" },
    );
  });
}

export async function revokeSessionsAction(id: string): Promise<ActionState> {
  return withPermission("users:manage", async (actor) => {
    const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
    if (!target) return { error: "Usuário não encontrado." };
    const result = await prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit({ userId: actor.id, action: "user.sessions.revoke", entity: "User", entityId: id, summary: `Revogou ${result.count} sessão(ões) de ${target.email}` });
    return { ok: true };
  });
}

/** Redefinição de senha por um superadministrador: grava a nova senha e encerra as sessões do usuário. */
export async function resetPasswordAction(id: string, formData: FormData): Promise<ActionState> {
  return withPermission("users:manage", async (actor) => {
    const parsed = passwordSchema.safeParse(String(formData.get("password") ?? ""));
    if (!parsed.success) return { error: "Revise os campos destacados.", fieldErrors: { password: parsed.error.issues.map((issue) => issue.message) } };
    const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
    if (!target) return { error: "Usuário não encontrado." };
    const passwordHash = await hashPassword(parsed.data);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash } });
      await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await audit({ userId: actor.id, action: "user.password.reset", entity: "User", entityId: id, summary: `Redefiniu a senha de ${target.email}` }, tx);
    });
    return { ok: true, message: "Senha redefinida e sessões encerradas." };
  });
}
