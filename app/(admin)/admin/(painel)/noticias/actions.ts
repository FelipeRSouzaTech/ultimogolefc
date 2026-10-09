"use server";

import { prisma } from "@/lib/db/prisma";
import { field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { saoPauloLocalToUtc } from "@/lib/datetime";
import { slugify, uniqueSlug } from "@/lib/slug";
import { categorySchema, newsSchema } from "@/lib/validation/news";
import { resolvePublishedAt } from "@/modules/news/rules";

export async function saveNewsAction(id: string | null, formData: FormData): Promise<ActionState> {
  return withPermission("news:write", async (user) => {
    const parsed = newsSchema.safeParse({
      title: field(formData, "title"),
      slug: field(formData, "slug"),
      summary: field(formData, "summary"),
      content: field(formData, "content"),
      categoryId: field(formData, "categoryId"),
      authorName: field(formData, "authorName"),
      seoTitle: field(formData, "seoTitle"),
      seoDescription: field(formData, "seoDescription"),
      status: field(formData, "status"),
      publishedAt: field(formData, "publishedAt"),
    });
    if (!parsed.success) return zodErrorState(parsed.error);
    const data = parsed.data;

    const previous = id ? await prisma.newsArticle.findUnique({ where: { id } }) : null;
    if (id && !previous) return { error: "Notícia não encontrada." };

    // Publicar, agendar ou arquivar exige permissão própria, verificada aqui no servidor.
    const changesPublication = data.status !== "DRAFT" || (previous !== null && previous.status !== "DRAFT");
    if (changesPublication && !can(user.role, "news:publish")) {
      return { error: "Você não tem permissão para publicar, agendar ou arquivar notícias." };
    }

    let requested: Date | null = null;
    if (data.publishedAt) {
      requested = saoPauloLocalToUtc(data.publishedAt);
      if (!requested) return { error: "Revise os campos destacados.", fieldErrors: { publishedAt: ["Informe data e horário válidos."] } };
    }
    if (data.categoryId && !(await prisma.newsCategory.findUnique({ where: { id: data.categoryId }, select: { id: true } }))) {
      return { error: "Revise os campos destacados.", fieldErrors: { categoryId: ["Categoria não encontrada."] } };
    }

    const slug = await uniqueSlug(data.slug || data.title, async (candidate) => {
      const found = await prisma.newsArticle.findUnique({ where: { slug: candidate }, select: { id: true } });
      return found !== null && found.id !== id;
    });
    const payload = {
      title: data.title,
      slug,
      summary: data.summary,
      content: data.content,
      status: data.status,
      publishedAt: resolvePublishedAt(data.status, requested, previous?.publishedAt ?? null),
      categoryId: data.categoryId,
      authorName: data.authorName,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    };

    const saved = await prisma.$transaction(async (tx) => {
      const article = id
        ? await tx.newsArticle.update({ where: { id }, data: payload })
        : await tx.newsArticle.create({ data: { ...payload, authorId: user.id } });
      await audit(
        {
          userId: user.id,
          action: id ? "news.update" : "news.create",
          entity: "NewsArticle",
          entityId: article.id,
          summary: `${id ? "Editou" : "Criou"} a notícia "${article.title}" (${article.status})`,
          before: previous ? { status: previous.status, title: previous.title } : undefined,
          after: { status: article.status, title: article.title, publishedAt: article.publishedAt?.toISOString() ?? null },
        },
        tx,
      );
      return article;
    });

    return { ok: true, message: "Notícia salva.", redirectTo: id ? undefined : `/admin/noticias/${saved.id}` };
  });
}

export async function deleteNewsAction(id: string): Promise<ActionState> {
  return withPermission("news:delete", async (user) => {
    const article = await prisma.newsArticle.findUnique({ where: { id } });
    if (!article) return { error: "Notícia não encontrada." };
    await prisma.$transaction(async (tx) => {
      await tx.newsArticle.delete({ where: { id } });
      await audit(
        { userId: user.id, action: "news.delete", entity: "NewsArticle", entityId: id, summary: `Excluiu a notícia "${article.title}"`, before: { title: article.title, status: article.status } },
        tx,
      );
    });
    return { ok: true, redirectTo: "/admin/noticias" };
  });
}

export async function createCategoryAction(formData: FormData): Promise<ActionState> {
  return withPermission("news:write", async (user) => {
    const parsed = categorySchema.safeParse({ name: field(formData, "name") });
    if (!parsed.success) return zodErrorState(parsed.error);
    const slug = slugify(parsed.data.name);
    if (!slug) return { error: "Revise os campos destacados.", fieldErrors: { name: ["Use letras ou números no nome."] } };
    const existing = await prisma.newsCategory.findFirst({ where: { OR: [{ slug }, { name: { equals: parsed.data.name, mode: "insensitive" } }] } });
    if (existing) return { error: "Revise os campos destacados.", fieldErrors: { name: ["Já existe uma categoria com este nome."] } };
    const category = await prisma.newsCategory.create({ data: { name: parsed.data.name, slug } });
    await audit({ userId: user.id, action: "category.create", entity: "NewsCategory", entityId: category.id, summary: `Criou a categoria "${category.name}"` });
    return { ok: true, message: "Categoria criada." };
  });
}

export async function deleteCategoryAction(id: string): Promise<ActionState> {
  return withPermission("news:delete", async (user) => {
    const category = await prisma.newsCategory.findUnique({ where: { id } });
    if (!category) return { error: "Categoria não encontrada." };
    await prisma.newsCategory.delete({ where: { id } });
    await audit({ userId: user.id, action: "category.delete", entity: "NewsCategory", entityId: id, summary: `Excluiu a categoria "${category.name}"` });
    return { ok: true };
  });
}
