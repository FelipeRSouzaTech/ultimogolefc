import Link from "next/link";
import { AdminHeading, Panel } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { param, type SearchParams } from "@/lib/params";
import { listResults, listUpcomingMatches } from "@/modules/matches/service";

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("dashboard:view");
  const denied = param(await searchParams, "negado") === "1";
  const now = new Date();

  const canAudit = can(user.role, "audit:read");
  const [published, drafts, activeCompetitions, athletes, activeSponsors, unreadMessages, upcoming, results] = await Promise.all([
    prisma.newsArticle.count({ where: { status: "PUBLISHED", publishedAt: { lte: now } } }),
    prisma.newsArticle.count({ where: { status: "DRAFT" } }),
    prisma.competition.count({ where: { isActive: true } }),
    prisma.athlete.count({ where: { status: "ACTIVE" } }),
    prisma.sponsor.count({ where: { isActive: true } }),
    can(user.role, "messages:manage") ? prisma.contactMessage.count({ where: { isRead: false } }) : Promise.resolve(null),
    listUpcomingMatches({}, 5),
    listResults({}, 5),
  ]);
  const activity = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: canAudit ? 8 : 0,
    include: { user: { select: { name: true } } },
  });

  const stats = [
    { label: "Notícias publicadas", value: published, href: "/admin/noticias" },
    { label: "Notícias em rascunho", value: drafts, href: "/admin/noticias?status=DRAFT" },
    { label: "Competições ativas", value: activeCompetitions, href: "/admin/competicoes" },
    { label: "Jogadores ativos", value: athletes, href: "/admin/elenco" },
    { label: "Patrocinadores ativos", value: activeSponsors, href: "/admin/patrocinadores" },
    ...(unreadMessages === null ? [] : [{ label: "Mensagens não lidas", value: unreadMessages, href: "/admin/mensagens" }]),
  ];

  return (
    <>
      <AdminHeading title="Visão geral" description="Resumo do conteúdo do portal." />
      {denied ? (
        <p className="alert alert-error mb-6" role="alert">
          Você não tem permissão para acessar a área solicitada.
        </p>
      ) : null}

      <ul className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="card block p-5 hover:border-primary">
              <p className="font-display text-4xl font-extrabold text-primary">{item.value}</p>
              <p className="mt-1 text-sm font-semibold text-gray-600">{item.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Próximos jogos">
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum jogo agendado.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {upcoming.map((match) => (
                <li key={match.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/admin/jogos/${match.id}`} className="font-semibold hover:text-primary hover:underline">
                    {match.homeTeam.name} x {match.awayTeam.name}
                  </Link>
                  <span className="text-gray-600">{formatDateTime(match.kickoffAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Últimos resultados">
          {results.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum resultado registrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {results.map((match) => (
                <li key={match.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/admin/jogos/${match.id}`} className="font-semibold hover:text-primary hover:underline">
                    {match.homeTeam.name} {match.homeScore} x {match.awayScore} {match.awayTeam.name}
                  </Link>
                  <span className="text-gray-600">{formatDateTime(match.kickoffAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {canAudit ? (
          <Panel title="Atividades recentes" className="xl:col-span-2">
            {activity.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhuma atividade registrada.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {activity.map((log) => (
                  <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <span className="font-semibold">{log.user?.name ?? "Sistema"}</span> · {log.summary ?? log.action}
                    </span>
                    <span className="text-gray-600">{formatDateTime(log.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}
      </div>
    </>
  );
}
