import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type AuditInput = {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
};

/** Registra uma operação crítica. Aceita um cliente de transação para gravar junto da alteração. */
export async function audit(input: AuditInput, client: Prisma.TransactionClient = prisma): Promise<void> {
  await client.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      summary: input.summary,
      before: input.before,
      after: input.after,
    },
  });
}
