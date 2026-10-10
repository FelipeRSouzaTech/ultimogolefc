import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { requireFinance } from "@/lib/auth/finance-guard";
import { can } from "@/lib/auth/permissions";
import { formatDate, utcToSaoPauloLocal } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { param, type SearchParams } from "@/lib/params";
import { CATEGORY_LABELS, ENTRY_TYPES, ENTRY_TYPE_LABELS, monthLabel, PAYMENT_METHOD_LABELS, summarize, type Category, type EntryType, type PaymentMethod } from "@/modules/finance/rules";
import { listEntries } from "@/modules/finance/service";
import { createEntryAction, voidEntryAction } from "../actions";
import { MonthNav } from "../finance-nav";
import { Money } from "../money";
import { monthFromParams } from "../params";
import { EntryForm } from "./entry-form";

export const metadata: Metadata = { title: "Lançamentos" };

export default async function EntriesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireFinance();
  const params = await searchParams;
  const month = monthFromParams(params);
  const typeParam = param(params, "tipo");
  const type = (ENTRY_TYPES as readonly string[]).includes(typeParam ?? "") ? (typeParam as EntryType) : undefined;
  const matchId = param(params, "jogo", 40);
  const agreementId = param(params, "acordo", 40);
  const canWrite = can(user.role, "finance:write");

  const [entries, matches, agreements, scopeMatch, scopeAgreement] = await Promise.all([
    listEntries({ month, type, matchId, agreementId }),
    prisma.match.findMany({ orderBy: { kickoffAt: "desc" }, take: 40, include: { homeTeam: true, awayTeam: true } }),
    prisma.financeAgreement.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    matchId ? prisma.match.findUnique({ where: { id: matchId }, include: { homeTeam: true, awayTeam: true } }) : null,
    agreementId ? prisma.financeAgreement.findUnique({ where: { id: agreementId } }) : null,
  ]);
  const totals = summarize(entries);
  const scope = scopeMatch
    ? `Partida: ${scopeMatch.homeTeam.name} x ${scopeMatch.awayTeam.name} (${formatDate(scopeMatch.kickoffAt)})`
    : scopeAgreement
      ? `Acordo: ${scopeAgreement.name}`
      : null;
  const typeQuery = type ? `&tipo=${type}` : "";

  return (
    <>
      <AdminHeading title="Lançamentos" description="Receitas e despesas do caixa. Um lançamento errado é corrigido por estorno, nunca apagado." />
      {canWrite ? null : <ReadOnlyNotice />}

      {scope ? (
        <p className="alert alert-info mb-6">
          {scope}. Mostrando todo o histórico.{" "}
          <Link href={`/financeiro/lancamentos?mes=${month}`} className="link">
            Voltar ao mês
          </Link>
        </p>
      ) : (
        <>
          <MonthNav basePath="/financeiro/lancamentos" month={month} extraQuery={typeQuery} />
          <nav aria-label="Filtrar por tipo" className="mb-6 flex flex-wrap gap-2">
            <Link href={`/financeiro/lancamentos?mes=${month}`} className={`btn btn-sm ${type ? "btn-secondary" : "btn-primary"}`}>
              Tudo
            </Link>
            {ENTRY_TYPES.map((item) => (
              <Link key={item} href={`/financeiro/lancamentos?mes=${month}&tipo=${item}`} className={`btn btn-sm ${type === item ? "btn-primary" : "btn-secondary"}`}>
                {ENTRY_TYPE_LABELS[item]}s
              </Link>
            ))}
          </nav>
        </>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title={scope ? "Lançamentos" : `Lançamentos de ${monthLabel(month)}`}>
          {entries.length === 0 ? (
            <EmptyState title="Nenhum lançamento" description="Os lançamentos registrados aparecerão aqui." />
          ) : (
            <>
              <p className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>
                  Receitas:{" "}
                  <strong>
                    <Money cents={totals.incomeCents} />
                  </strong>
                </span>
                <span>
                  Despesas:{" "}
                  <strong>
                    <Money cents={totals.expenseCents} />
                  </strong>
                </span>
                <span>
                  Resultado:{" "}
                  <strong>
                    <Money cents={totals.balanceCents} />
                  </strong>
                </span>
              </p>
              <ul className="divide-y divide-gray-100">
                {entries.map((entry) => {
                  const voided = entry.voidedAt !== null;
                  return (
                    <li key={entry.id} className="py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`font-semibold ${voided ? "text-gray-600 line-through" : ""}`}>{entry.description}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(entry.occurredOn)} · {CATEGORY_LABELS[entry.category as Category]} · {PAYMENT_METHOD_LABELS[entry.method as PaymentMethod]}
                            {entry.createdBy ? ` · por ${entry.createdBy.name}` : ""}
                          </p>
                          {entry.match ? (
                            <p className="text-sm text-gray-600">
                              Partida: {entry.match.homeTeam.name} x {entry.match.awayTeam.name}
                            </p>
                          ) : null}
                          {entry.agreement ? <p className="text-sm text-gray-600">Acordo: {entry.agreement.name}</p> : null}
                          {entry.notes ? <p className="text-sm text-gray-600">{entry.notes}</p> : null}
                          {voided ? (
                            <p className="mt-1 text-sm">
                              <span className="badge badge-strong">Estornado</span> {entry.voidedAt ? formatDate(entry.voidedAt) : ""} — {entry.voidReason}
                            </p>
                          ) : null}
                        </div>
                        <p className={`font-display text-lg font-extrabold ${voided ? "text-gray-600 line-through" : ""}`}>
                          <Money cents={entry.amountCents} sign={entry.type} />
                        </p>
                      </div>
                      {canWrite && !voided ? (
                        <details className="mt-2">
                          <summary className="link cursor-pointer text-sm">Estornar</summary>
                          <ActionForm action={voidEntryAction.bind(null, entry.id)} submitLabel="Confirmar estorno" submitClassName="btn btn-danger btn-sm" className="mt-3 max-w-md">
                            <Field name="reason" id={`reason-${entry.id}`} label="Motivo do estorno" hint={entry.due ? "Este é o pagamento de uma mensalidade: ela voltará a ficar em aberto." : "O lançamento continua no histórico, marcado como estornado."}>
                              <input id={`reason-${entry.id}`} name="reason" className="input" required maxLength={200} />
                            </Field>
                          </ActionForm>
                        </details>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Panel>

        {canWrite ? (
          <Panel title="Novo lançamento">
            <EntryForm
              action={createEntryAction}
              today={utcToSaoPauloLocal(new Date()).slice(0, 10)}
              matches={matches.map((match) => ({ id: match.id, label: `${formatDate(match.kickoffAt)} · ${match.homeTeam.name} x ${match.awayTeam.name}` }))}
              agreements={agreements.map((agreement) => ({ id: agreement.id, label: agreement.name }))}
              defaultMatchId={scopeMatch?.id}
            />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
