// Folha de pagamento.
import { CATEGORY_LABELS } from "./catalog";

/** Categorias lançadas pela folha: jogadores, comissão técnica e outras despesas ligadas às partidas. */
export const PAYROLL_CATEGORIES = ["PLAYER_PAYMENT", "STAFF_PAYMENT", "OTHER_EXPENSE"] as const;
export type PayrollCategory = (typeof PAYROLL_CATEGORIES)[number];

/** Categorias que só podem ser lançadas pela folha (ficam ligadas à pessoa que recebeu). */
export function isPayrollOnlyCategory(category: string): boolean {
  return category === "PLAYER_PAYMENT" || category === "STAFF_PAYMENT";
}

/** Tipos de serviço de "Outras despesas" na folha. "OTHER" pede o tipo digitado. */
export const PAYROLL_SERVICES = ["PHOTOGRAPHER", "REFEREE", "BROADCAST", "OTHER"] as const;
export type PayrollService = (typeof PAYROLL_SERVICES)[number];
export const PAYROLL_SERVICE_LABELS: Record<PayrollService, string> = {
  PHOTOGRAPHER: "Fotógrafo",
  REFEREE: "Arbitragem",
  BROADCAST: "Transmissão",
  OTHER: "Outros",
};

/** Texto gravado como tipo de serviço: o rótulo da opção ou, em "Outros", o que foi digitado. */
export function payrollServiceName(service: PayrollService, typed: string | null): string | null {
  if (service !== "OTHER") return PAYROLL_SERVICE_LABELS[service];
  const name = typed?.trim() ?? "";
  return name === "" ? null : name;
}

type PayrollRecipient = {
  category: string;
  payrollService: string | null;
  athlete: { name: string; nickname: string | null } | null;
  technicalStaff: { name: string; nickname: string | null } | null;
};

/** Quem (ou o quê) recebeu um lançamento da folha, para a lista de pagamentos. */
export function payrollRecipientName(entry: PayrollRecipient): string {
  const shown = (person: { name: string; nickname: string | null }) => person.nickname?.trim() || person.name;
  if (entry.category === "PLAYER_PAYMENT") return entry.athlete ? shown(entry.athlete) : "Jogador removido";
  if (entry.category === "STAFF_PAYMENT") return entry.technicalStaff ? shown(entry.technicalStaff) : "Membro da comissão removido";
  return entry.payrollService ?? CATEGORY_LABELS.OTHER_EXPENSE;
}
