import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field } from "@/components/ui/field";
import { requirePagePermission } from "@/lib/auth/guard";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { ROLE_LABELS, ROLES } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { resetPasswordAction, revokeSessionsAction, updateUserAction } from "../actions";

export const metadata: Metadata = { title: "Editar usuário" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePagePermission("users:manage");
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();
  const openSessions = await prisma.session.count({ where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } } });
  const isSelf = actor.id === user.id;

  return (
    <>
      <AdminHeading title={user.name} description={`${user.email} · último acesso: ${user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "nunca"}`}>
        <Link href="/admin/usuarios" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
      </AdminHeading>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Dados e função">
          {isSelf ? <p className="alert alert-info mb-4">Esta é a sua conta: você não pode alterar a própria função nem desativá-la.</p> : null}
          <ActionForm action={updateUserAction.bind(null, user.id)} submitLabel="Salvar usuário" className="space-y-4">
            <Field name="name" label="Nome">
              <input id="name" name="name" className="input" defaultValue={user.name} required maxLength={120} />
            </Field>
            <Field name="role" label="Função">
              <select id="role" name="role" className="input" defaultValue={user.role}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="isActive" defaultChecked={user.isActive} className="size-4 accent-primary" />
              Conta ativa
            </label>
          </ActionForm>
        </Panel>

        <div className="space-y-6">
          <Panel title="Sessões">
            <p className="mb-4 text-sm text-gray-600">{openSessions} sessão(ões) aberta(s).</p>
            <ConfirmButton
              action={revokeSessionsAction.bind(null, user.id)}
              label="Revogar sessões"
              confirmMessage={isSelf ? "Encerrar todas as suas sessões? Você precisará entrar novamente." : `Encerrar todas as sessões de ${user.name}?`}
            />
          </Panel>
          {isSelf ? null : (
            <Panel title="Redefinir senha">
              <ActionForm action={resetPasswordAction.bind(null, user.id)} submitLabel="Redefinir senha" submitClassName="btn btn-secondary">
                <Field name="password" label="Nova senha" hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres. As sessões abertas serão encerradas.`}>
                  <input id="password" name="password" type="password" className="input" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
                </Field>
              </ActionForm>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
