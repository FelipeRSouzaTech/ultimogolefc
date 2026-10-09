import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import type { FormAction } from "@/lib/action";
import { utcToSaoPauloLocal } from "@/lib/datetime";
import { SPONSOR_TIERS, SPONSOR_TIER_LABELS } from "@/modules/sponsors/rules";

type Values = {
  name: string;
  tier: string;
  description: string | null;
  logoPath: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  sortOrder: number;
  isActive: boolean;
};

const dateValue = (date: Date | null | undefined) => (date ? utcToSaoPauloLocal(date).slice(0, 10) : "");

export function SponsorForm({ action, values }: { action: FormAction; values?: Values }) {
  return (
    <ActionForm action={action} submitLabel="Salvar patrocinador" className="space-y-4">
      <Field name="name" label="Nome">
        <input id="name" name="name" className="input" defaultValue={values?.name} required maxLength={100} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="tier" label="Categoria">
          <select id="tier" name="tier" className="input" defaultValue={values?.tier ?? "SUPPORTER"}>
            {SPONSOR_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {SPONSOR_TIER_LABELS[tier]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="sortOrder" label="Ordem de exibição" hint="Menor número aparece primeiro.">
          <input id="sortOrder" name="sortOrder" type="number" min={0} max={9999} className="input" defaultValue={values?.sortOrder ?? 0} />
        </Field>
        <Field name="startsAt" label="Início da vigência" hint="Opcional.">
          <input id="startsAt" name="startsAt" type="date" className="input" defaultValue={dateValue(values?.startsAt)} />
        </Field>
        <Field name="endsAt" label="Fim da vigência" hint="Opcional. Depois desta data, sai do portal automaticamente.">
          <input id="endsAt" name="endsAt" type="date" className="input" defaultValue={dateValue(values?.endsAt)} />
        </Field>
        <Field name="websiteUrl" label="Site" hint="Opcional. Endereço completo com https://.">
          <input id="websiteUrl" name="websiteUrl" type="url" className="input" defaultValue={values?.websiteUrl ?? ""} maxLength={200} />
        </Field>
        <Field name="instagramUrl" label="Instagram" hint="Opcional. Endereço completo com https://.">
          <input id="instagramUrl" name="instagramUrl" type="url" className="input" defaultValue={values?.instagramUrl ?? ""} maxLength={200} />
        </Field>
      </div>
      <Field name="logoPath" label="Logotipo (caminho da imagem)" hint="Opcional. Ex.: /brand/patrocinador.png. Sem imagem, é exibido o nome.">
        <input id="logoPath" name="logoPath" className="input" defaultValue={values?.logoPath ?? ""} maxLength={200} />
      </Field>
      <Field name="description" label="Descrição" hint="Opcional.">
        <textarea id="description" name="description" className="input" rows={3} defaultValue={values?.description ?? ""} />
      </Field>
      <label className="flex items-start gap-2 text-sm font-semibold">
        <input type="checkbox" name="isActive" defaultChecked={values?.isActive ?? false} className="mt-0.5 size-4 accent-primary" />
        <span>
          Ativo e autorizado para divulgação
          <span className="block font-normal text-gray-600">Só aparece no portal quando marcado e dentro da vigência.</span>
        </span>
      </label>
    </ActionForm>
  );
}
