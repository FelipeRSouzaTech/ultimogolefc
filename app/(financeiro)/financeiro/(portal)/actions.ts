"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { saoPauloLocalToUtc } from "@/lib/datetime";
import { agreementSchema, dueSettingsSchema, entrySchema, payDueSchema, voidSchema, waiveSchema } from "@/lib/validation/finance";
import { entryDate, formatMoney, isMonthKey, monthLabel } from "@/modules/finance/rules";
import { createEntry, generateDues, payDue, saveDueSettings, setDueWaived, voidEntry } from "@/modules/finance/service";

const INVALID_DATE = { error: "Revise os campos destacados.", fieldErrors: { occurredOn: ["Data inválida."] } };

export async function createEntryAction(formData: FormData): Promise<ActionState> {
  return withPermission("finance:write", async (user) => {
    const parsed = entrySchema.safeParse({
      type: field(formData, "type"),
      category: field(formData, "category"),
      description: field(formData, "description"),
      amount: field(formData, "amount"),
      occurredOn: field(formData, "occurredOn"),
      method: field(formData, "method"),
      matchId: field(formData, "matchId"),
      agreementId: field(formData, "agreementId"),
      notes: field(formData, "notes"),
    });
    if (!parsed.success) return zodErrorState(parsed.error);
    const occurredOn = entryDate(parsed.data.occurredOn);
    if (!occurredOn) return INVALID_DATE;
    // Lançamento com data futura distorce o saldo; um dia de folga cobre diferenças de fuso.
    if (occurredOn.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      return { error: "Revise os campos destacados.", fieldErrors: { occurredOn: ["A data não pode estar no futuro."] } };
    }
    // Mensalidades são pagas pela tela de mensalidades, para ficarem ligadas ao jogador e ao mês.
    if (parsed.data.category === "MEMBERSHIP") {
      return { error: "Revise os campos destacados.", fieldErrors: { category: ['Registre mensalidades em "Mensalidades", para dar baixa no jogador certo.'] } };
    }

    const data = parsed.data;
    await prisma.$transaction((tx) =>
      createEntry(
        {
          type: data.type,
          category: data.category,
          description: data.description,
          amountCents: data.amount,
          occurredOn,
          method: data.method,
          notes: data.notes,
          matchId: data.matchId,
          agreementId: data.agreementId,
        },
        user.id,
        tx,
      ),
    );
    return { ok: true, message: `Lançamento de ${formatMoney(data.amount)} registrado.` };
  });
}

export async function voidEntryAction(entryId: string, formData: FormData): Promise<ActionState> {
  return withPermission("finance:write", async (user) => {
    const parsed = voidSchema.safeParse({ reason: field(formData, "reason") });
    if (!parsed.success) return zodErrorState(parsed.error);
    await voidEntry(entryId, parsed.data.reason, user.id);
    return { ok: true, message: "Lançamento estornado." };
  });
}

export async function saveDueSettingsAction(formData: FormData): Promise<ActionState> {
  return withPermission("finance:write", async (user) => {
    const parsed = dueSettingsSchema.safeParse({ amount: field(formData, "amount"), dueDay: field(formData, "dueDay") });
    if (!parsed.success) return zodErrorState(parsed.error);
    await saveDueSettings(parsed.data.amount, parsed.data.dueDay, user.id);
    return { ok: true, message: "Configuração salva. Vale para as próximas mensalidades geradas." };
  });
}

export async function generateDuesAction(month: string): Promise<ActionState> {
  return withPermission("finance:write", async (user) => {
    if (!isMonthKey(month)) return { error: "Mês inválido." };
    const created = await generateDues(month, user.id);
    return { ok: true, message: created === 0 ? "Todos os jogadores ativos já têm mensalidade neste mês." : `${created} mensalidade(s) gerada(s) para ${monthLabel(month)}.` };
  });
}

