import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import type { FormAction } from "@/lib/action";

type Values = { name: string; description: string | null; isActive: boolean };

export function CompetitionForm({ action, values }: { action: FormAction; values?: Values }) {
  return (
    <ActionForm action={action} submitLabel="Salvar competição" className="space-y-4">
      <Field name="name" label="Nome">
        <input id="name" name="name" className="input" defaultValue={values?.name} required maxLength={100} />
      </Field>
      <Field name="description" label="Descrição" hint="Opcional.">
        <textarea id="description" name="description" className="input" rows={4} defaultValue={values?.description ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="isActive" defaultChecked={values?.isActive ?? true} className="size-4 accent-primary" />
        Competição ativa
      </label>
    </ActionForm>
  );
}
