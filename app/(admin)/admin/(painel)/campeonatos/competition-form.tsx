import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { ImageField } from "@/components/ui/image-field";
import type { FormAction } from "@/lib/action";

type Values = { name: string; description: string | null; coverPath: string | null; isActive: boolean };

export function CompetitionForm({ action, values }: { action: FormAction; values?: Values }) {
  return (
    <ActionForm action={action} submitLabel="Salvar campeonato" className="space-y-4">
      <Field name="name" label="Nome">
        <input id="name" name="name" className="input" defaultValue={values?.name} required maxLength={100} />
      </Field>
      <Field name="description" label="Descrição" hint="Opcional.">
        <textarea id="description" name="description" className="input" rows={4} defaultValue={values?.description ?? ""} />
      </Field>
      <ImageField
        name="coverPath"
        label="Imagem do cartão"
        defaultValue={values?.coverPath}
        hint="Opcional. Tamanho recomendado: 500×600 px (retrato). PNG, JPG ou WebP, até 5 MB. Sem imagem, o cartão mostra o nome do campeonato."
      />
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="isActive" defaultChecked={values?.isActive ?? true} className="size-4 accent-primary" />
        Campeonato ativo
      </label>
    </ActionForm>
  );
}