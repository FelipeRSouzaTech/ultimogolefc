import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { BusinessError, type ActionState } from "@/lib/action";
import { can, type Permission, type Role } from "./permissions";
import { hashToken, readSessionToken } from "./session";

export type CurrentUser = { id: string; name: string; email: string; role: Role };

/** Usuário autenticado da requisição atual (memoizado por requisição). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role };
});

/** Para páginas: exige login, senão redireciona para a tela de entrada. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Para páginas: exige a permissão, senão volta ao painel com aviso. */
export async function requirePagePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/admin?negado=1");
  return user;
}

/**
 * Para Server Actions: verifica sessão e permissão NO SERVIDOR antes de executar a operação.
 * Erros de regra de negócio viram mensagem para o usuário; os demais são registrados e ocultados.
 */
export async function withPermission(
  permission: Permission,
  run: (user: CurrentUser) => Promise<ActionState>,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente." };
  if (!can(user.role, permission)) return { error: "Você não tem permissão para realizar esta operação." };
  try {
    return await run(user);
  } catch (error) {
    if (error instanceof BusinessError) return { error: error.message };
    console.error("[action] falha inesperada", error);
    return { error: "Não foi possível concluir a operação. Tente novamente." };
  }
}
