import { z } from "zod";
import { AGREEMENT_KINDS, CATEGORIES, categoryType, ENTRY_TYPES, parseMoney, PAYMENT_METHODS } from "@/modules/finance/rules";

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

export const voidSchema = z.object({
  reason: z.string().trim().min(5, "Explique o motivo do estorno.").max(200, "Motivo muito longo."),
});

export const dueSettingsSchema = z.object({
  amount: money,
  dueDay: z.coerce.number({ invalid_type_error: "Informe o dia." }).int("Use um número inteiro.").min(1, "Use um dia entre 1 e 31.").max(31, "Use um dia entre 1 e 31."),
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
