import "server-only";

import { prisma } from "@/lib/db/prisma";

export const MAX_FAILED_ATTEMPTS = 5;
export const WINDOW_MINUTES = 15;

/** Proteção contra força bruta: bloqueia após muitas falhas recentes para o mesmo e-mail ou IP. */
export async function isLoginBlocked(email: string, ipAddress: string | null): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const [byEmail, byIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } }),
    ipAddress
      ? prisma.loginAttempt.count({ where: { ipAddress, success: false, createdAt: { gte: since } } })
      : Promise.resolve(0),
  ]);
  return byEmail >= MAX_FAILED_ATTEMPTS || byIp >= MAX_FAILED_ATTEMPTS * 4;
}

export async function recordLoginAttempt(email: string, ipAddress: string | null, success: boolean): Promise<void> {
  await prisma.loginAttempt.create({ data: { email, ipAddress, success } });
}
