import "server-only";

import { prisma } from "@/lib/db/prisma";

/** Patrocinadores visíveis no portal: ativos e dentro da vigência. */
export async function listVisibleSponsors(now: Date = new Date()) {
  return prisma.sponsor.findMany({
    where: {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
