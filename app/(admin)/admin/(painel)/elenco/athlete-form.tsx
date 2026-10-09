import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import type { FormAction } from "@/lib/action";
import { POSITIONS, POSITION_LABELS } from "@/modules/squad/rules";

type Values = {
  name: string;
  nickname: string | null;
  position: string;
  shirtNumber: number | null;
  bio: string | null;
  photoPath: string | null;
  status: string;
  isPublished: boolean;
};

export function AthleteForm({ action, values }: { action: FormAction; values?: Values }) {
  return (
    <ActionForm action={action} submitLabel="Salvar jogador" className="space-y-4">
      <Field name="name" label="Nome">
        <input id="name" name="name" className="input" defaultValue={values?.name} required maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="nickname" label="Apelido esportivo" hint="Opcional. Quando preenchido, é o nome exibido no portal.">
          <input id="nickname" name="nickname" className="input" defaultValue={values?.nickname ?? ""} maxLength={60} />
        </Field>
        <Field name="shirtNumber" label="Número da camisa" hint="Opcional.">
          <input id="shirtNumber" name="shirtNumber" className="input" inputMode="numeric" pattern="[0-9]*" maxLength={2} defaultValue={values?.shirtNumber ?? ""} />
        </Field>
        <Field name="position" label="Posição">
          <select id="position" name="position" className="input" defaultValue={values?.position ?? "GOALKEEPER"}>
            {POSITIONS.map((position) => (
              <option key={position} value={position}>
                {POSITION_LABELS[position]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="status" label="Situação no elenco">
          <select id="status" name="status" className="input" defaultValue={values?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </Field>
      </div>
      <Field name="photoPath" label="Foto (caminho da imagem)" hint="Opcional. Ex.: /brand/jogador.png. Sem foto, são exibidas as iniciais.">
        <input id="photoPath" name="photoPath" className="input" defaultValue={values?.photoPath ?? ""} maxLength={200} />
      </Field>
      <Field name="bio" label="Biografia" hint="Opcional.">
        <textarea id="bio" name="bio" className="input" rows={5} defaultValue={values?.bio ?? ""} />
      </Field>
      <label className="flex items-start gap-2 text-sm font-semibold">
        <input type="checkbox" name="isPublished" defaultChecked={values?.isPublished ?? false} className="mt-0.5 size-4 accent-primary" />
        <span>
          Divulgação autorizada
          <span className="block font-normal text-gray-600">Marque somente se a pessoa autorizou a publicação do nome e da imagem no portal.</span>
        </span>
      </label>
    </ActionForm>
  );
}
