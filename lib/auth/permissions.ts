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
  EDITOR: ["dashboard:view", "news:read", "news:write", "news:publish", "news:delete", "football:read", "content:read", "content:write", "media:upload"],
  FOOTBALL_MANAGER: ["dashboard:view", "football:read", "football:write", "football:delete", "news:read", "content:read", "media:upload"],
  TREASURER: ["dashboard:view", "finance:read", "finance:write"],
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
