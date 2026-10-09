"use server";

import { prisma } from "@/lib/db/prisma";
import type { ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";

export async function toggleMessageReadAction(id: string): Promise<ActionState> {
  return withPermission("messages:manage", async () => {
    const message = await prisma.contactMessage.findUnique({ where: { id }, select: { isRead: true } });
    if (!message) return { error: "Mensagem não encontrada." };
    await prisma.contactMessage.update({ where: { id }, data: { isRead: !message.isRead } });
    return { ok: true };
  });
}

export async function deleteMessageAction(id: string): Promise<ActionState> {
  return withPermission("messages:manage", async (user) => {
    const message = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!message) return { error: "Mensagem não encontrada." };
    await prisma.contactMessage.delete({ where: { id } });
    // O resumo não inclui dados pessoais do remetente.
    await audit({ userId: user.id, action: "message.delete", entity: "ContactMessage", entityId: id, summary: "Excluiu uma mensagem de contato" });
    return { ok: true };
  });
}
