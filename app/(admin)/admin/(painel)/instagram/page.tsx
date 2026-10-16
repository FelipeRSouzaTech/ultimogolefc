import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel } from "@/components/ui/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDateTime, formatTime } from "@/lib/datetime";
import { instagramConfig } from "@/lib/instagram/client";
import { param, type SearchParams } from "@/lib/params";
import {
  agendaDate,
  groupByDay,
  INSTAGRAM_FORMAT_LABELS,
  INSTAGRAM_ORIGIN_LABELS,
  saoPauloDateKey,
  shiftWeek,
  weekDays,
  weekStartKey,
  type InstagramPostStatus,
} from "@/modules/instagram/rules";
import { listQueue, listWeek, type AgendaPost } from "@/modules/instagram/service";
import { AccountNotice } from "./account-notice";
import { StatusBadge } from "./status-badge";

export const metadata: Metadata = { title: "Instagram" };

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Cor da marca lateral de cada publicação na grade da semana. */
const CHIP: Record<InstagramPostStatus, string> = {
  DRAFT: "border-gray-400 bg-white text-black",
  SCHEDULED: "border-primary bg-primary-soft text-primary",
  PUBLISHING: "border-primary bg-primary-soft text-primary",
  PUBLISHED: "border-black bg-gray-50 text-black",
  FAILED: "border-danger bg-white text-danger",
  CANCELED: "border-gray-400 bg-white text-gray-600",
};

function summary(post: AgendaPost): string {
  const text = post.caption?.split("\n")[0]?.trim();
  if (text) return text.length > 60 ? `${text.slice(0, 57)}…` : text;
  return post.format === "STORY" ? "Story (sem legenda)" : "Sem legenda";
}

function QueueTable({ posts, caption }: { posts: AgendaPost[]; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-wide">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left">
              Quando
            </th>
            <th scope="col">Formato</th>
            <th scope="col" className="text-left">
              Conteúdo
            </th>
            <th scope="col">Origem</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => {
            const date = agendaDate(post);
            return (
              <tr key={post.id}>
                <td className="whitespace-nowrap text-left tabular-nums">{date ? formatDateTime(date) : "Sem data"}</td>
                <td>{INSTAGRAM_FORMAT_LABELS[post.format]}</td>
                <td className="text-left">
                  <Link href={`/admin/instagram/${post.id}`} className="font-semibold hover:text-primary hover:underline">
                    {summary(post)}
                  </Link>
                  {post.status === "FAILED" && post.lastError ? <p className="mt-1 text-xs text-danger">{post.lastError}</p> : null}
                </td>
                <td className="text-gray-600">{INSTAGRAM_ORIGIN_LABELS[post.origin]}</td>
                <td>
                  <StatusBadge status={post.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function InstagramAgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("content:read");
  const start = weekStartKey(param(await searchParams, "semana", 10));
  const days = weekDays(start);
  const [week, queue] = await Promise.all([listWeek(start), listQueue()]);
  const byDay = groupByDay(week);
  const today = saoPauloDateKey(new Date());
  const config = instagramConfig();
  const canWrite = can(user.role, "instagram:publish");
  const failed = queue.pending.filter((post) => post.status === "FAILED").length;
  const first = days[0]!;
  const last = days[6]!;
  const range =
    first.month === last.month
      ? `${first.day} a ${last.day} de ${MONTHS[last.month - 1]}`
      : `${first.day} de ${MONTHS[first.month - 1]} a ${last.day} de ${MONTHS[last.month - 1]}`;

  return (
    <>
      <AdminHeading title="Instagram" description="Agenda das publicações no feed e nos stories.">
        {canWrite ? (
          <Link href="/admin/instagram/novo" className="btn btn-primary btn-sm">
            Nova publicação
          </Link>
        ) : null}
      </AdminHeading>
      <AccountNotice config={config} />
      {failed > 0 ? (
        <p className="alert alert-error mb-6" role="alert">
          {failed === 1 ? "Uma publicação falhou." : `${failed} publicações falharam.`} Abra a publicação para ver o motivo e publicar de novo.
        </p>
      ) : null}

      <Panel className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg uppercase">Semana de {range}</h2>
          <nav aria-label="Navegar entre semanas" className="flex flex-wrap gap-2">
            <Link href={`/admin/instagram?semana=${shiftWeek(start, -1)}`} className="btn btn-secondary btn-sm">
              Semana anterior
            </Link>
            <Link href="/admin/instagram" className="btn btn-secondary btn-sm">
              Esta semana
            </Link>
            <Link href={`/admin/instagram?semana=${shiftWeek(start, 1)}`} className="btn btn-secondary btn-sm">
              Próxima semana
            </Link>
          </nav>
        </div>
        <div className="overflow-x-auto">
          <ol className="grid min-w-[52rem] grid-cols-7 border-l border-t border-gray-100">
            {days.map((day) => {
              const posts = byDay.get(day.key) ?? [];
              return (
                <li key={day.key} className={`min-h-40 space-y-2 border-b border-r border-gray-100 p-2 ${day.key === today ? "bg-gray-50" : ""}`}>
                  <p className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>{day.weekday}</span>
                    <span className="tabular-nums">
                      {day.day}/{String(day.month).padStart(2, "0")}
                    </span>
                  </p>
                  {posts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/admin/instagram/${post.id}`}
                      className={`block rounded-sm border-l-4 px-2 py-1.5 text-xs leading-snug hover:underline ${CHIP[post.status]} ${post.origin === "AUTOMATION" ? "outline-1 outline-dashed -outline-offset-1" : ""}`}
                    >
                      <span className="block font-bold tabular-nums">
                        {formatTime(agendaDate(post)!)} · {INSTAGRAM_FORMAT_LABELS[post.format]}
                      </span>
                      <span className="block">{summary(post)}</span>
                    </Link>
                  ))}
                </li>
              );
            })}
          </ol>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600" aria-label="Legenda">
          <li className="flex items-center gap-1.5">
            <span className="size-3 border-l-4 border-primary bg-primary-soft" aria-hidden="true" /> Agendada
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 border-l-4 border-black bg-gray-50" aria-hidden="true" /> Publicada
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 border-l-4 border-danger bg-white" aria-hidden="true" /> Falhou
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 border-l-4 border-gray-400 bg-white" aria-hidden="true" /> Rascunho
          </li>
        </ul>
      </Panel>

      <Panel title="Fila" className="mb-6">
        {queue.pending.length === 0 ? (
          <EmptyState title="Nada na fila" description="Agende uma publicação para ela aparecer aqui e sair no horário marcado.">
            {canWrite ? (
              <Link href="/admin/instagram/novo" className="btn btn-primary btn-sm">
                Nova publicação
              </Link>
            ) : null}
          </EmptyState>
        ) : (
          <QueueTable posts={queue.pending} caption="Publicações agendadas, rascunhos e falhas" />
        )}
      </Panel>

      {queue.recent.length > 0 ? (
        <Panel title="Últimas publicadas e canceladas">
          <QueueTable posts={queue.recent} caption="Publicações recentes" />
        </Panel>
      ) : null}
    </>
  );
}
