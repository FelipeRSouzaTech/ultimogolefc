import { ActionForm } from "@/components/ui/action-form";
import type { FormAction } from "@/lib/action";
import { MANUAL_FIELDS, MANUAL_FIELD_LABELS, type ManualRow } from "@/modules/competitions/manual";

type Props = { action: FormAction; rows: (ManualRow & { clubName: string })[] };

const FULL_LABELS: Record<string, string> = {
  position: "Posição",
  played: "Jogos",
  wins: "Vitórias",
  draws: "Empates",
  losses: "Derrotas",
  goalsFor: "Gols pró",
  goalsAgainst: "Gols contra",
  points: "Pontos",
};

/** Formulário da classificação manual: uma linha por participante. */
export function ManualStandingsForm({ action, rows }: Props) {
  return (
    <ActionForm action={action} submitLabel="Salvar classificação">
      <div className="overflow-x-auto">
        <table className="table">
          <caption className="sr-only">Classificação digitada manualmente</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">
                Time
              </th>
              {MANUAL_FIELDS.map((name) => (
                <th key={name} scope="col">
                  <abbr title={FULL_LABELS[name]}>{MANUAL_FIELD_LABELS[name]}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.clubId}>
                <th scope="row" className="text-left font-semibold normal-case tracking-normal text-black">
                  {row.clubName}
                </th>
                {MANUAL_FIELDS.map((name) => (
                  <td key={name}>
                    <input
                      name={`${row.clubId}.${name}`}
                      aria-label={`${FULL_LABELS[name]} de ${row.clubName}`}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      defaultValue={row[name]}
                      className="input min-w-14 px-2 text-center"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">O saldo de gols é calculado a partir de GP e GC. Os jogos devem ser a soma de vitórias, empates e derrotas.</p>
    </ActionForm>
  );
}
