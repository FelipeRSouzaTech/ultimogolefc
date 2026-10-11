import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { ImageField } from "@/components/ui/image-field";
import type { FormAction } from "@/lib/action";

type Props = { action: FormAction; defaultLabel: string; values: { name: string | null; coverPath: string | null } };

export function TeamForm({ action, defaultLabel, values }: Props) {
  return (
    <ActionForm action={action} submitLabel="Salvar equipe" className="space-y-4">
      <Field name="name" label="Nome de exibição" hint={`Opcional. Em branco, o site usa o nome padrão: ${defaultLabel}.`}>
        <input id="name" name="name" className="input" defaultValue={values.name ?? ""} maxLength={40} placeholder={defaultLabel} />
      </Field>
      <ImageField
        name="coverPath"
        label="Imagem do cartão"
        defaultValue={values.coverPath}
        hint="Opcional. Tamanho recomendado: 500×600 px (retrato). PNG, JPG ou WebP, até 5 MB. Sem imagem, o cartão mostra só o nome sobre o fundo azul."
      />
    </ActionForm>
  );
}
