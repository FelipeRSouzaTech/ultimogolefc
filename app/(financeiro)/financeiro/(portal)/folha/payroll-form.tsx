"use client";

import { useState } from "react";
import { ActionForm, FieldError } from "@/components/ui/action-form";
import type { FormAction } from "@/lib/action";
import { CATEGORY_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PAYROLL_CATEGORIES, PAYROLL_SERVICES, PAYROLL_SERVICE_LABELS, type PayrollCategory } from "@/modules/finance/rules";

type Option = { id: string; label: string };
type MatchOption = Option & { competitionId: string };

type Props = { action: FormAction; today: string; athletes: Option[]; staff: Option[]; competitions: Option[]; matches: MatchOption[] };

const DESCRIPTION_HINTS: Record<PayrollCategory, string> = {
  PLAYER_PAYMENT: "Opcional. Em branco, fica \"Pagamento a\" seguido do apelido.",
  STAFF_PAYMENT: "Opcional. Em branco, fica \"Pagamento a\" seguido do nome.",
  OTHER_EXPENSE: "Opcional. Em branco, fica o tipo de serviço.",
};

/**
 * Lançamento da folha. Segue o modelo do formulário de despesa; a categoria define o segundo campo:
 * Jogadores → jogador do elenco; Comissão técnica → membro da comissão; Outras despesas → tipo de serviço
 * (em "Outros", um campo livre). Campos das outras categorias não são exibidos nem enviados.
 */
export function PayrollForm({ action, today, athletes, staff, competitions, matches }: Props) {
  const [category, setCategory] = useState<PayrollCategory>("PLAYER_PAYMENT");
  const [service, setService] = useState("");
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
          <select
            id="category"
            name="category"
            className="input"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as PayrollCategory);
              setService("");
            }}
            aria-describedby="category-hint"
          >
            {PAYROLL_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {CATEGORY_LABELS[option]}
              </option>
            ))}
          </select>
          <p className="hint" id="category-hint">
            Entra no caixa como despesa.
          </p>
          <FieldError name="category" />
        </div>
        {category === "PLAYER_PAYMENT" ? (
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
            {athletes.length === 0 ? <p className="hint">Nenhum jogador ativo. Cadastre no painel administrativo, em Elenco.</p> : null}
            <FieldError name="athleteId" />
          </div>
        ) : null}
        {category === "STAFF_PAYMENT" ? (
          <div>
            <label className="label" htmlFor="technicalStaffId">
              Comissão técnica
            </label>
            <select id="technicalStaffId" name="technicalStaffId" className="input" defaultValue="" required>
              <option value="">Selecione</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
            {staff.length === 0 ? <p className="hint">Nenhum membro ativo. Cadastre no painel administrativo, em Comissão Técnica.</p> : null}
            <FieldError name="technicalStaffId" />
          </div>
        ) : null}
        {category === "OTHER_EXPENSE" ? (
          <div>
            <label className="label" htmlFor="service">
              Tipo de serviço
            </label>
            <select id="service" name="service" className="input" value={service} onChange={(event) => setService(event.target.value)} required>
              <option value="">Selecione</option>
              {PAYROLL_SERVICES.map((option) => (
                <option key={option} value={option}>
                  {PAYROLL_SERVICE_LABELS[option]}
                </option>
              ))}
            </select>
            <FieldError name="service" />
          </div>
        ) : null}
        {category === "OTHER_EXPENSE" && service === "OTHER" ? (
          <div className="sm:col-span-2">
            <label className="label" htmlFor="serviceOther">
              Qual serviço?
            </label>
            <input id="serviceOther" name="serviceOther" className="input" required minLength={3} maxLength={60} placeholder="Preencha o tipo de serviço" aria-describedby="serviceOther-hint" />
            <p className="hint" id="serviceOther-hint">
              Informe o tipo de serviço, por exemplo: Ambulância, Locução, Segurança.
            </p>
            <FieldError name="serviceOther" />
          </div>
        ) : null}
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
            Campeonato
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
          <p className="hint">{DESCRIPTION_HINTS[category]}</p>
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
