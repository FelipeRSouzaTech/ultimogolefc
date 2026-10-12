"use client";

import { useState } from "react";
import { ActionForm, FieldError } from "@/components/ui/action-form";
import type { FormAction } from "@/lib/action";
import { DUE_ENTRY_MODES, DUE_ENTRY_MODE_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type DueEntryMode } from "@/modules/finance/rules";

type Props = { action: FormAction; monthName: string; today: string; defaultDueOn: string; directors: { id: string; label: string }[] };

/**
 * Inclusão da mensalidade de um diretor no mês exibido. A situação define os campos seguintes:
 * Paga → data e forma do pagamento (gera a receita no caixa); Em aberto → vencimento.
 */
export function DueForm({ action, monthName, today, defaultDueOn, directors }: Props) {
  const [mode, setMode] = useState<DueEntryMode>("PAID");

  return (
    <ActionForm action={action} submitLabel="Incluir mensalidade" className="space-y-4" resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="referenceMonth">
            Mês de referência
          </label>
          <input id="referenceMonth" className="input" value={monthName} disabled readOnly aria-describedby="referenceMonth-hint" />
          <p className="hint" id="referenceMonth-hint">
            Para outro mês, use Anterior e Próximo.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="directorId">
            Diretor
          </label>
          <select id="directorId" name="directorId" className="input" defaultValue="" required>
            <option value="">Selecione</option>
            {directors.map((director) => (
              <option key={director.id} value={director.id}>
                {director.label}
              </option>
            ))}
          </select>
          <FieldError name="directorId" />
        </div>
        <div>
          <label className="label" htmlFor="amount">
            Valor (R$)
          </label>
          <input id="amount" name="amount" className="input" inputMode="decimal" placeholder="0,00" required maxLength={16} autoComplete="off" />
          <FieldError name="amount" />
        </div>
        <div>
          <label className="label" htmlFor="mode">
            Situação
          </label>
          <select id="mode" name="mode" className="input" value={mode} onChange={(event) => setMode(event.target.value as DueEntryMode)}>
            {DUE_ENTRY_MODES.map((option) => (
              <option key={option} value={option}>
                {DUE_ENTRY_MODE_LABELS[option]}
              </option>
            ))}
          </select>
          <FieldError name="mode" />
        </div>
        {mode === "PAID" ? (
          <>
            <div>
              <label className="label" htmlFor="paidOn">
                Data do pagamento
              </label>
              <input id="paidOn" name="paidOn" type="date" className="input" defaultValue={today} max={today} required />
              <FieldError name="paidOn" />
            </div>
            <div>
              <label className="label" htmlFor="method">
                Forma de pagamento
              </label>
              <select id="method" name="method" className="input" defaultValue="PIX">
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
              <FieldError name="method" />
            </div>
          </>
        ) : (
          <div>
            <label className="label" htmlFor="dueOn">
              Vencimento
            </label>
            <input id="dueOn" name="dueOn" type="date" className="input" defaultValue={defaultDueOn} required />
            <FieldError name="dueOn" />
          </div>
        )}
      </div>
      <p className="hint">{mode === "PAID" ? "Entra no caixa como receita na categoria Mensalidade." : "Só entra no caixa quando o pagamento for registrado."}</p>
    </ActionForm>
  );
}
