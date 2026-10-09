"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { clientInfo } from "@/lib/auth/session";
import { contactSchema } from "@/lib/validation/site";
import { CONTACT_WINDOW_MINUTES, isContactRateLimited } from "@/modules/site/contact";

const RECEIVED = "Mensagem recebida. O clube responderá pelo e-mail informado.";

/** Formulário público de contato: validação no servidor, campo-armadilha contra robôs e limite de envios. */
export async function sendContactAction(formData: FormData): Promise<ActionState> {
  // Campo invisível para pessoas; robôs costumam preenchê-lo. Respondemos como sucesso e não gravamos nada.
  if (field(formData, "website") !== "") return { ok: true, message: RECEIVED };

  const parsed = contactSchema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    subject: field(formData, "subject"),
    message: field(formData, "message"),
  });
  if (!parsed.success) return zodErrorState(parsed.error);

  try {
    const { ipAddress } = await clientInfo();
    const since = new Date(Date.now() - CONTACT_WINDOW_MINUTES * 60 * 1000);
    const [fromIp, global] = await Promise.all([
      ipAddress ? prisma.contactMessage.count({ where: { ipAddress, createdAt: { gte: since } } }) : Promise.resolve(null),
      prisma.contactMessage.count({ where: { createdAt: { gte: since } } }),
    ]);
    if (isContactRateLimited(fromIp, global)) {
      return { error: "Muitas mensagens enviadas em pouco tempo. Tente novamente mais tarde." };
    }
    await prisma.contactMessage.create({ data: { ...parsed.data, ipAddress } });
    // Nenhum e-mail é enviado por enquanto: a mensagem fica registrada no painel, e é isso que informamos.
    return { ok: true, message: RECEIVED };
  } catch (error) {
    console.error("[contato] falha ao registrar mensagem", error);
    return { error: "Não foi possível enviar a mensagem agora. Tente novamente em instantes." };
  }
}
