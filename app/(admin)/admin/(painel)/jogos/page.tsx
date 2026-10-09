import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, ReadOnlyNotice } from "@/components/ui/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { param, type SearchParams } from "@/lib/params";
import { MATCH_STATUSES, MATCH_STATUS_LABELS, type MatchStatus } from "@/modules/matches/rules";
import { matchInclude } from "@/modules/matches/service";

export const metadata: Metadata = { title: "Jogos" };

export default async function AdminMatchesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("football:read");
  const statusParam = param(await searchParams, "status");
  const status = (MATCH_STATUSES as readonly string[]).includes(statusParam ?? "") ? (statusParam as MatchStatus) : undefined;
  const canWrite = can(user.role, "football:write");

  const matches = await prisma.match.findMany({
    where: status ? { status } : {},
    include: matchInclude,
    orderBy: { kickoffAt: "desc" },
    take: 200,
  });

  return (
    <>
      <AdminHeading title="Jogos" description="Partidas, placares e status.">
        {canWrite ? (
          <Link href="/admin/jogos/novo" className="btn btn-primary btn-sm">
            Nova partida
          </Link>
        ) : null}
      </AdminHeading>
      {canWrite ? null : <ReadOnlyNotice />}

      <nav aria-label="Filtrar por status" className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/jogos" className={`btn btn-sm ${status ? "btn-secondary" : "btn-primary"}`}>
          Todas
        </Link>
        {MATCH_STATUSES.map((item) => (
          <Link key={item} href={`/admin/jogos?status=${item}`} className={`btn btn-sm ${status === item ? "btn-primary" : "btn-secondary"}`}>
            {MATCH_STATUS_LABELS[item]}
          </Link>
        ))}
      </nav>

      {matches.length === 0 ? (
        <EmptyState title="Nenhuma partida" description="Cadastre clubes, uma competição com temporada e participantes, e depois as partidas." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="text-left">
                  Partida
                </th>
                <th scope="col">Placar</th>
                <th scope="col">Competição</th>
                <th scope="col">Data</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id}>
                  <td className="text-left">
                    <Link href={`/admin/jogos/${match.id}`} className="font-semibold hover:text-primary hover:underline">
                      {match.homeTeam.name} x {match.awayTeam.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap font-bold">{match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} x ${match.awayScore}` : "—"}</td>
                  <td>
                    {match.season.competition.name} · {match.season.label}
                  </td>
                  <td className="whitespace-nowrap">{formatDateTime(match.kickoffAt)}</td>
                  <td>
                    <span className={`badge ${match.status === "FINISHED" ? "badge-solid" : ""}`}>{MATCH_STATUS_LABELS[match.status as MatchStatus]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
