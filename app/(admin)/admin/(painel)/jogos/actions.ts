"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { saoPauloLocalToUtc } from "@/lib/datetime";
import { matchEventSchema, matchSchema } from "@/lib/validation/football";
import { EVENT_TYPE_LABELS, LINEUP_ROLES, validateLineup, type LineupEntry, type LineupRole } from "@/modules/matches/events";
import { deleteMatch, MatchValidationError, saveMatch } from "@/modules/matches/service";

export async function saveMatchAction(id: string | null, formData: FormData): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    const parsed = matchSchema.safeParse({
      seasonId: field(formData, "seasonId"),
      homeTeamId: field(formData, "homeTeamId"),
      awayTeamId: field(formData, "awayTeamId"),
      kickoffAt: field(formData, "kickoffAt"),
      venue: field(formData, "venue"),
      round: field(formData, "round"),
      status: field(formData, "status"),
      homeScore: field(formData, "homeScore"),
      awayScore: field(formData, "awayScore"),
      notes: field(formData, "notes"),
    });
    if (!parsed.success) return zodErrorState(parsed.error);

    const kickoffAt = saoPauloLocalToUtc(parsed.data.kickoffAt);
    if (!kickoffAt) return { error: "Revise os campos destacados.", fieldErrors: { kickoffAt: ["Informe data e horário válidos."] } };

    try {
      const match = await saveMatch({ ...parsed.data, kickoffAt }, user.id, id ?? undefined);
      return { ok: true, message: "Partida salva.", redirectTo: id ? undefined : `/admin/jogos/${match.id}` };
    } catch (error) {
      if (error instanceof MatchValidationError) return { error: "Revise os campos destacados.", fieldErrors: error.errors };
      throw error;
    }
  });
}

export async function deleteMatchAction(id: string): Promise<ActionState> {
  return withPermission("football:delete", async (user) => {
    await deleteMatch(id, user.id);
    return { ok: true, redirectTo: "/admin/jogos" };
  });
}

export async function addMatchEventAction(matchId: string, formData: FormData): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    const parsed = matchEventSchema.safeParse({
      type: field(formData, "type"),
      side: field(formData, "side"),
      minute: field(formData, "minute"),
      athleteId: field(formData, "athleteId"),
      playerName: field(formData, "playerName"),
      note: field(formData, "note"),
    });
    if (!parsed.success) return zodErrorState(parsed.error);
    const data = parsed.data;

    const match = await prisma.match.findUnique({ where: { id: matchId }, include: { homeTeam: true, awayTeam: true } });
    if (!match) return { error: "Partida não encontrada." };
    const club = data.side === "home" ? match.homeTeam : match.awayTeam;

    if (!data.athleteId && !data.playerName) {
      return { error: "Revise os campos destacados.", fieldErrors: { playerName: ["Selecione um jogador do elenco ou informe o nome."] } };
    }
    if (data.athleteId) {
      // Jogadores do elenco só podem ser ligados a lances do nosso clube.
      if (!club.isOwnClub) return { error: "Revise os campos destacados.", fieldErrors: { athleteId: ["Jogadores do elenco só valem para o nosso clube. Para o adversário, digite o nome."] } };
      if (!(await prisma.athlete.findUnique({ where: { id: data.athleteId }, select: { id: true } }))) {
        return { error: "Revise os campos destacados.", fieldErrors: { athleteId: ["Jogador não encontrado."] } };
      }
    }

    const event = await prisma.matchEvent.create({
      data: { matchId, clubId: club.id, type: data.type, minute: data.minute, athleteId: data.athleteId, playerName: data.playerName, note: data.note },
    });
    await audit({
      userId: user.id,
      action: "match.event.add",
      entity: "Match",
      entityId: matchId,
      summary: `Lançou "${EVENT_TYPE_LABELS[data.type]}" (${club.name}) em ${match.homeTeam.name} x ${match.awayTeam.name}`,
      after: { eventId: event.id, type: data.type, minute: data.minute },
    });
    return { ok: true, message: "Lance registrado." };
  });
}

export async function removeMatchEventAction(eventId: string): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    const event = await prisma.matchEvent.findUnique({ where: { id: eventId } });
    if (!event) return { error: "Lance não encontrado." };
    await prisma.matchEvent.delete({ where: { id: eventId } });
    await audit({ userId: user.id, action: "match.event.remove", entity: "Match", entityId: event.matchId, summary: "Removeu um lance da partida", before: { type: event.type, minute: event.minute } });
    return { ok: true };
  });
}

/** Define a escalação do nosso clube na partida (substitui a anterior por inteiro, em transação). */
export async function setLineupAction(matchId: string, formData: FormData): Promise<ActionState> {
  return withPermission("football:write", async (user) => {
    const match = await prisma.match.findUnique({ where: { id: matchId }, include: { homeTeam: true, awayTeam: true } });
    if (!match) return { error: "Partida não encontrada." };
    if (!match.homeTeam.isOwnClub && !match.awayTeam.isOwnClub) return { error: "A escalação só pode ser registrada em partidas do nosso clube." };

    const athletes = await prisma.athlete.findMany({ select: { id: true } });
    const entries: LineupEntry[] = [];
    for (const athlete of athletes) {
      const role = field(formData, `role-${athlete.id}`);
      if ((LINEUP_ROLES as readonly string[]).includes(role)) entries.push({ athleteId: athlete.id, role: role as LineupRole });
    }
    const problem = validateLineup(
      entries,
      athletes.map((athlete) => athlete.id),
    );
    if (problem) return { error: problem };

    await prisma.$transaction(async (tx) => {
      await tx.matchLineupPlayer.deleteMany({ where: { matchId } });
      if (entries.length > 0) await tx.matchLineupPlayer.createMany({ data: entries.map((entry) => ({ matchId, ...entry })) });
      await audit(
        {
          userId: user.id,
          action: "match.lineup",
          entity: "Match",
          entityId: matchId,
          summary: `Atualizou a escalação de ${match.homeTeam.name} x ${match.awayTeam.name} (${entries.length} jogador(es))`,
        },
        tx,
      );
    });
    return { ok: true, message: "Escalação salva." };
  });
}
