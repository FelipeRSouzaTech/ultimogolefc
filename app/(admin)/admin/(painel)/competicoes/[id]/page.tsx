import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { deleteCompetitionAction, saveCompetitionAction, saveSeasonAction } from "../actions";
import { CompetitionForm } from "../competition-form";
import { SeasonForm } from "../season-form";

export const metadata: Metadata = { title: "Competição" };

export default async function CompetitionAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("football:read");
  const { id } = await params;
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: { seasons: { orderBy: { label: "desc" }, include: { _count: { select: { teams: true, matches: true } } } } },
  });
  if (!competition) notFound();
  const canWrite = can(user.role, "football:write");

  return (
    <>
      <AdminHeading title={competition.name}>
        <Link href="/admin/competicoes" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
        <Link href={`/competicoes/${competition.slug}`} className="btn btn-secondary btn-sm">
          Ver no portal
        </Link>
        {can(user.role, "football:delete") ? (
          <ConfirmButton action={deleteCompetitionAction.bind(null, competition.id)} label="Excluir" confirmMessage={`Excluir a competição "${competition.name}"?`} />
        ) : null}
      </AdminHeading>
      {canWrite ? null : <ReadOnlyNotice />}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel title="Temporadas">
            {competition.seasons.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhuma temporada cadastrada.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {competition.seasons.map((season) => (
                  <li key={season.id} className="flex items-center justify-between gap-3 py-3">
                    <Link href={`/admin/competicoes/temporadas/${season.id}`} className="font-semibold hover:text-primary hover:underline">
                      {season.label}
                    </Link>
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      {season._count.teams} clube(s) · {season._count.matches} partida(s)
                      {season.isCurrent ? <span className="badge badge-solid">Em andamento</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {canWrite ? (
            <Panel title="Dados da competição">
              <CompetitionForm action={saveCompetitionAction.bind(null, competition.id)} values={competition} />
            </Panel>
          ) : null}
        </div>
        {canWrite ? (
          <Panel title="Nova temporada">
            <SeasonForm action={saveSeasonAction.bind(null, competition.id, null)} submitLabel="Criar temporada" />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
