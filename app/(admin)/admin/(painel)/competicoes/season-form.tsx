import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import type { FormAction } from "@/lib/action";
import { DEFAULT_RULES, TIEBREAKERS, TIEBREAKER_LABELS } from "@/modules/competitions/standings";

type Values = {
  label: string;
  regulation: string | null;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakers: string[];
  standingsMode: string;
  isCurrent: boolean;
};

export function SeasonForm({ action, values, submitLabel }: { action: FormAction; values?: Values; submitLabel: string }) {
  const tiebreakers = values?.tiebreakers ?? [...DEFAULT_RULES.tiebreakers];
  return (
    <ActionForm action={action} submitLabel={submitLabel} className="space-y-5">
      <Field name="label" label="Temporada" hint="Ex.: 2026 ou 2026 — 1º turno.">
        <input id="label" name="label" className="input" defaultValue={values?.label} required maxLength={30} />
      </Field>
      <fieldset>
        <legend className="label">Pontuação</legend>
        <div className="grid grid-cols-3 gap-3">
          <Field name="pointsWin" label="Vitória">
            <input id="pointsWin" name="pointsWin" type="number" min={0} max={10} className="input" defaultValue={values?.pointsWin ?? DEFAULT_RULES.pointsWin} required />
          </Field>
          <Field name="pointsDraw" label="Empate">
            <input id="pointsDraw" name="pointsDraw" type="number" min={0} max={10} className="input" defaultValue={values?.pointsDraw ?? DEFAULT_RULES.pointsDraw} required />
          </Field>
          <Field name="pointsLoss" label="Derrota">
            <input id="pointsLoss" name="pointsLoss" type="number" min={0} max={10} className="input" defaultValue={values?.pointsLoss ?? DEFAULT_RULES.pointsLoss} required />
          </Field>
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Critérios de desempate, em ordem</legend>
        <p className="hint mb-3">Aplicados depois dos pontos. Deixe em branco os que não forem usados; persistindo o empate, vale a ordem alfabética.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4, 5].map((position) => (
            <div key={position}>
              <label className="label" htmlFor={`tiebreaker${position}`}>
                {position}º critério
              </label>
              <select id={`tiebreaker${position}`} name={`tiebreaker${position}`} className="input" defaultValue={tiebreakers[position - 1] ?? ""}>
                <option value="">Nenhum</option>
                {TIEBREAKERS.map((item) => (
                  <option key={item} value={item}>
                    {TIEBREAKER_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </fieldset>
      <Field name="standingsMode" label="Modo da classificação" hint="No modo manual a tabela não é calculada; o portal informa que os valores foram digitados pela administração.">
        <select id="standingsMode" name="standingsMode" className="input" defaultValue={values?.standingsMode ?? "AUTO"}>
          <option value="AUTO">Automática (calculada pelas partidas encerradas)</option>
          <option value="MANUAL">Manual</option>
        </select>
      </Field>
      <Field name="regulation" label="Regulamento" hint="Opcional. Texto exibido na página da competição.">
        <textarea id="regulation" name="regulation" className="input" rows={6} defaultValue={values?.regulation ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="isCurrent" defaultChecked={values?.isCurrent ?? false} className="size-4 accent-primary" />
        Temporada em andamento (pode aparecer na página inicial)
      </label>
    </ActionForm>
  );
}