export async function payDueAction(dueId: string, formData: FormData): Promise<ActionState> {
  return withPermission("finance:write", async (user) => {
    const parsed = payDueSchema.safeParse({ method: field(formData, "method"), paidOn: field(formData, "paidOn") });
    if (!parsed.success) return zodErrorState(parsed.error);
    const paidOn = entryDate(parsed.data.paidOn);
    if (!paidOn) return { error: "Revise os campos destacados.", fieldErrors: { paidOn: ["Data inválida."] } };
    if (paidOn.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      return { error: "Revise os campos destacados.", fieldErrors: { paidOn: ["A data não pode estar no futuro."] } };
    }
    await payDue(dueId, parsed.data.method, paidOn, user.id);
    return { ok: true, message: "Pagamento registrado." };
  });
}

export async function waiveDueAction(dueId: string, formData: FormData): Promise<ActionState> {
  return withPermission("finance:write", async (user) => {
    const parsed = waiveSchema.safeParse({ reason: field(formData, "reason") });
    if (!parsed.success) return zodErrorState(parsed.error);
    await setDueWaived(dueId, parsed.data.reason, user.id);
    return { ok: true, message: "Mensalidade isenta." };
  });
}

export async function unwaiveDueAction(dueId: string): Promise<ActionState> {
  return withPermission("finance:write", async (user) => {
    await setDueWaived(dueId, null, user.id);
    return { ok: true };
  });
}

export async function createAgreementAction(formData: FormData): Promise<ActionState> {
  return withPermission("finance:write", async (user) => {
    const parsed = agreementSchema.safeParse({
      kind: field(formData, "kind"),
      name: field(formData, "name"),
      sponsorId: field(formData, "sponsorId"),
      agreed: field(formData, "agreed"),
      startsOn: field(formData, "startsOn"),
      endsOn: field(formData, "endsOn"),
      notes: field(formData, "notes"),
    });
    if (!parsed.success) return zodErrorState(parsed.error);
    const data = parsed.data;

    const startsOn = data.startsOn ? saoPauloLocalToUtc(`${data.startsOn}T12:00`) : null;
    const endsOn = data.endsOn ? saoPauloLocalToUtc(`${data.endsOn}T12:00`) : null;
    if (data.startsOn && !startsOn) return { error: "Revise os campos destacados.", fieldErrors: { startsOn: ["Data inválida."] } };
    if (data.endsOn && !endsOn) return { error: "Revise os campos destacados.", fieldErrors: { endsOn: ["Data inválida."] } };
    if (startsOn && endsOn && endsOn < startsOn) return { error: "Revise os campos destacados.", fieldErrors: { endsOn: ["O fim deve ser depois do início."] } };
    if (data.sponsorId && !(await prisma.sponsor.findUnique({ where: { id: data.sponsorId }, select: { id: true } }))) {
      return { error: "Revise os campos destacados.", fieldErrors: { sponsorId: ["Patrocinador não encontrado."] } };
    }

    const agreement = await prisma.financeAgreement.create({
      data: { kind: data.kind, name: data.name, sponsorId: data.sponsorId, agreedCents: data.agreed, startsOn, endsOn, notes: data.notes },
    });
    await audit({
      userId: user.id,
      action: "finance.agreement.create",
      entity: "FinanceAgreement",
      entityId: agreement.id,
      summary: `Registrou acordo de ${formatMoney(agreement.agreedCents)} com ${agreement.name}`,
      after: { kind: agreement.kind, agreedCents: agreement.agreedCents },
    });
    return { ok: true, message: "Acordo registrado." };
  });
}

export async function toggleAgreementAction(agreementId: string): Promise<ActionState> {
  return withPermission("finance:write", async (user) => {
    const agreement = await prisma.financeAgreement.findUnique({ where: { id: agreementId } });
    if (!agreement) return { error: "Acordo não encontrado." };
    await prisma.financeAgreement.update({ where: { id: agreementId }, data: { isActive: !agreement.isActive } });
    await audit({
      userId: user.id,
      action: "finance.agreement.toggle",
      entity: "FinanceAgreement",
      entityId: agreementId,
      summary: `${agreement.isActive ? "Encerrou" : "Reativou"} o acordo com ${agreement.name}`,
    });
    return { ok: true };
  });
}
