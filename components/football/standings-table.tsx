import type { StandingRowView } from "@/modules/competitions/service";
import { ClubCrest } from "./club-crest";

type Props = { rows: StandingRowView[]; mode: "AUTO" | "MANUAL"; caption: string; compact?: boolean };

/** Tabela de classificação. A linha do nosso clube é destacada por fundo, peso e marca lateral. */
export function StandingsTable({ rows, mode, caption, compact = false }: Props) {
  const extra = compact ? "hidden" : "hidden sm:table-cell";
  return (
    <div>
      <table className="table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">
              <abbr title="Posição">Pos</abbr>
            </th>
            <th scope="col" className="text-left">
              Time
            </th>
            <th scope="col">
              <abbr title="Pontos">Pts</abbr>
            </th>
            <th scope="col">
              <abbr title="Jogos">J</abbr>
            </th>
            <th scope="col">
              <abbr title="Vitórias">V</abbr>
            </th>
            <th scope="col">
              <abbr title="Empates">E</abbr>
            </th>
            <th scope="col">
              <abbr title="Derrotas">D</abbr>
            </th>
            <th scope="col" className={extra}>
              <abbr title="Gols pró">GP</abbr>
            </th>
            <th scope="col" className={extra}>
              <abbr title="Gols contra">GC</abbr>
            </th>
            <th scope="col">
              <abbr title="Saldo de gols">SG</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.teamId} className={row.isOwnClub ? "is-own" : undefined}>
              <td>{row.position}</td>
              <td className="text-left">
                <span className="flex items-center gap-2">
                  <ClubCrest name={row.teamName} crestPath={row.crestPath} size={24} />
                  <span>{row.teamName}</span>
                  {row.isOwnClub ? <span className="sr-only">(nosso clube)</span> : null}
                </span>
              </td>
              <td className="font-bold">{row.points}</td>
              <td>{row.played}</td>
              <td>{row.wins}</td>
              <td>{row.draws}</td>
              <td>{row.losses}</td>
              <td className={extra}>{row.goalsFor}</td>
              <td className={extra}>{row.goalsAgainst}</td>
              <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint mt-3">
        {mode === "AUTO"
          ? "Classificação calculada automaticamente a partir das partidas encerradas."
          : "Classificação informada manualmente pela administração do clube."}
      </p>
    </div>
  );
}
