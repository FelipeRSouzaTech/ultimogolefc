import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StandingsTable } from "@/components/football/standings-table";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { getSeasonStandings } from "@/modules/competitions/service";
import { deleteSeasonAction, saveSeasonAction, setParticipantsAction } from "../../actions";
import { SeasonForm } from "../../season-form";

export const metadata: Metadata = { title: "Temporada" };

export default async function SeasonAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("football:read");
  const { id } = await params;
  const season = await prisma.season.findUnique({ where: { id }, include: { competition: true, teams: true } });
  if (!season) notFound();

  const [clubs, standings] = await Promise.all([prisma.club.findMany({ orderBy: { name: "asc" } }), getSeasonStandings(season.id)]);
  const participantIds = new Set(season.teams.map((team) => team.clubId));
  const canWrite = can(user.role, "football:write");

  return (
    <>
      <AdminHeading title={`${season.competition.name} · ${season.label}`} description="Regras de classificação e participantes da temporada.">
        <Link href={`/admin/competicoes/${season.competitionId}`} className="btn btn-secondary btn-sm">
          Voltar
        </Link>
        <Link href={`/competicoes/${season.competition.slug}?temporada=${encodeURIComponent(season.label)}`} className="btn btn-secondary btn-sm">
          Ver no portal
        </Link>
        {can(user.role, "football:delete") ? (
          <ConfirmButton action={deleteSeasonAction.bind(null, season.id)} label="Excluir" confirmMessage={`Excluir a temporada ${season.label}?`} />
        ) : null}
      </AdminHeading>
      {canWrite ? null : <ReadOnlyNotice />}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Panel title="Participantes">
            {clubs.length === 0 ? (
              <p className="text-sm text-gray-600">
                Nenhum clube cadastrado.{" "}
                <Link href="/admin/clubes" className="link">
                  Cadastrar clubes
                </Link>
              </p>
            ) : canWrite ? (
              <ActionForm action={setParticipantsAction.bind(null, season.id)} submitLabel="Salvar participantes">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {clubs.map((club) => (
                    <li key={club.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="clubIds" value={club.id} defaultChecked={participantIds.has(club.id)} className="size-4 accent-primary" />
                        {club.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </ActionForm>
            ) : (
              <ul className="list-inside list-disc text-sm">
                {clubs
                  .filter((club) => participantIds.has(club.id))
                  .map((club) => (
                    <li key={club.id}>{club.name}</li>
                  ))}
              </ul>
            )}
          </Panel>

          <Panel title="Classificação atual">
            {standings && standings.rows.length > 0 ? (
              <StandingsTable rows={standings.rows} mode={standings.mode} caption="Classificação atual" />
            ) : (
              <p className="text-sm text-gray-600">
                {season.standingsMode === "MANUAL"
                  ? "Modo manual: a digitação da tabela pelo painel ainda não está disponível nesta versão."
                  : "Adicione participantes para ver a tabela."}
              </p>
            )}
          </Panel>
        </div>

        {canWrite ? (
          <Panel title="Regras da temporada">
            <SeasonForm action={saveSeasonAction.bind(null, season.competitionId, season.id)} values={season} submitLabel="Salvar temporada" />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
