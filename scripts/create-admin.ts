/**
 * Cria o primeiro superadministrador (ou outro, quando necessário).
 *
 * Uso interativo:   npm run admin:create
 * Uso por variáveis: ADMIN_NAME="Nome" ADMIN_EMAIL="email@dominio" ADMIN_PASSWORD="..." npm run admin:create
 *
 * Nenhuma senha fica gravada no código ou no seed: ela é informada na hora e só o hash vai para o banco.
 */
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { MIN_PASSWORD_LENGTH } from "../lib/auth/password-policy";

const prisma = new PrismaClient();

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const name = process.env.ADMIN_NAME?.trim() || (await ask("Nome: "));
  const email = (process.env.ADMIN_EMAIL?.trim() || (await ask("E-mail: "))).toLowerCase();
  const password = process.env.ADMIN_PASSWORD || (await ask(`Senha (mínimo ${MIN_PASSWORD_LENGTH} caracteres; ficará visível ao digitar): `));

  if (name.length < 2) throw new Error("Informe o nome.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  if (await prisma.user.findUnique({ where: { email } })) throw new Error("Já existe um usuário com este e-mail.");

  const user = await prisma.user.create({
    data: { name, email, role: "SUPERADMIN", passwordHash: await hashPassword(password) },
  });
  await prisma.auditLog.create({
    data: { action: "user.create", entity: "User", entityId: user.id, summary: `Superadministrador ${email} criado pelo script de instalação` },
  });
  console.log(`Superadministrador criado: ${email}. Acesse /admin/login.`);
}

main()
  .catch((error) => {
    console.error(`Erro: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
