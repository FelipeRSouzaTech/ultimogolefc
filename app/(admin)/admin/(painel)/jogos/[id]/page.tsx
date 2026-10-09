import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDateTime, utcToSaoPauloLocal } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { MATCH_STATUS_LABELS, type MatchStatus } from "@/modules/matches/rules";
import { getMatch } from "@/modules/matches/service";
import { deleteMatchAction, saveMatchAction } from "../actions";
import { loadSeasonOptions } from "../data";
import { MatchForm } from "../match-form";
import { MatchDetails } from "./match-details";

export const metadata: Metadata = { title: "Editar partida" };

type Snapshot = { status?: string; homeScore?: number | null; awayScore?: number | null };

function describe(value: unknown): string {
  if (!value || typeof value !== "object") return "—";
  const snapshot = value as Snapshot;
  const status = snapshot.status && snapshot.status in MATCH_STATUS_LABELS ? MATCH_STATUS_LABELS[snapshot.status as MatchStatus] : "—";
  const score = snapshot.homeScore != null && snapshot.awayScore != null ? `${snapshot.homeScore} x ${snapshot.awayScore}` : "sem placar";
  return `${status}, ${score}`;
}

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("football:read");
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const [seasons, history] = await Promise.all([
    loadSeasonOptions(),
    prisma.auditLog.findMany({ where: { entity: "Match", entityId: id }, orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { name: true } } } }),
  ]);
  const canWrite = can(user.role, "football:write");

  return (
    <>
      <AdminHeading title={`${match.homeTeam.name} x ${match.awayTeam.name}`} description={`${match.season.competition.name} · ${match.season.label}`}>
        <Link href="/admin/jogos" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
        <Link href={`/jogos/${match.id}`} className="btn btn-secondary btn-sm">
          Ver no portal
        </Link>
        {can(user.role, "football:delete") ? (
          <ConfirmButton action={deleteMatchAction.bind(null, match.id)} label="Excluir" confirmMessage="Excluir esta partida? Se ela estiver encerrada, a classificação será recalculada sem ela." />
        ) : null}
      </AdminHeading>
      {canWrite ? null : <ReadOnlyNotice />}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        {canWrite ? (
          <Panel>
            <MatchForm
              action={saveMatchAction.bind(null, match.id)}
              seasons={seasons}
              values={{
                seasonId: match.seasonId,
                homeTeamId: match.homeTeamId,
                awayTeamId: match.awayTeamId,
                kickoffLocal: utcToSaoPauloLocal(match.kickoffAt),
                venue: match.venue ?? "",
                round: match.round ?? "",
                status: match.status as MatchStatus,
                homeScore: match.homeScore?.toString() ?? "",
                awayScore: match.awayScore?.toString() ?? "",
                notes: match.notes ?? "",
              }}
            />
          </Panel>
        ) : (
          <Panel>
            <p className="text-sm text-gray-600">
              {formatDateTime(match.kickoffAt)} · {match.venue ?? "Local a definir"} · {MATCH_STATUS_LABELS[match.status as MatchStatus]}
            </p>
          </Panel>
        )}

        <Panel title="Histórico de alterações">
          {history.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhuma alteração registrada.</p>
          ) : (
            <ol className="space-y-3 text-sm">
              {history.map((log) => (
                <li key={log.id} className="border-l-2 border-primary pl-3">
                  <p className="font-semibold">
                    {log.action === "match.create" ? "Partida criada" : log.action === "match.result" ? "Resultado ou status alterado" : "Dados alterados"}
                  </p>
                  {log.action !== "match.create" ? (
                    <p className="text-gray-600">
                      De: {describe(log.before)} → Para: {describe(log.after)}
                    </p>
                  ) : null}
                  <p className="text-gray-600">
                    {log.user?.name ?? "Sistema"} · {formatDateTime(log.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <MatchDetails match={match} canWrite={canWrite} />
    </>
  );
}
