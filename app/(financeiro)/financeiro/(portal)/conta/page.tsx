import type { Metadata } from "next";
import { changeOwnPasswordAction } from "@/app/(admin)/admin/actions";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel } from "@/components/ui/admin";
import { Field } from "@/components/ui/field";
import { requireFinance } from "@/lib/auth/finance-guard";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { ROLE_LABELS } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "Minha conta" };

export default async function FinanceAccountPage() {
  const user = await requireFinance();
  return (
    <>
      <AdminHeading title="Minha conta" description={`${user.email} · ${ROLE_LABELS[user.role]}`} />
      <Panel title="Alterar senha" className="max-w-lg">
        <ActionForm action={changeOwnPasswordAction} submitLabel="Alterar senha" className="space-y-4">
          <Field name="currentPassword" label="Senha atual">
            <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className="input" />
          </Field>
          <Field name="newPassword" label="Nova senha" hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`}>
            <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className="input" />
          </Field>
          <Field name="confirmPassword" label="Confirmar nova senha">
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className="input" />
          </Field>
        </ActionForm>
      </Panel>
    </>
  );
}
