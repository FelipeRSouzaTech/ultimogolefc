import "server-only";

import { prisma } from "@/lib/db/prisma";
import { resolveCategoryLabels, type AthleteCategory } from "@/modules/squad/rules";
import type { SeasonOption } from "./match-form";

/** Temporadas com seus participantes, para montar o formulário de partida. */
export async function loadSeasonOptions(): Promise<SeasonOption[]> {
  const seasons = await prisma.season.findMany({
    include: { competition: true, teams: { include: { club: { select: { id: true, name: true } } } } },
    orderBy: [{ isCurrent: "desc" }, { label: "desc" }],
  });
  return seasons.map((season) => ({
    id: season.id,
    label: `${season.competition.name} · ${season.label}`,
    clubs: season.teams.map((team) => team.club).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  }));
}

/** Nomes das categorias como aparecem no site (editáveis em Equipes). */
export async function loadCategoryLabels(): Promise<Record<AthleteCategory, string>> {
  return resolveCategoryLabels(await prisma.teamProfile.findMany({ select: { category: true, name: true } }));
}
