import type { NextRequest } from "next/server";
import { ok, serverError } from "@/lib/api";
import { listPublicNews } from "@/modules/news/service";
import { withRateLimit, rateLimitHeaders, SEARCH_RATE_LIMIT } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** GET /api/news?pagina=1&busca=<termo>&categoria=<slug> — somente notícias publicadas. */
export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, "api/news", SEARCH_RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimit.response;

  const query = request.nextUrl.searchParams;
  try {
    const result = await listPublicNews({
      page: Number(query.get("pagina")) || 1,
      search: query.get("busca") ?? undefined,
      categorySlug: query.get("categoria")?.slice(0, 100) || undefined,
    });
    return ok(
      {
        page: result.page,
        pages: result.pages,
        total: result.total,
        items: result.items.map((article) => ({
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          category: article.category ? { name: article.category.name, slug: article.category.slug } : null,
          publishedAt: article.publishedAt?.toISOString() ?? null,
        })),
      },
      { headers: rateLimitHeaders({ ...rateLimit, maxRequests: SEARCH_RATE_LIMIT.maxRequests }) },
    );
  } catch (error) {
    return serverError(error);
  }
}
