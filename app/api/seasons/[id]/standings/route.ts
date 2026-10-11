import { fail, ok, serverError } from "@/lib/api";
import { getSeasonStandings } from "@/modules/competitions/service";
import { withRateLimit, rateLimitHeaders, DEFAULT_RATE_LIMIT } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** GET /api/seasons/:id/standings — classificação da temporada e o modo (AUTO ou MANUAL). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = await withRateLimit(request, "api/seasons/standings", DEFAULT_RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimit.response;

  const { id } = await params;
  try {
    const standings = await getSeasonStandings(id);
    if (!standings) return fail(404, "Temporada não encontrada.");
    return ok(standings, { headers: rateLimitHeaders({ ...rateLimit, maxRequests: DEFAULT_RATE_LIMIT.maxRequests }) });
  } catch (error) {
    return serverError(error);
  }
}
