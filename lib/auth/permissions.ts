// Controle de acesso baseado em funções (RBAC). Módulo puro: sem acesso a banco ou a cookies.

export const ROLES = ["SUPERADMIN", "ADMIN", "EDITOR", "FOOTBALL_MANAGER", "TREASURER", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: "Superadministrador",
  ADMIN: "Administrador",
  EDITOR: "Editor",
  FOOTBALL_MANAGER: "Gestor de futebol",
  TREASURER: "Tesoureiro",
  VIEWER: "Consulta",
};

export const PERMISSIONS = [
  "dashboard:view",
  "news:read",
  "news:write",
  "news:publish",
  "news:delete",
  "football:read",
  "football:write",
  "football:delete",
  "content:read",
  "content:write",
  "media:upload",
  "instagram:publish",
  "messages:manage",
  "finance:read",
  "finance:write",
  "audit:read",
  "users:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

const MATRIX: Record<Role, readonly Permission[]> = {
  SUPERADMIN: ALL,
  // O administrador consulta o financeiro, mas só tesoureiro e superadministrador fazem lançamentos.
  ADMIN: ALL.filter((permission) => permission !== "users:manage" && permission !== "finance:write"),
  EDITOR: ["dashboard:view", "news:read", "news:write", "news:publish", "news:delete", "football:read", "content:read", "content:write", "media:upload", "instagram:publish"],
  FOOTBALL_MANAGER: ["dashboard:view", "football:read", "football:write", "football:delete", "news:read", "content:read", "media:upload"],
  // O tesoureiro usa só o portal financeiro (/financeiro); não entra no painel administrativo.
  TREASURER: ["finance:read", "finance:write"],
  VIEWER: ["dashboard:view", "news:read", "football:read", "content:read"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function permissionsOf(role: Role): readonly Permission[] {
  return MATRIX[role];
}

export const ADMIN_HOME = "/admin";
export const FINANCE_HOME = "/financeiro";

/**
 * Para onde vai cada função depois de entrar. `wanted` é o portal em que a pessoa fez login;
 * ele só é respeitado se a função tiver acesso a esse portal.
 */
export function homePathFor(role: Role, wanted: "admin" | "finance" = "admin"): string {
  const admin = can(role, "dashboard:view");
  const finance = can(role, "finance:read");
  if (wanted === "finance" && finance) return FINANCE_HOME;
  if (admin) return ADMIN_HOME;
  return finance ? FINANCE_HOME : ADMIN_HOME;
}
