"use server";

import { field, zodErrorState, type ActionState } from "@/lib/action";
import { withPermission } from "@/lib/auth/guard";
import { saoPauloLocalToUtc } from "@/lib/datetime";
import { matchSchema } from "@/lib/validation/football";
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
