import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import type { FormAction } from "@/lib/action";
import { ATHLETE_CATEGORIES, ATHLETE_CATEGORY_LABELS, TECHNICAL_STAFF_ROLES, TECHNICAL_STAFF_ROLE_LABELS } from "@/modules/squad/rules";

type Values = {
  name: string;
  nickname: string | null;
  role: string;
  seasonIds: string[];
  status: string;
  categories: string[];
  sortOrder: number;
  isPublished: boolean;
};

export function TechnicalStaffForm({
  action,
  values,
  seasonOptions,
}: {
  action: FormAction;
  values?: Values;
  seasonOptions: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={action} submitLabel={values ? "Salvar" : "Adicionar"} className="space-y-4" resetOnSuccess={!values}>
      <Field name="name" label="Nome">
        <input id="name" name="name" className="input" defaultValue={values?.name} required maxLength={120} />
      </Field>

      <Field name="nickname" label="Apelido" hint="Opcional.">
        <input id="nickname" name="nickname" className="input" defaultValue={values?.nickname ?? ""} maxLength={60} />
      </Field>

      <Field name="role" label="Função">
        <select id="role" name="role" className="input" defaultValue={values?.role ?? "HEAD_COACH"} required>
          {TECHNICAL_STAFF_ROLES.map((role) => (
            <option key={role} value={role}>
              {TECHNICAL_STAFF_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </Field>

      <Field name="seasonIds" label="Campeonatos/Temporadas" hint="Selecione uma ou mais (Ctrl+clique para múltipla seleção).">
        <select id="seasonIds" name="seasonIds" className="input" multiple defaultValue={values?.seasonIds} required>
          {seasonOptions.map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="status" label="Situação">
          <select id="status" name="status" className="input" defaultValue={values?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </Field>

        <Field name="sortOrder" label="Ordem" hint="Menor número aparece primeiro.">
          <input id="sortOrder" name="sortOrder" type="number" min={0} max={9999} className="input" defaultValue={values?.sortOrder ?? 0} />
        </Field>
      </div>

      <Field name="categories" label="Categorias" hint="Selecione uma ou mais categorias (Ctrl+clique para múltipla seleção).">
        <select id="categories" name="categories" className="input" multiple defaultValue={values?.categories} required>
          {ATHLETE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {ATHLETE_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex items-start gap-2 text-sm font-semibold">
        <input type="checkbox" name="isPublished" defaultChecked={values?.isPublished ?? false} className="mt-0.5 size-4 accent-primary" />
        <span>
          Divulgação autorizada
          <span className="block font-normal text-gray-600">Marque somente se a pessoa autorizou a publicação do nome no portal.</span>
        </span>
      </label>
    </ActionForm>
  );
}