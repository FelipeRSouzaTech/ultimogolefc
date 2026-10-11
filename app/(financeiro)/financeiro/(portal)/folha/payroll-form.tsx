"use client";

import { useState } from "react";
import { ActionForm, FieldError } from "@/components/ui/action-form";
import type { FormAction } from "@/lib/action";
import { CATEGORY_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/modules/finance/rules";

type Option = { id: string; label: string };
type MatchOption = Option & { competitionId: string };

type Props = { action: FormAction; today: string; athletes: Option[]; competitions: Option[]; matches: MatchOption[] };

/**
 * Pagamento a um jogador. Segue o modelo do formulário de despesa, com a categoria fixa em "Jogadores"
 * e os vínculos com o elenco (pelo apelido esportivo), a competição e a partida.
 */
export function PayrollForm({ action, today, athletes, competitions, matches }: Props) {
  const [competitionId, setCompetitionId] = useState("");
  // Com uma competição escolhida, só aparecem as partidas dela.
  const visibleMatches = competitionId ? matches.filter((match) => match.competitionId === competitionId) : matches;

  return (
    <ActionForm action={action} submitLabel="Registrar pagamento" className="space-y-4" resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Categoria
          </label>
          <select id="category" className="input" defaultValue="PLAYER_PAYMENT" disabled aria-describedby="category-hint">
            <option value="PLAYER_PAYMENT">{CATEGORY_LABELS.PLAYER_PAYMENT}</option>
          </select>
          <p className="hint" id="category-hint">
            Entra no caixa como despesa.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="athleteId">
            Jogador
          </label>
          <select id="athleteId" name="athleteId" className="input" defaultValue="" required>
            <option value="">Selecione</option>
            {athletes.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.label}
              </option>
            ))}
          </select>
          <FieldError name="athleteId" />
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
            Data do pagamento
          </label>
          <input id="occurredOn" name="occurredOn" type="date" className="input" defaultValue={today} max={today} required />
          <FieldError name="occurredOn" />
        </div>
        <div>
          <label className="label" htmlFor="competitionId">
            Competição
          </label>
          <select id="competitionId" name="competitionId" className="input" value={competitionId} onChange={(event) => setCompetitionId(event.target.value)}>
            <option value="">Nenhuma</option>
            {competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>
                {competition.label}
              </option>
            ))}
          </select>
          <FieldError name="competitionId" />
        </div>
        <div key={competitionId}>
          <label className="label" htmlFor="matchId">
            Partida relacionada
          </label>
          <select id="matchId" name="matchId" className="input" defaultValue="">
            <option value="">Nenhuma</option>
            {visibleMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.label}
              </option>
            ))}
          </select>
          <FieldError name="matchId" />
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
        <div>
          <label className="label" htmlFor="description">
            Descrição
          </label>
          <input id="description" name="description" className="input" maxLength={160} placeholder="Ex.: Ajuda de custo" />
          <p className="hint">Opcional. Em branco, fica &quot;Pagamento a&quot; seguido do apelido.</p>
          <FieldError name="description" />
        </div>
      </div>
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
