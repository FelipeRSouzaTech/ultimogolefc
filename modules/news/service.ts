import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const NEWS_PAGE_SIZE = 9;

/** Filtro obrigatório de toda consulta pública: publicada e com data de publicação já alcançada. */
export function publicNewsWhere(now: Date = new Date()): Prisma.NewsArticleWhereInput {
  return { status: "PUBLISHED", publishedAt: { lte: now } };
}

export type PublicNewsQuery = { page?: number; search?: string; categorySlug?: string };

export async function listPublicNews({ page = 1, search, categorySlug }: PublicNewsQuery = {}) {
  const term = search?.trim().slice(0, 80);
  const where: Prisma.NewsArticleWhereInput = {
    ...publicNewsWhere(),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(term
      ? { OR: [{ title: { contains: term, mode: "insensitive" } }, { summary: { contains: term, mode: "insensitive" } }] }
      : {}),
  };
  const total = await prisma.newsArticle.count({ where });
  const pages = Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const items = await prisma.newsArticle.findMany({
    where,
    include: { category: true },
    orderBy: { publishedAt: "desc" },
    skip: (current - 1) * NEWS_PAGE_SIZE,
    take: NEWS_PAGE_SIZE,
  });
  return { items, total, pages, page: current };
}

export async function latestPublicNews(take = 3) {
  return prisma.newsArticle.findMany({
    where: publicNewsWhere(),
    include: { category: true },
    orderBy: { publishedAt: "desc" },
    take,
  });
}

export async function getPublicArticle(slug: string) {
  return prisma.newsArticle.findFirst({ where: { slug, ...publicNewsWhere() }, include: { category: true } });
}

export async function relatedArticles(articleId: string, categoryId: string | null, take = 3) {
  return prisma.newsArticle.findMany({
    where: { ...publicNewsWhere(), id: { not: articleId }, ...(categoryId ? { categoryId } : {}) },
    include: { category: true },
    orderBy: { publishedAt: "desc" },
    take,
  });
}

export async function listCategories() {
  return prisma.newsCategory.findMany({ orderBy: { name: "asc" } });
}
