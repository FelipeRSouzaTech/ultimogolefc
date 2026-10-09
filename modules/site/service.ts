import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { buildSettings, type Settings } from "./settings";

/** Configurações do site, lidas uma vez por requisição. */
export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await prisma.siteSetting.findMany();
  return buildSettings(rows);
});
