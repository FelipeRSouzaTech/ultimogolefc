"use client";

import { useState } from "react";
import { ActionForm, FieldError } from "@/components/ui/action-form";
import type { FormAction } from "@/lib/action";
import { CATEGORY_LABELS, ENTRY_TYPE_LABELS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, isPayrollOnlyCategory, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type EntryType } from "@/modules/finance/rules";

type Option = { id: string; label: string };

type Props = { action: FormAction; today: string; matches: Option[]; agreements: Option[]; defaultMatchId?: string };

/** Formulário de lançamento. As categorias mudam conforme o tipo (receita ou despesa). */
export function EntryForm({ action, today, matches, agreements, defaultMatchId }: Props) {
  const [type, setType] = useState<EntryType>(defaultMatchId ? "EXPENSE" : "INCOME");
  // Mensalidade e pagamento a jogadores ficam de fora: têm telas próprias (Mensalidades e Folha de pagamento).
  const categories =
    type === "INCOME" ? INCOME_CATEGORIES.filter((category) => category !== "MEMBERSHIP") : EXPENSE_CATEGORIES.filter((category) => !isPayrollOnlyCategory(category));

  return (
    <ActionForm action={action} submitLabel="Registrar lançamento" className="space-y-4" resetOnSuccess>
      <fieldset>
        <legend className="label">Tipo</legend>
        <div className="flex gap-2">
          {(["INCOME", "EXPENSE"] as const).map((option) => (
            <label key={option} className={`btn btn-sm flex-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${type === option ? "btn-primary" : "btn-secondary"}`}>
              <input type="radio" name="type" value={option} checked={type === option} onChange={() => setType(option)} className="sr-only" />
              {ENTRY_TYPE_LABELS[option]}
            </label>
          ))}
        </div>
        <FieldError name="type" />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <div key={type}>
          <label className="label" htmlFor="category">
            Categoria
          </label>
          <select id="category" name="category" className="input" defaultValue={categories[0]}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
          <FieldError name="category" />
        </div>
        <div>
          <label className="label" htmlFor="amount">
            Valor (R$)
          </label>
          <input id="amount" name="amount" className="input" inputMode="decimal" placeholder="0,00" required maxLength={16} autoComplete="off" />
          <FieldError name="amount" />
        </div>
        <div>
          <label className="label" htmlFor="occurredOn">
            Data
          </label>
          <input id="occurredOn" name="occurredOn" type="date" className="input" defaultValue={today} max={today} required />
          <FieldError name="occurredOn" />
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
      </div>

      <div>
        <label className="label" htmlFor="description">
          Descrição
        </label>
        <input id="description" name="description" className="input" required maxLength={160} placeholder={type === "INCOME" ? "Ex.: Rifa de fim de ano" : "Ex.: Taxa de arbitragem"} />
        <FieldError name="description" />
      </div>

      {type === "EXPENSE" ? (
        <div>
          <label className="label" htmlFor="matchId">
            Partida relacionada
          </label>
          <select id="matchId" name="matchId" className="input" defaultValue={defaultMatchId ?? ""}>
            <option value="">Nenhuma</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.label}
              </option>
            ))}
          </select>
          <p className="hint">Opcional. Ligue a despesa a um jogo para ver o custo por partida.</p>
          <FieldError name="matchId" />
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="agreementId">
            Acordo de patrocínio ou doação
          </label>
          <select id="agreementId" name="agreementId" className="input" defaultValue="">
            <option value="">Nenhum</option>
            {agreements.map((agreement) => (
              <option key={agreement.id} value={agreement.id}>
                {agreement.label}
              </option>
            ))}
          </select>
          <p className="hint">Opcional. Ligue a receita a um acordo para acompanhar quanto já foi recebido.</p>
          <FieldError name="agreementId" />
        </div>
      )}

      <div>
        <label className="label" htmlFor="notes">
          Observação
        </label>
        <textarea id="notes" name="notes" className="input" rows={2} maxLength={1000} />
        <FieldError name="notes" />
      </div>
    </ActionForm>
  );
}
