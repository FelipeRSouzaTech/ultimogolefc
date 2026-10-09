import { ActionForm } from "@/components/ui/action-form";
import { Panel } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field } from "@/components/ui/field";
import { prisma } from "@/lib/db/prisma";
import { EVENT_TYPES, EVENT_TYPE_LABELS, formatMinute, goalsMismatch, sortEvents, type EventType } from "@/modules/matches/events";
import type { MatchWithTeams } from "@/modules/matches/service";
import { displayName, POSITION_LABELS, type Position } from "@/modules/squad/rules";
import { addMatchEventAction, removeMatchEventAction, setLineupAction } from "../actions";

/** Lances e escalação da partida, no painel. */
export async function MatchDetails({ match, canWrite }: { match: MatchWithTeams; canWrite: boolean }) {
  const ownPlays = match.homeTeam.isOwnClub || match.awayTeam.isOwnClub;
  const [events, lineup, athletes] = await Promise.all([
    prisma.matchEvent.findMany({ where: { matchId: match.id }, include: { athlete: true, club: true } }),
    prisma.matchLineupPlayer.findMany({ where: { matchId: match.id } }),
    // Em partidas sem o nosso clube a consulta não traz ninguém (take: 0).
    prisma.athlete.findMany({ where: { status: "ACTIVE" }, orderBy: [{ position: "asc" }, { shirtNumber: "asc" }, { name: "asc" }], take: ownPlays ? undefined : 0 }),
  ]);
  const ordered = sortEvents(events);
  const warning = goalsMismatch(events, match);
  const roleOf = new Map(lineup.map((entry) => [entry.athleteId, entry.role as string]));

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Panel title="Lances da partida">
        {warning ? (
          <p className="alert alert-info mb-4" role="status">
            {warning}
          </p>
        ) : null}
        {ordered.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum lance registrado. O registro é opcional e não altera o placar.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {ordered.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>
                  <span className="inline-block w-10 font-display font-extrabold text-primary">{formatMinute(event.minute)}</span>
                  <span className="font-semibold">{EVENT_TYPE_LABELS[event.type as EventType]}</span>
                  {" · "}
                  {event.playerName ?? (event.athlete ? displayName(event.athlete) : "Jogador não informado")}
                  <span className="text-gray-600"> ({event.club.name})</span>
                  {event.note ? <span className="block pl-10 text-gray-600">{event.note}</span> : null}
                </span>
                {canWrite ? <ConfirmButton action={removeMatchEventAction.bind(null, event.id)} label="Remover" confirmMessage="Remover este lance?" /> : null}
              </li>
            ))}
          </ul>
        )}

        {canWrite ? (
          <div className="mt-5 border-t border-gray-100 pt-5">
            <h3 className="mb-3 text-base uppercase">Novo lance</h3>
            <ActionForm action={addMatchEventAction.bind(null, match.id)} submitLabel="Registrar lance" className="space-y-4" resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field name="type" label="Tipo">
                  <select id="type" name="type" className="input" defaultValue="GOAL">
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {EVENT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field name="side" label="Equipe do jogador">
                  <select id="side" name="side" className="input" defaultValue={match.awayTeam.isOwnClub ? "away" : "home"}>
                    <option value="home">{match.homeTeam.name}</option>
                    <option value="away">{match.awayTeam.name}</option>
                  </select>
                </Field>
                <Field name="minute" label="Minuto" hint="Opcional.">
                  <input id="minute" name="minute" className="input" inputMode="numeric" pattern="[0-9]*" maxLength={3} />
                </Field>
              </div>
              {athletes.length > 0 ? (
                <Field name="athleteId" label="Jogador do nosso elenco" hint="Somente para lances do nosso clube.">
                  <select id="athleteId" name="athleteId" className="input" defaultValue="">
                    <option value="">Nenhum (digitar o nome abaixo)</option>
                    {athletes.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.shirtNumber !== null ? `${athlete.shirtNumber} · ` : ""}
                        {displayName(athlete)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field name="playerName" label="Nome do jogador" hint="Use para adversários ou atletas não cadastrados. O nome aparece no portal.">
                <input id="playerName" name="playerName" className="input" maxLength={80} />
              </Field>
              <Field name="note" label="Observação" hint="Opcional. Em substituições, informe quem entrou.">
                <input id="note" name="note" className="input" maxLength={200} />
              </Field>
            </ActionForm>
          </div>
        ) : null}
      </Panel>

      <Panel title="Escalação do nosso clube">
        {!ownPlays ? (
          <p className="text-sm text-gray-600">A escalação só é registrada em partidas do nosso clube.</p>
        ) : athletes.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum jogador ativo no elenco.</p>
        ) : canWrite ? (
          <ActionForm action={setLineupAction.bind(null, match.id)} submitLabel="Salvar escalação">
            <p className="hint mb-3">Até 11 titulares. No portal aparecem só os jogadores com divulgação autorizada.</p>
            <ul className="divide-y divide-gray-100">
              {athletes.map((athlete) => (
                <li key={athlete.id} className="flex items-center justify-between gap-3 py-2">
                  <label htmlFor={`role-${athlete.id}`} className="text-sm">
                    <span className="inline-block w-7 font-display font-extrabold text-primary">{athlete.shirtNumber ?? "–"}</span>
                    <span className="font-semibold">{displayName(athlete)}</span>
                    <span className="text-gray-600"> · {POSITION_LABELS[athlete.position as Position]}</span>
                  </label>
                  <select id={`role-${athlete.id}`} name={`role-${athlete.id}`} className="input w-auto" defaultValue={roleOf.get(athlete.id) ?? ""}>
                    <option value="">Fora da partida</option>
                    <option value="STARTER">Titular</option>
                    <option value="SUBSTITUTE">Reserva</option>
                  </select>
                </li>
              ))}
            </ul>
          </ActionForm>
        ) : (
          <p className="text-sm text-gray-600">{lineup.length} jogador(es) relacionados.</p>
        )}
      </Panel>
    </div>
  );
}
