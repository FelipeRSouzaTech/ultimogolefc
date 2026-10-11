import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { ImageField } from "@/components/ui/image-field";
import type { FormAction } from "@/lib/action";
import { DIRECTOR_ROLES, DIRECTOR_ROLE_LABELS, DIRECTOR_STATUSES, DIRECTOR_STATUS_LABELS } from "@/modules/finance/rules";

type Values = { name: string; role: string; status: string; photoPath: string | null };

export function DirectorForm({ action, values }: { action: FormAction; values?: Values }) {
  return (
    <ActionForm action={action} submitLabel="Salvar diretor" className="space-y-4">
      <Field name="name" label="Nome">
        <input id="name" name="name" className="input" defaultValue={values?.name} required maxLength={120} />
      </Field>
      <Field name="role" label="Função">
        <select id="role" name="role" className="input" defaultValue={values?.role} required>
          <option value="">Selecione a função</option>
          {DIRECTOR_ROLES.map((role) => (
            <option key={role} value={role}>
              {DIRECTOR_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </Field>
      <Field name="status" label="Situação" hint="Só diretores com situação Ativo entram na geração das mensalidades.">
        <select id="status" name="status" className="input" defaultValue={values?.status ?? "ACTIVE"}>
          {DIRECTOR_STATUSES.map((status) => (
            <option key={status} value={status}>
              {DIRECTOR_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>
      <ImageField name="photoPath" label="Foto" defaultValue={values?.photoPath} hint="Opcional. PNG, JPG ou WebP, até 5 MB. Sem foto, são exibidas as iniciais." />
    </ActionForm>
  );
}
