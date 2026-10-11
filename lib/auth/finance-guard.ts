import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./guard";
import { can } from "./permissions";

/**
 * Guarda das páginas do portal financeiro. Sem sessão, vai para a entrada do financeiro;
 * com sessão mas sem permissão, vai para a mesma tela, que explica a falta de acesso.
 */
export async function requireFinance(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/financeiro/login");
  if (!can(user.role, "finance:read")) redirect("/financeiro/login?negado=1");
  return user;
}
