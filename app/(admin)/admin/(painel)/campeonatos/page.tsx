import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { saveCompetitionAction } from "./actions";
import { CompetitionForm } from "./competition-form";

export const metadata: Metadata = { title: "Campeonatos" };

export default async function CampeonatosPage() {
  const user = await requirePagePermission("football:read");
  const competitions = await prisma.competition.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { _count: { select: { seasons: true } } } });
  const canWrite = can(user.role, "football:write");

  return (
    <>
      <AdminHeading title="Campeonatos" description="Campeonatos, temporadas, participantes e regras de classificação." />
      {canWrite ? null : <ReadOnlyNotice />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Campeonatos cadastrados">
          {competitions.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum campeonato cadastrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {competitions.map((competition) => (
                <li key={competition.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
                  <Link href={`/admin/campeonatos/${competition.id}`} className="font-semibold hover:text-primary hover:underline">
                    {competition.name}
                  </Link>
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    {competition._count.seasons} temporada(s)
                    <span className={`badge ${competition.isActive ? "badge-solid" : ""}`}>{competition.isActive ? "Ativa" : "Encerrada"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {canWrite ? (
          <Panel title="Novo campeonato">
            <CompetitionForm action={saveCompetitionAction.bind(null, null)} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}