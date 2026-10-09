import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel } from "@/components/ui/admin";
import { Field } from "@/components/ui/field";
import { requirePagePermission } from "@/lib/auth/guard";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { ROLE_LABELS, ROLES } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { createUserAction } from "./actions";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsersPage() {
  await requirePagePermission("users:manage");
  const users = await prisma.user.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });

  return (
    <>
      <AdminHeading title="Usuários" description="Contas com acesso ao painel e suas funções." />
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Contas">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col" className="text-left">
                    Nome
                  </th>
                  <th scope="col">Função</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="text-left">
                      <Link href={`/admin/usuarios/${user.id}`} className="font-semibold hover:text-primary hover:underline">
                        {user.name}
                      </Link>
                      <span className="block text-xs text-gray-600">{user.email}</span>
                    </td>
                    <td>{ROLE_LABELS[user.role]}</td>
                    <td>
                      <span className={`badge ${user.isActive ? "badge-solid" : ""}`}>{user.isActive ? "Ativa" : "Desativada"}</span>
                    </td>
                    <td className="whitespace-nowrap">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Novo usuário">
          <ActionForm action={createUserAction} submitLabel="Criar usuário" className="space-y-4" resetOnSuccess>
            <Field name="name" label="Nome">
              <input id="name" name="name" className="input" required maxLength={120} />
            </Field>
            <Field name="email" label="E-mail">
              <input id="email" name="email" type="email" className="input" required autoComplete="off" />
            </Field>
            <Field name="role" label="Função">
              <select id="role" name="role" className="input" defaultValue="VIEWER">
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="password" label="Senha inicial" hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres. A pessoa pode trocá-la em "Minha conta".`}>
              <input id="password" name="password" type="password" className="input" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
            </Field>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
