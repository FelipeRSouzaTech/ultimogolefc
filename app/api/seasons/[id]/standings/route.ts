import { fail, ok, serverError } from "@/lib/api";
import { getSeasonStandings } from "@/modules/competitions/service";

export const dynamic = "force-dynamic";

/** GET /api/seasons/:id/standings — classificação da temporada e o modo (AUTO ou MANUAL). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const standings = await getSeasonStandings(id);
    if (!standings) return fail(404, "Temporada não encontrada.");
    return ok(standings);
  } catch (error) {
    return serverError(error);
  }
}
