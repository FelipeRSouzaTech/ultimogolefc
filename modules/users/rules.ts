// Regras de gestão de usuários. Módulo puro.
import type { Role } from "@/lib/auth/permissions";

export type UserSnapshot = { id: string; role: Role; isActive: boolean };

export type UserChange = { role?: Role; isActive?: boolean };

/**
 * Verifica se `actor` pode aplicar `change` em `target`.
 * Devolve a mensagem de erro, ou null quando a alteração é permitida.
 * `activeSuperadmins` é a quantidade atual de superadministradores ativos.
 */
export function checkUserChange(
  actor: UserSnapshot,
  target: UserSnapshot,
  change: UserChange,
  activeSuperadmins: number,
): string | null {
  if (actor.role !== "SUPERADMIN" || !actor.isActive) {
    return "Somente superadministradores podem gerenciar usuários.";
  }
  const nextRole = change.role ?? target.role;
  const nextActive = change.isActive ?? target.isActive;
  const isSelf = actor.id === target.id;

  if (isSelf && nextRole !== target.role) {
    return "Você não pode alterar a sua própria função.";
  }
  if (isSelf && !nextActive) {
    return "Você não pode desativar a sua própria conta.";
  }
  const wasActiveSuperadmin = target.role === "SUPERADMIN" && target.isActive;
  const staysActiveSuperadmin = nextRole === "SUPERADMIN" && nextActive;
  if (wasActiveSuperadmin && !staysActiveSuperadmin && activeSuperadmins <= 1) {
    return "Não é possível remover o último superadministrador ativo.";
  }
  return null;
}
