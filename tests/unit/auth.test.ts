import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { can, isRole, permissionsOf, PERMISSIONS, ROLES } from "@/lib/auth/permissions";
import { checkUserChange, type UserSnapshot } from "@/modules/users/rules";
import { createUserSchema, loginSchema } from "@/lib/validation/auth";

describe("senhas", () => {
  it("gera hash diferente do texto e valida a senha correta", async () => {
    const hash = await hashPassword("uma-senha-bem-longa");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash.includes("uma-senha-bem-longa")).toBe(false);
    expect(await verifyPassword("uma-senha-bem-longa", hash)).toBe(true);
    expect(await verifyPassword("outra-senha-qualquer", hash)).toBe(false);
  });

  it("usa sal aleatório: a mesma senha gera hashes diferentes", async () => {
    const [a, b] = await Promise.all([hashPassword("senha-repetida-123"), hashPassword("senha-repetida-123")]);
    expect(a === b).toBe(false);
  });

  it("recusa hash malformado sem lançar erro", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "texto-puro")).toBe(false);
    expect(await verifyPassword("x", "scrypt$0$8$1$$")).toBe(false);
  });
});

describe("permissões (RBAC)", () => {
  it("superadministrador tem todas as permissões", () => {
    expect(PERMISSIONS.every((permission) => can("SUPERADMIN", permission))).toBe(true);
  });

  it("apenas o superadministrador gerencia usuários", () => {
    for (const role of ROLES) {
      expect(can(role, "users:manage")).toBe(role === "SUPERADMIN");
    }
  });

  it("editor cuida de notícias e só consulta o futebol", () => {
    expect(can("EDITOR", "news:write")).toBe(true);
    expect(can("EDITOR", "news:publish")).toBe(true);
    expect(can("EDITOR", "football:read")).toBe(true);
    expect(can("EDITOR", "football:write")).toBe(false);
  });

  it("gestor de futebol cuida de partidas e só consulta notícias", () => {
    expect(can("FOOTBALL_MANAGER", "football:write")).toBe(true);
    expect(can("FOOTBALL_MANAGER", "news:read")).toBe(true);
    expect(can("FOOTBALL_MANAGER", "news:write")).toBe(false);
  });

  it("perfil de consulta não altera nada", () => {
    const writes = permissionsOf("VIEWER").filter((permission) => !permission.endsWith(":read") && permission !== "dashboard:view");
    expect(writes).toEqual([]);
  });

  it("valida nomes de função", () => {
    expect(isRole("EDITOR")).toBe(true);
    expect(isRole("ROOT")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("checkUserChange", () => {
  const root: UserSnapshot = { id: "1", role: "SUPERADMIN", isActive: true };
  const other: UserSnapshot = { id: "2", role: "EDITOR", isActive: true };

  it("permite ao superadministrador alterar outro usuário", () => {
    expect(checkUserChange(root, other, { role: "ADMIN" }, 1)).toBeNull();
    expect(checkUserChange(root, other, { isActive: false }, 1)).toBeNull();
  });

  it("impede quem não é superadministrador, inclusive elevar o próprio privilégio", () => {
    expect(checkUserChange(other, other, { role: "SUPERADMIN" }, 1)).toBeTruthy();
    expect(checkUserChange({ id: "3", role: "ADMIN", isActive: true }, other, { role: "VIEWER" }, 1)).toBeTruthy();
  });

  it("impede alterar a própria função ou desativar a própria conta", () => {
    expect(checkUserChange(root, root, { role: "ADMIN" }, 2)).toBeTruthy();
    expect(checkUserChange(root, root, { isActive: false }, 2)).toBeTruthy();
  });

  it("impede remover o último superadministrador ativo", () => {
    const second: UserSnapshot = { id: "9", role: "SUPERADMIN", isActive: true };
    expect(checkUserChange(root, second, { isActive: false }, 1)).toBeTruthy();
    expect(checkUserChange(root, second, { role: "EDITOR" }, 1)).toBeTruthy();
    expect(checkUserChange(root, second, { isActive: false }, 2)).toBeNull();
  });
});

describe("validação de acesso", () => {
  it("normaliza o e-mail no login", () => {
    const parsed = loginSchema.safeParse({ email: "  Pessoa@Exemplo.COM ", password: "x" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("pessoa@exemplo.com");
  });

  it("exige senha com pelo menos 12 caracteres ao criar usuário", () => {
    const base = { name: "Pessoa", email: "pessoa@exemplo.com", role: "EDITOR" };
    expect(createUserSchema.safeParse({ ...base, password: "curta" }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...base, password: "senha-longa-ok" }).success).toBe(true);
    expect(createUserSchema.safeParse({ ...base, role: "DONO", password: "senha-longa-ok" }).success).toBe(false);
  });
});
