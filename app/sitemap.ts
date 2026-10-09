import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { SITE_URL } from "@/lib/site";
import { publicNewsWhere } from "@/modules/news/service";

// Gerado a cada requisição: depende do conteúdo publicado e não deve exigir banco durante o build.
export const dynamic = "force-dynamic";

const STATIC_PATHS = ["", "/jogos", "/resultados", "/competicoes", "/noticias", "/futebol", "/clube", "/patrocinadores", "/apoie", "/contato", "/privacidade"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({ url: `${SITE_URL}${path}` }));
  try {
    const [articles, competitions] = await Promise.all([
      prisma.newsArticle.findMany({ where: publicNewsWhere(), select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" }, take: 1000 }),
      prisma.competition.findMany({ select: { slug: true, updatedAt: true } }),
    ]);
    for (const article of articles) entries.push({ url: `${SITE_URL}/noticias/${article.slug}`, lastModified: article.updatedAt });
    for (const competition of competitions) entries.push({ url: `${SITE_URL}/competicoes/${competition.slug}`, lastModified: competition.updatedAt });
  } catch (error) {
    console.error("[sitemap] falha ao consultar o banco", error);
  }
  return entries;
}
