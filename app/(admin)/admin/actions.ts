"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isLoginBlocked, recordLoginAttempt, WINDOW_MINUTES } from "@/lib/auth/rate-limit";
import { clientInfo, createSession, destroyCurrentSession, revokeUserSessions } from "@/lib/auth/session";
import { loginSchema, passwordSchema } from "@/lib/validation/auth";

const INVALID = "E-mail ou senha inválidos.";

// Hash usado quando o e-mail não existe, para que a resposta leve o mesmo tempo nos dois casos.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("senha-inexistente-apenas-para-tempo"));

export async function loginAction(formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: field(formData, "email"), password: formData.get("password") ?? "" });
  if (!parsed.success) return zodErrorState(parsed.error);
  const { email, password } = parsed.data;

  try {
    const { ipAddress } = await clientInfo();
    if (await isLoginBlocked(email, ipAddress)) {
      return { error: `Muitas tentativas de acesso. Aguarde ${WINDOW_MINUTES} minutos e tente novamente.` };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !user.isActive || !valid) {
      await recordLoginAttempt(email, ipAddress, false);
      return { error: INVALID };
    }

    await recordLoginAttempt(email, ipAddress, true);
    await createSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit({ userId: user.id, action: "auth.login", entity: "User", entityId: user.id });
    return { ok: true, redirectTo: "/admin" };
  } catch (error) {
    console.error("[auth] falha no login", error);
    return { error: "Não foi possível entrar agora. Tente novamente em instantes." };
  }
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  await destroyCurrentSession();
  if (user) await audit({ userId: user.id, action: "auth.logout", entity: "User", entityId: user.id });
  redirect("/admin/login");
}

/** Troca da própria senha: exige a senha atual e encerra as demais sessões. */
export async function changeOwnPasswordAction(formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente." };

  const current = String(formData.get("currentPassword") ?? "");
  const parsed = passwordSchema.safeParse(String(formData.get("newPassword") ?? ""));
  if (!parsed.success) return { error: "Revise os campos destacados.", fieldErrors: { newPassword: parsed.error.issues.map((issue) => issue.message) } };
  if (parsed.data !== String(formData.get("confirmPassword") ?? "")) {
    return { error: "Revise os campos destacados.", fieldErrors: { confirmPassword: ["A confirmação não confere com a nova senha."] } };
  }

  try {
    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record || !(await verifyPassword(current, record.passwordHash))) {
      return { error: "Revise os campos destacados.", fieldErrors: { currentPassword: ["Senha atual incorreta."] } };
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data) } });
    await revokeUserSessions(user.id);
    await createSession(user.id);
    await audit({ userId: user.id, action: "user.password.change", entity: "User", entityId: user.id });
    return { ok: true, message: "Senha alterada. As outras sessões foram encerradas." };
  } catch (error) {
    console.error("[auth] falha ao trocar senha", error);
    return { error: "Não foi possível alterar a senha. Tente novamente." };
  }
}
