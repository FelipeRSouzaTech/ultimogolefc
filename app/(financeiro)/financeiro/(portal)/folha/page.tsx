import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { requireFinance } from "@/lib/auth/finance-guard";
import { can } from "@/lib/auth/permissions";
import { formatDate, utcToSaoPauloLocal } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import type { SearchParams } from "@/lib/params";
import { CATEGORY_LABELS, monthLabel, PAYMENT_METHOD_LABELS, payrollRecipientName, summarize, type Category, type PaymentMethod } from "@/modules/finance/rules";
import { listEntries } from "@/modules/finance/service";
import { displayName, TECHNICAL_STAFF_ROLE_LABELS, type TechnicalStaffRole } from "@/modules/squad/rules";
import { createPayrollAction } from "../actions";
import { MonthNav } from "../finance-nav";
import { Money } from "../money";
import { monthFromParams } from "../params";
import { PayrollForm } from "./payroll-form";

export const metadata: Metadata = { title: "Folha de pagamento" };

export default async function PayrollPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireFinance();
  const month = monthFromParams(await searchParams);
  const canWrite = can(user.role, "finance:write");

  const [entries, athletes, staff, competitions, matches] = await Promise.all([
    listEntries({ month, payroll: true }),
    // Inativos continuam na lista de quem recebeu, mas só ativos podem receber novos pagamentos.
    prisma.athlete.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, nickname: true, shirtNumber: true } }),
    prisma.technicalStaff.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, nickname: true, role: true } }),
    prisma.competition.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.match.findMany({ orderBy: { kickoffAt: "desc" }, take: 80, include: { homeTeam: true, awayTeam: true, season: { select: { competitionId: true } } } }),
  ]);
  const total = summarize(entries).expenseCents;
  const athleteOptions = athletes
    .map((athlete) => ({ id: athlete.id, label: `${displayName(athlete)}${athlete.shirtNumber !== null ? ` (camisa ${athlete.shirtNumber})` : ""}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  const staffOptions = staff
    .map((member) => ({ id: member.id, label: `${member.nickname?.trim() || member.name} (${TECHNICAL_STAFF_ROLE_LABELS[member.role as TechnicalStaffRole]})` }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  return (
    <>
      <AdminHeading title="Folha de pagamento" description="Pagamentos feitos aos jogadores, à comissão técnica e outras despesas relacionadas às partidas. Cada registro entra no caixa como despesa na categoria selecionada." />
      {canWrite ? null : <ReadOnlyNotice />}
      <MonthNav basePath="/financeiro/folha" month={month} />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Panel title={`Pagamentos de ${monthLabel(month)}`}>
            {entries.length === 0 ? (
              <EmptyState title="Nenhum pagamento neste mês" description="Os pagamentos registrados na folha aparecerão aqui." />
            ) : (
              <>
                <p className="mb-4 text-sm">
                  Total pago no mês:{" "}
                  <strong>
                    <Money cents={total} />
                  </strong>
                </p>
                <ul className="divide-y divide-gray-100">
                  {entries.map((entry) => {
                    const voided = entry.voidedAt !== null;
                    return (
                      <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className={`font-semibold ${voided ? "text-gray-600 line-through" : ""}`}>{payrollRecipientName(entry)}</p>
                          <p className="text-sm text-gray-600">
                            {CATEGORY_LABELS[entry.category as Category]} · {formatDate(entry.occurredOn)} · {PAYMENT_METHOD_LABELS[entry.method as PaymentMethod]} · {entry.description}
                          </p>
                          {entry.competition || entry.match ? (
                            <p className="text-sm text-gray-600">
                              {entry.competition ? entry.competition.name : ""}
                              {entry.competition && entry.match ? " · " : ""}
                              {entry.match ? `${entry.match.homeTeam.name} x ${entry.match.awayTeam.name}` : ""}
                            </p>
                          ) : null}
                          {voided ? (
                            <p className="mt-1 text-sm">
                              <span className="badge badge-strong">Estornado</span> {entry.voidReason}
                            </p>
                          ) : null}
                        </div>
                        <p className={`font-display text-lg font-extrabold ${voided ? "text-gray-600 line-through" : ""}`}>
                          <Money cents={entry.amountCents} sign="EXPENSE" />
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <p className="hint mt-4">
                  Para corrigir um pagamento, estorne-o em{" "}
                  <Link href={`/financeiro/lancamentos?mes=${month}&tipo=EXPENSE`} className="link">
                    Lançamentos
                  </Link>
                  .
                </p>
              </>
            )}
          </Panel>
        </div>

        {canWrite ? (
          <Panel title="Novo pagamento">
            <PayrollForm
              action={createPayrollAction}
              today={utcToSaoPauloLocal(new Date()).slice(0, 10)}
              athletes={athleteOptions}
              staff={staffOptions}
              competitions={competitions.map((competition) => ({ id: competition.id, label: competition.name }))}
              matches={matches.map((match) => ({
                id: match.id,
                competitionId: match.season.competitionId,
                label: `${formatDate(match.kickoffAt)} · ${match.homeTeam.name} x ${match.awayTeam.name}`,
              }))}
            />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
