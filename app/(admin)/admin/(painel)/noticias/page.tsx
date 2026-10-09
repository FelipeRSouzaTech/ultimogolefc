import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, ReadOnlyNotice } from "@/components/ui/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { param, type SearchParams } from "@/lib/params";
import { NEWS_STATUSES, NEWS_STATUS_LABELS, publicationLabel, type NewsStatus } from "@/modules/news/rules";

export const metadata: Metadata = { title: "Notícias" };

export default async function AdminNewsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("news:read");
  const statusParam = param(await searchParams, "status");
  const status = (NEWS_STATUSES as readonly string[]).includes(statusParam ?? "") ? (statusParam as NewsStatus) : undefined;
  const canWrite = can(user.role, "news:write");

  const articles = await prisma.newsArticle.findMany({
    where: status ? { status } : {},
    include: { category: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <>
      <AdminHeading title="Notícias" description="Rascunhos, publicações, agendamentos e arquivo.">
        <Link href="/admin/noticias/categorias" className="btn btn-secondary btn-sm">
          Categorias
        </Link>
        {canWrite ? (
          <Link href="/admin/noticias/novo" className="btn btn-primary btn-sm">
            Nova notícia
          </Link>
        ) : null}
      </AdminHeading>
      {canWrite ? null : <ReadOnlyNotice />}

      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/noticias" className={`btn btn-sm ${status ? "btn-secondary" : "btn-primary"}`}>
          Todas
        </Link>
        {NEWS_STATUSES.map((item) => (
          <Link key={item} href={`/admin/noticias?status=${item}`} className={`btn btn-sm ${status === item ? "btn-primary" : "btn-secondary"}`}>
            {NEWS_STATUS_LABELS[item]}
          </Link>
        ))}
      </nav>

      {articles.length === 0 ? (
        <EmptyState title="Nenhuma notícia" description="Crie a primeira notícia para ela aparecer aqui." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="text-left">
                  Título
                </th>
                <th scope="col">Categoria</th>
                <th scope="col">Estado</th>
                <th scope="col">Publicação</th>
                <th scope="col">Atualizada</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td className="text-left">
                    <Link href={`/admin/noticias/${article.id}`} className="font-semibold hover:text-primary hover:underline">
                      {article.title}
                    </Link>
                  </td>
                  <td>{article.category?.name ?? "—"}</td>
                  <td>
                    <span className={`badge ${article.status === "PUBLISHED" ? "badge-solid" : ""}`}>{publicationLabel(article)}</span>
                  </td>
                  <td className="whitespace-nowrap">{article.publishedAt ? formatDateTime(article.publishedAt) : "—"}</td>
                  <td className="whitespace-nowrap">{formatDateTime(article.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
