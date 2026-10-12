import type { Metadata } from "next";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { requireFinance } from "@/lib/auth/finance-guard";
import { can } from "@/lib/auth/permissions";
import { formatDate, utcToSaoPauloLocal } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import type { SearchParams } from "@/lib/params";
import {
  DIRECTOR_ROLE_LABELS,
  DIRECTOR_STATUS_LABELS,
  DUE_STATUS_LABELS,
  dueStatus,
  membersWithoutDue,
  monthLabel,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  summarizeDues,
  type DirectorRole,
  type DirectorStatus,
  type DueStatus,
} from "@/modules/finance/rules";
import { listDues } from "@/modules/finance/service";
import { createDueAction, payDueAction, removeDueAction, unwaiveDueAction, waiveDueAction } from "../actions";
import { MonthNav } from "../finance-nav";
import { Money } from "../money";
import { monthFromParams } from "../params";
import { DueForm } from "./due-form";

export const metadata: Metadata = { title: "Mensalidades" };

const BADGE: Record<DueStatus, string> = { PAID: "badge badge-solid", WAIVED: "badge", OVERDUE: "badge badge-strong", OPEN: "badge" };

export default async function DuesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireFinance();
  const month = monthFromParams(await searchParams);
  const [dues, directors] = await Promise.all([listDues(month), prisma.director.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, role: true, status: true } })]);
  const canWrite = can(user.role, "finance:write");
  const today = utcToSaoPauloLocal(new Date()).slice(0, 10);
  const summary = summarizeDues(dues);
  const roleLabel = (role: string) => DIRECTOR_ROLE_LABELS[role as DirectorRole] ?? role;

  // Cada diretor tem no máximo uma mensalidade por mês: quem já tem sai da lista do formulário.
  const available = new Set(
    membersWithoutDue(
      directors.map((director) => director.id),
      dues.map((due) => due.directorId),
    ),
  );
  const directorOptions = directors
    .filter((director) => available.has(director.id))
    .map((director) => ({
      id: director.id,
      label: `${director.name} (${roleLabel(director.role)})${director.status === "ACTIVE" ? "" : ` — ${DIRECTOR_STATUS_LABELS[director.status as DirectorStatus]}`}`,
    }));
  // Diretores ativos que ainda não têm mensalidade no mês.
  const missing = directors.filter((director) => director.status === "ACTIVE" && available.has(director.id));

  return (
    <>
      <AdminHeading title="Mensalidades" description="Mensalidade paga pelos diretores do clube. Os diretores vêm do cadastro do painel administrativo, em Diretores." />
      {canWrite ? null : <ReadOnlyNotice />}
      <MonthNav basePath="/financeiro/mensalidades" month={month} />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title={`Mensalidades de ${monthLabel(month)}`}>
          {dues.length === 0 ? (
            <EmptyState title="Nenhuma mensalidade neste mês" description="Inclua a mensalidade de cada diretor pelo formulário Nova mensalidade." />
          ) : (
            <ul className="divide-y divide-gray-100">
                {dues.map((due) => {
                  const status = dueStatus(due);
                  return (
                    <li key={due.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{due.director.name}</p>
                          <p className="text-sm text-gray-600">
                            {roleLabel(due.director.role)} · {DIRECTOR_STATUS_LABELS[due.director.status as DirectorStatus]}
                          </p>
                          <p className="text-sm text-gray-600">
                            <Money cents={due.amountCents} /> · vence em {formatDate(due.dueDate)}
                            {status === "PAID" && due.entry ? ` · paga em ${formatDate(due.entry.occurredOn)}` : ""}
                            {status === "WAIVED" && due.waivedReason ? ` · ${due.waivedReason}` : ""}
                          </p>
                        </div>
                        <span className={BADGE[status]}>{DUE_STATUS_LABELS[status]}</span>
                      </div>

                      {canWrite && (status === "OPEN" || status === "OVERDUE") ? (
                        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                          <details>
                            <summary className="link cursor-pointer text-sm">Registrar pagamento</summary>
                            <ActionForm action={payDueAction.bind(null, due.id)} submitLabel="Confirmar pagamento" submitClassName="btn btn-primary btn-sm" className="mt-3 grid max-w-md gap-3 sm:grid-cols-2">
                              <Field name="paidOn" id={`paidOn-${due.id}`} label="Data do pagamento">
                                <input id={`paidOn-${due.id}`} name="paidOn" type="date" className="input" defaultValue={today} max={today} required />
                              </Field>
                              <Field name="method" id={`method-${due.id}`} label="Forma">
                                <select id={`method-${due.id}`} name="method" className="input" defaultValue="PIX">
                                  {PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>
                                      {PAYMENT_METHOD_LABELS[method]}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                            </ActionForm>
                          </details>
                          <details>
                            <summary className="link cursor-pointer text-sm">Isentar</summary>
                            <ActionForm action={waiveDueAction.bind(null, due.id)} submitLabel="Confirmar isenção" submitClassName="btn btn-secondary btn-sm" className="mt-3 max-w-md">
                              <Field name="reason" id={`reason-${due.id}`} label="Motivo da isenção">
                                <input id={`reason-${due.id}`} name="reason" className="input" required maxLength={200} />
                              </Field>
                            </ActionForm>
                          </details>
                          <ConfirmButton action={removeDueAction.bind(null, due.id)} label="Excluir" confirmMessage={`Excluir a mensalidade de ${monthLabel(month)} de ${due.director.name}?`} />
                        </div>
                      ) : null}
                      {canWrite && status === "WAIVED" ? (
                        <div className="mt-2 flex flex-wrap gap-3">
                          <ActionButton action={unwaiveDueAction.bind(null, due.id)} label="Desfazer isenção" />
                          <ConfirmButton action={removeDueAction.bind(null, due.id)} label="Excluir" confirmMessage={`Excluir a mensalidade de ${monthLabel(month)} de ${due.director.name}?`} />
                        </div>
                      ) : null}
                      {status === "PAID" ? <p className="mt-1 text-xs text-gray-600">Para desfazer, estorne o lançamento correspondente em Lançamentos.</p> : null}
                    </li>
                  );
                })}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title={`Resumo de ${monthLabel(month)}`}>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-600">Recebido</dt>
                <dd className="font-display text-xl font-extrabold">
                  <Money cents={summary.paidCents} />
                </dd>
                <dd className="text-sm text-gray-600">
                  {summary.counts.PAID} paga{summary.counts.PAID !== 1 ? "s" : ""}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">A receber</dt>
                <dd className="font-display text-xl font-extrabold">
                  <Money cents={summary.pendingCents} />
                </dd>
                <dd className="text-sm text-gray-600">
                  {summary.counts.OPEN} em aberto · {summary.counts.OVERDUE} atrasada{summary.counts.OVERDUE !== 1 ? "s" : ""}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Isentas</dt>
                <dd className="font-display text-xl font-extrabold">{summary.counts.WAIVED}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Diretores ativos sem mensalidade</dt>
                <dd className="font-display text-xl font-extrabold">{missing.length}</dd>
              </div>
            </dl>
            {missing.length > 0 ? <p className="mt-4 text-sm text-gray-600">Faltam: {missing.map((director) => director.name).join(", ")}.</p> : null}
          </Panel>

          {canWrite ? (
            <Panel title="Nova mensalidade">
              {directors.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhum diretor cadastrado. Cadastre os diretores no painel administrativo, em Diretores.</p>
              ) : directorOptions.length === 0 ? (
                <p className="text-sm text-gray-600">Todos os diretores cadastrados já têm mensalidade em {monthLabel(month)}.</p>
              ) : (
                // Sugestão de vencimento: dia 10 do mês exibido.
                <DueForm action={createDueAction.bind(null, month)} monthName={monthLabel(month)} today={today} defaultDueOn={`${month}-10`} directors={directorOptions} />
              )}
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
