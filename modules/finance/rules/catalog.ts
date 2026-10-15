// Tipos, categorias e formas de pagamento dos lançamentos.

export const ENTRY_TYPES = ["INCOME", "EXPENSE"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];
export const ENTRY_TYPE_LABELS: Record<EntryType, string> = { INCOME: "Receita", EXPENSE: "Despesa" };

export const INCOME_CATEGORIES = ["MEMBERSHIP", "SPONSORSHIP", "DONATION", "EVENT", "OTHER_INCOME"] as const;
export const EXPENSE_CATEGORIES = ["PLAYER_PAYMENT", "STAFF_PAYMENT", "REFEREE", "FIELD", "UNIFORM", "EQUIPMENT", "TRANSPORT", "REGISTRATION", "OTHER_EXPENSE"] as const;
export const CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  MEMBERSHIP: "Mensalidade",
  SPONSORSHIP: "Patrocínio",
  DONATION: "Doação",
  EVENT: "Evento",
  OTHER_INCOME: "Outras receitas",
  REFEREE: "Arbitragem",
  FIELD: "Campo",
  UNIFORM: "Uniforme",
  EQUIPMENT: "Material esportivo",
  TRANSPORT: "Transporte",
  REGISTRATION: "Inscrição em competição",
  PLAYER_PAYMENT: "Jogadores",
  STAFF_PAYMENT: "Comissão técnica",
  OTHER_EXPENSE: "Outras despesas",
};

export function categoryType(category: Category): EntryType {
  return (INCOME_CATEGORIES as readonly string[]).includes(category) ? "INCOME" : "EXPENSE";
}

export const PAYMENT_METHODS = ["PIX", "CASH", "TRANSFER", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  TRANSFER: "Transferência",
  CARD: "Cartão",
  OTHER: "Outro",
};

export const AGREEMENT_KINDS = ["SPONSORSHIP", "DONATION"] as const;
export type AgreementKind = (typeof AGREEMENT_KINDS)[number];
export const AGREEMENT_KIND_LABELS: Record<AgreementKind, string> = { SPONSORSHIP: "Patrocínio", DONATION: "Doação" };
