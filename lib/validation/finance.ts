import { z } from "zod";
import { AGREEMENT_KINDS, CATEGORIES, categoryType, DUE_ENTRY_MODES, ENTRY_TYPES, parseMoney, PAYMENT_METHODS, PAYROLL_CATEGORIES, PAYROLL_SERVICES } from "@/modules/finance/rules";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

/** Valor em reais digitado pelo usuário, convertido para centavos. */
const money = z
  .string()
  .trim()
  .min(1, "Informe o valor.")
  .transform((value) => parseMoney(value))
  .refine((value): value is number => value !== null, "Informe um valor maior que zero, por exemplo 50,00.");

const day = (message: string) => z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, message);
const optionalDay = z.string().trim().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida.");

export const entrySchema = z
  .object({
    type: z.enum(ENTRY_TYPES, { errorMap: () => ({ message: "Selecione receita ou despesa." }) }),
    category: z.enum(CATEGORIES, { errorMap: () => ({ message: "Selecione a categoria." }) }),
    description: z.string().trim().min(3, "Descreva o lançamento.").max(160, "Descrição muito longa."),
    amount: money,
    occurredOn: day("Informe a data."),
    method: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: "Selecione a forma de pagamento." }) }),
    matchId: optionalText(40, "Partida inválida."),
    agreementId: optionalText(40, "Acordo inválido."),
    notes: optionalText(1000, "Observação muito longa."),
  })
  .superRefine((value, context) => {
    // A categoria precisa ser do mesmo tipo do lançamento (ex.: "Arbitragem" só em despesa).
    if (categoryType(value.category) !== value.type) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["category"], message: "Esta categoria não combina com o tipo do lançamento." });
    }
    if (value.agreementId && value.type !== "INCOME") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["agreementId"], message: "Acordos só podem ser ligados a receitas." });
    }
  });

/**
 * Folha de pagamento: sempre despesa, na categoria escolhida.
 * Jogadores pede o jogador; Comissão técnica pede o membro; Outras despesas pede o tipo de serviço
 * (e, em "Outros", o tipo digitado).
 */
export const payrollSchema = z
  .object({
    category: z.enum(PAYROLL_CATEGORIES, { errorMap: () => ({ message: "Selecione a categoria." }) }),
    athleteId: optionalText(40, "Jogador inválido."),
    technicalStaffId: optionalText(40, "Membro da comissão inválido."),
    service: z
      .string()
      .trim()
      .refine((value) => value === "" || (PAYROLL_SERVICES as readonly string[]).includes(value), "Selecione o tipo de serviço."),
    serviceOther: optionalText(60, "Tipo de serviço muito longo (até 60 caracteres)."),
    competitionId: optionalText(40, "Campeonato inválido."),
    matchId: optionalText(40, "Partida inválida."),
    amount: money,
    occurredOn: day("Informe a data."),
    method: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: "Selecione a forma de pagamento." }) }),
    description: optionalText(160, "Descrição muito longa."),
    notes: optionalText(1000, "Observação muito longa."),
  })
  .superRefine((value, context) => {
    const require = (path: string, message: string) => context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (value.category === "PLAYER_PAYMENT" && !value.athleteId) require("athleteId", "Selecione o jogador.");
    if (value.category === "STAFF_PAYMENT" && !value.technicalStaffId) require("technicalStaffId", "Selecione o membro da comissão técnica.");
    if (value.category === "OTHER_EXPENSE") {
      if (value.service === "") require("service", "Selecione o tipo de serviço.");
      else if (value.service === "OTHER" && (value.serviceOther ?? "").length < 3) require("serviceOther", "Informe o tipo de serviço.");
    }
  });

export const voidSchema = z.object({
  reason: z.string().trim().min(5, "Explique o motivo do estorno.").max(200, "Motivo muito longo."),
});

/**
 * Inclusão de mensalidade de um diretor. "Paga" pede a data e a forma do pagamento;
 * "Em aberto" pede o vencimento.
 */
export const dueCreateSchema = z
  .object({
    directorId: z.string().trim().min(1, "Selecione o diretor.").max(40, "Diretor inválido."),
    amount: money,
    mode: z.enum(DUE_ENTRY_MODES, { errorMap: () => ({ message: "Selecione a situação." }) }),
    paidOn: optionalDay,
    method: z
      .string()
      .trim()
      .refine((value) => value === "" || (PAYMENT_METHODS as readonly string[]).includes(value), "Selecione a forma de pagamento."),
    dueOn: optionalDay,
  })
  .superRefine((value, context) => {
    const require = (path: string, message: string) => context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (value.mode === "PAID") {
      if (value.paidOn === "") require("paidOn", "Informe a data do pagamento.");
      if (value.method === "") require("method", "Selecione a forma de pagamento.");
    } else if (value.dueOn === "") require("dueOn", "Informe o vencimento.");
  });

export const payDueSchema = z.object({
  method: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: "Selecione a forma de pagamento." }) }),
  paidOn: day("Informe a data do pagamento."),
});

export const waiveSchema = z.object({
  reason: z.string().trim().min(3, "Informe o motivo da isenção.").max(200, "Motivo muito longo."),
});

export const agreementSchema = z.object({
  kind: z.enum(AGREEMENT_KINDS, { errorMap: () => ({ message: "Selecione o tipo." }) }),
  name: z.string().trim().min(2, "Informe quem paga.").max(120, "Nome muito longo."),
  sponsorId: optionalText(40, "Patrocinador inválido."),
  agreed: money,
  startsOn: optionalDay,
  endsOn: optionalDay,
  notes: optionalText(1000, "Observação muito longa."),
});
