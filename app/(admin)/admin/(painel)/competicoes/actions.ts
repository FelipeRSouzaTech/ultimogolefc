"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { uniqueSlug } from "@/lib/slug";
import { competitionSchema, seasonSchema } from "@/lib/validation/football";

export async function saveCompetitionAction(id: string | null, formData: FormData): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    const parsed = competitionSchema.safeParse({
      name: field(formData, "name"),
      description: field(formData, "description"),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) return zodErrorState(parsed.error);

    const duplicate = await prisma.competition.findFirst({
      where: { name: { equals: parsed.data.name, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) },
      select: { id: true },
    });
    if (duplicate) return { error: "Revise os campos destacados.", fieldErrors: { name: ["Já existe uma competição com este nome."] } };

    let competition;
    if (id) {
      if (!(await prisma.competition.findUnique({ where: { id }, select: { id: true } }))) return { error: "Competição não encontrada." };
      competition = await prisma.competition.update({ where: { id }, data: parsed.data });
    } else {
      const slug = await uniqueSlug(parsed.data.name, async (candidate) => (await prisma.competition.findUnique({ where: { slug: candidate }, select: { id: true } })) !== null);
      competition = await prisma.competition.create({ data: { ...parsed.data, slug } });
    }
    await audit({
      userId: user.id,
      action: id ? "competition.update" : "competition.create",
      entity: "Competition",
      entityId: competition.id,
      summary: `${id ? "Editou" : "Criou"} a competição "${competition.name}"`,
    });
    return { ok: true, message: "Competição salva.", redirectTo: id ? undefined : `/admin/competicoes/${competition.id}` };
  });
}

export async function deleteCompetitionAction(id: string): Promise<ActionState> {
  return withPermission("football:delete", async (user) => {
    const competition = await prisma.competition.findUnique({ where: { id }, include: { _count: { select: { seasons: true } } } });
    if (!competition) return { error: "Competição não encontrada." };
    if (competition._count.seasons > 0) return { error: "Exclua as temporadas desta competição antes de excluí-la." };
    await prisma.competition.delete({ where: { id } });
    await audit({ userId: user.id, action: "competition.delete", entity: "Competition", entityId: id, summary: `Excluiu a competição "${competition.name}"` });
    return { ok: true, redirectTo: "/admin/competicoes" };
  });
}

export async function saveSeasonAction(competitionId: string, seasonId: string | null, formData: FormData): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    const parsed = seasonSchema.safeParse({
      label: field(formData, "label"),
      regulation: field(formData, "regulation"),
      pointsWin: field(formData, "pointsWin"),
      pointsDraw: field(formData, "pointsDraw"),
      pointsLoss: field(formData, "pointsLoss"),
      // A ordem dos critérios vem de campos numerados (tiebreaker1, tiebreaker2…); vazios e repetidos são descartados.
      tiebreakers: [1, 2, 3, 4, 5]
        .map((position) => field(formData, `tiebreaker${position}`))
        .filter((value, index, all) => value !== "" && all.indexOf(value) === index),
      standingsMode: field(formData, "standingsMode"),
      isCurrent: formData.get("isCurrent") === "on",
    });
    if (!parsed.success) return zodErrorState(parsed.error);

    const competition = await prisma.competition.findUnique({ where: { id: competitionId }, select: { id: true, name: true } });
    if (!competition) return { error: "Competição não encontrada." };

    const duplicate = await prisma.season.findFirst({
      where: { competitionId, label: parsed.data.label, ...(seasonId ? { id: { not: seasonId } } : {}) },
      select: { id: true },
    });
    if (duplicate) return { error: "Revise os campos destacados.", fieldErrors: { label: ["Esta competição já tem uma temporada com este nome."] } };

    let season;
    if (seasonId) {
      const existing = await prisma.season.findUnique({ where: { id: seasonId }, select: { competitionId: true } });
      if (!existing || existing.competitionId !== competitionId) return { error: "Temporada não encontrada." };
      season = await prisma.season.update({ where: { id: seasonId }, data: parsed.data });
    } else {
      season = await prisma.season.create({ data: { ...parsed.data, competitionId } });
    }
    await audit({
      userId: user.id,
      action: seasonId ? "season.update" : "season.create",
      entity: "Season",
      entityId: season.id,
      summary: `${seasonId ? "Editou" : "Criou"} a temporada ${season.label} de "${competition.name}"`,
      after: { pointsWin: season.pointsWin, pointsDraw: season.pointsDraw, pointsLoss: season.pointsLoss, tiebreakers: season.tiebreakers, standingsMode: season.standingsMode },
    });
    return { ok: true, message: "Temporada salva.", redirectTo: seasonId ? undefined : `/admin/competicoes/temporadas/${season.id}` };
  });
}

export async function deleteSeasonAction(seasonId: string): Promise<ActionState> {
  return withPermission("football:delete", async (user) => {
    const season = await prisma.season.findUnique({ where: { id: seasonId }, include: { competition: true, _count: { select: { matches: true } } } });
    if (!season) return { error: "Temporada não encontrada." };
    if (season._count.matches > 0) return { error: "Esta temporada tem partidas cadastradas e não pode ser excluída." };
    await prisma.season.delete({ where: { id: seasonId } });
    await audit({ userId: user.id, action: "season.delete", entity: "Season", entityId: seasonId, summary: `Excluiu a temporada ${season.label} de "${season.competition.name}"` });
    return { ok: true, redirectTo: `/admin/competicoes/${season.competitionId}` };
  });
}

/** Define os participantes da temporada. Não permite remover clube que já tenha partida nela. */
export async function setParticipantsAction(seasonId: string, formData: FormData): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    const requested = [...new Set(formData.getAll("clubIds").filter((value): value is string => typeof value === "string" && value !== ""))];

    return prisma.$transaction(async (tx) => {
      const season = await tx.season.findUnique({ where: { id: seasonId }, include: { teams: true, competition: true } });
      if (!season) return { error: "Temporada não encontrada." };

      const validClubs = await tx.club.findMany({ where: { id: { in: requested } }, select: { id: true } });
      if (validClubs.length !== requested.length) return { error: "Um dos clubes selecionados não existe mais. Recarregue a página." };

      const current = season.teams.map((team) => team.clubId);
      const toRemove = current.filter((clubId) => !requested.includes(clubId));
      const toAdd = requested.filter((clubId) => !current.includes(clubId));

      if (toRemove.length > 0) {
        const blocked = await tx.match.findFirst({
          where: { seasonId, OR: [{ homeTeamId: { in: toRemove } }, { awayTeamId: { in: toRemove } }] },
          include: { homeTeam: true, awayTeam: true },
        });
        if (blocked) {
          const club = toRemove.includes(blocked.homeTeamId) ? blocked.homeTeam : blocked.awayTeam;
          return { error: `"${club.name}" já tem partidas nesta temporada e não pode ser removido dos participantes.` };
        }
        await tx.competitionTeam.deleteMany({ where: { seasonId, clubId: { in: toRemove } } });
      }
      if (toAdd.length > 0) {
        await tx.competitionTeam.createMany({ data: toAdd.map((clubId) => ({ seasonId, clubId })) });
      }
      await audit(
        {
          userId: user.id,
          action: "season.participants",
          entity: "Season",
          entityId: seasonId,
          summary: `Atualizou os participantes da temporada ${season.label} de "${season.competition.name}"`,
          before: { clubIds: current },
          after: { clubIds: requested },
        },
        tx,
      );
      return { ok: true, message: "Participantes atualizados." };
    });
  });
}
