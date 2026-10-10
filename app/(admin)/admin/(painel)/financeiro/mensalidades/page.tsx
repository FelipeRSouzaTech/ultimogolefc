import type { Metadata } from "next";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDate, utcToSaoPauloLocal } from "@/lib/datetime";
import type { SearchParams } from "@/lib/params";
import { centsToInput, DUE_STATUS_LABELS, dueStatus, monthLabel, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type DueStatus } from "@/modules/finance/rules";
import { getDueSettings, listDues } from "@/modules/finance/service";
import { displayName } from "@/modules/squad/rules";
import { generateDuesAction, payDueAction, saveDueSettingsAction, unwaiveDueAction, waiveDueAction } from "../actions";
import { FinanceNav, MonthNav } from "../finance-nav";
import { Money } from "../money";
import { monthFromParams } from "../params";

export const metadata: Metadata = { title: "Mensalidades" };

const BADGE: Record<DueStatus, string> = { PAID: "badge badge-solid", WAIVED: "badge", OVERDUE: "badge badge-strong", OPEN: "badge" };

export default async function DuesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("finance:read");
  const month = monthFromParams(await searchParams);
  const [dues, settings] = await Promise.all([listDues(month), getDueSettings()]);
  const canWrite = can(user.role, "finance:write");
  const today = utcToSaoPauloLocal(new Date()).slice(0, 10);

  let paidCents = 0;
  let pendingCents = 0;
  for (const due of dues) {
    const status = dueStatus(due);
    if (status === "PAID") paidCents += due.amountCents;
    if (status === "OPEN" || status === "OVERDUE") pendingCents += due.amountCents;
  }

  return (
    <>
      <AdminHeading title="Mensalidades" description="Cobrança mensal dos jogadores ativos." />
      {canWrite ? null : <ReadOnlyNotice />}
      <FinanceNav active="mensalidades" month={month} />
      <MonthNav basePath="/admin/financeiro/mensalidades" month={month} />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title={`Mensalidades de ${monthLabel(month)}`}>
          {dues.length === 0 ? (
            <EmptyState
              title="Nenhuma mensalidade neste mês"
              description={settings.amountCents === null ? "Defina o valor da mensalidade ao lado e depois gere as cobranças." : "Gere as cobranças para os jogadores ativos."}
            />
          ) : (
            <>
              <p className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>
                  Recebido:{" "}
                  <strong>
                    <Money cents={paidCents} />
                  </strong>
                </span>
                <span>
                  A receber:{" "}
                  <strong>
                    <Money cents={pendingCents} />
                  </strong>
                </span>
              </p>
              <ul className="divide-y divide-gray-100">
                {dues.map((due) => {
                  const status = dueStatus(due);
                  return (
                    <li key={due.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{displayName(due.athlete)}</p>
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
                        </div>
                      ) : null}
                      {canWrite && status === "WAIVED" ? (
                        <div className="mt-2">
                          <ActionButton action={unwaiveDueAction.bind(null, due.id)} label="Desfazer isenção" />
                        </div>
                      ) : null}
                      {status === "PAID" ? <p className="mt-1 text-xs text-gray-600">Para desfazer, estorne o lançamento correspondente em Lançamentos.</p> : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Panel>

        {canWrite ? (
          <div className="space-y-6">
            <Panel title="Gerar cobranças">
              <p className="mb-4 text-sm text-gray-600">
                Cria a mensalidade de {monthLabel(month)} para cada jogador ativo que ainda não tem. Pode ser repetido sem duplicar.
              </p>
              {settings.amountCents === null ? (
                <p className="alert alert-info">Defina o valor da mensalidade abaixo para liberar a geração.</p>
              ) : (
                <ActionButton action={generateDuesAction.bind(null, month)} label="Gerar mensalidades do mês" className="btn btn-primary" />
              )}
            </Panel>
            <Panel title="Valor e vencimento">
              <ActionForm action={saveDueSettingsAction} submitLabel="Salvar" className="space-y-4">
                <Field name="amount" label="Valor da mensalidade (R$)">
                  <input id="amount" name="amount" className="input" inputMode="decimal" placeholder="0,00" required defaultValue={settings.amountCents === null ? "" : centsToInput(settings.amountCents)} maxLength={16} />
                </Field>
                <Field name="dueDay" label="Dia do vencimento" hint="Em meses mais curtos, vale o último dia do mês. Mudanças não alteram mensalidades já geradas.">
                  <input id="dueDay" name="dueDay" type="number" min={1} max={31} className="input" required defaultValue={settings.dueDay} />
                </Field>
              </ActionForm>
            </Panel>
          </div>
        ) : null}
      </div>
    </>
  );
}
