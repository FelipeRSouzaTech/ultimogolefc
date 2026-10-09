import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import type { FormAction } from "@/lib/action";

type Values = { name: string; shortName: string | null; crestPath: string | null; isOwnClub: boolean };

export function ClubForm({ action, values }: { action: FormAction; values?: Values }) {
  return (
    <ActionForm action={action} submitLabel="Salvar clube" className="space-y-4">
      <Field name="name" label="Nome">
        <input id="name" name="name" className="input" defaultValue={values?.name} required maxLength={80} />
      </Field>
      <Field name="shortName" label="Nome curto" hint="Opcional.">
        <input id="shortName" name="shortName" className="input" defaultValue={values?.shortName ?? ""} maxLength={20} />
      </Field>
      <Field name="crestPath" label="Escudo (caminho da imagem)" hint="Opcional. Ex.: /brand/escudo.png. O envio de imagens pelo painel chega na etapa de mídia; sem imagem, são exibidas as iniciais.">
        <input id="crestPath" name="crestPath" className="input" defaultValue={values?.crestPath ?? ""} maxLength={200} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="isOwnClub" defaultChecked={values?.isOwnClub ?? false} className="size-4 accent-primary" />
        Este é o nosso clube (destacado nas tabelas e na página inicial)
      </label>
    </ActionForm>
  );
}
