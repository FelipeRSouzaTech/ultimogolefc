import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { Field } from "@/components/ui/field";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { AGREEMENT_KINDS, AGREEMENT_KIND_LABELS, type AgreementKind } from "@/modules/finance/rules";
import { createAgreementAction, toggleAgreementAction } from "../actions";
import { FinanceNav } from "../finance-nav";
import { Money } from "../money";

export const metadata: Metadata = { title: "Patrocínios e doações" };

export default async function AgreementsPage() {
  const user = await requirePagePermission("finance:read");
  const canWrite = can(user.role, "finance:write");
  const [agreements, received, sponsors] = await Promise.all([
    prisma.financeAgreement.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { sponsor: { select: { name: true } } } }),
    // Recebido = soma das receitas válidas ligadas a cada acordo.
    prisma.financeEntry.groupBy({ by: ["agreementId"], where: { agreementId: { not: null }, voidedAt: null, type: "INCOME" }, _sum: { amountCents: true } }),
    prisma.sponsor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const receivedBy = new Map<string, number>();
  for (const group of received) {
    if (group.agreementId) receivedBy.set(group.agreementId, group._sum.amountCents ?? 0);
  }

  return (
    <>
      <AdminHeading title="Patrocínios e doações" description="Valores combinados e o quanto já entrou no caixa." />
      {canWrite ? null : <ReadOnlyNotice />}
      <FinanceNav active="acordos" />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Acordos">
          {agreements.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum acordo registrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {agreements.map((agreement) => {
                const got = receivedBy.get(agreement.id) ?? 0;
                const remaining = Math.max(0, agreement.agreedCents - got);
                const percent = Math.min(100, Math.round((got / agreement.agreedCents) * 100));
                return (
                  <li key={agreement.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{agreement.name}</p>
                        <p className="text-sm text-gray-600">
                          {AGREEMENT_KIND_LABELS[agreement.kind as AgreementKind]}
                          {agreement.sponsor ? ` · patrocinador: ${agreement.sponsor.name}` : ""}
                          {agreement.startsOn ? ` · de ${formatDate(agreement.startsOn)}` : ""}
                          {agreement.endsOn ? ` até ${formatDate(agreement.endsOn)}` : ""}
                        </p>
                        {agreement.notes ? <p className="text-sm text-gray-600">{agreement.notes}</p> : null}
                      </div>
                      <span className={`badge ${agreement.isActive ? "badge-solid" : ""}`}>{agreement.isActive ? "Ativo" : "Encerrado"}</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <dt className="text-gray-600">Combinado</dt>
                        <dd className="font-bold">
                          <Money cents={agreement.agreedCents} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Recebido</dt>
                        <dd className="font-bold">
                          <Money cents={got} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Falta</dt>
                        <dd className="font-bold">
                          <Money cents={remaining} />
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${percent}% recebido de ${agreement.name}`}>
                      <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <Link href={`/admin/financeiro/lancamentos?acordo=${agreement.id}`} className="link text-sm">
                        Ver recebimentos
                      </Link>
                      {canWrite ? <ActionButton action={toggleAgreementAction.bind(null, agreement.id)} label={agreement.isActive ? "Encerrar" : "Reativar"} /> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {canWrite ? (
          <Panel title="Novo acordo">
            <ActionForm action={createAgreementAction} submitLabel="Registrar acordo" className="space-y-4" resetOnSuccess>
              <Field name="kind" label="Tipo">
                <select id="kind" name="kind" className="input" defaultValue="SPONSORSHIP">
                  {AGREEMENT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {AGREEMENT_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field name="name" label="Quem paga" hint="Empresa ou pessoa. Não aparece no portal.">
                <input id="name" name="name" className="input" required maxLength={120} />
              </Field>
              {sponsors.length > 0 ? (
                <Field name="sponsorId" label="Patrocinador cadastrado" hint="Opcional. Liga o acordo ao patrocinador exibido no portal.">
                  <select id="sponsorId" name="sponsorId" className="input" defaultValue="">
                    <option value="">Nenhum</option>
                    {sponsors.map((sponsor) => (
                      <option key={sponsor.id} value={sponsor.id}>
                        {sponsor.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field name="agreed" label="Valor combinado (R$)" hint="Total do acordo, não a parcela.">
                <input id="agreed" name="agreed" className="input" inputMode="decimal" placeholder="0,00" required maxLength={16} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="startsOn" label="Início" hint="Opcional.">
                  <input id="startsOn" name="startsOn" type="date" className="input" />
                </Field>
                <Field name="endsOn" label="Fim" hint="Opcional.">
                  <input id="endsOn" name="endsOn" type="date" className="input" />
                </Field>
              </div>
              <Field name="notes" label="Observação" hint="Opcional. Ex.: forma de pagamento combinada.">
                <textarea id="notes" name="notes" className="input" rows={2} maxLength={1000} />
              </Field>
            </ActionForm>
            <p className="hint mt-4">Para registrar um recebimento, crie uma receita em Lançamentos e escolha o acordo.</p>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
