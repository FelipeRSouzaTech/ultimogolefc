import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { isPubliclyVisible, publicationLabel } from "@/modules/news/rules";
import { listCategories } from "@/modules/news/service";
import { deleteNewsAction, saveNewsAction } from "../actions";
import { NewsForm } from "../news-form";

export const metadata: Metadata = { title: "Editar notícia" };

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("news:read");
  const { id } = await params;
  const [article, categories] = await Promise.all([prisma.newsArticle.findUnique({ where: { id } }), listCategories()]);
  if (!article) notFound();
  const canWrite = can(user.role, "news:write");

  return (
    <>
      <AdminHeading title="Editar notícia" description={`Estado atual: ${publicationLabel(article)}`}>
        <Link href="/admin/noticias" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
        <Link href={`/admin/noticias/${article.id}/previa`} className="btn btn-secondary btn-sm">
          Pré-visualizar
        </Link>
        {isPubliclyVisible(article) ? (
          <Link href={`/noticias/${article.slug}`} className="btn btn-secondary btn-sm">
            Ver no portal
          </Link>
        ) : null}
        {can(user.role, "news:delete") ? (
          <ConfirmButton action={deleteNewsAction.bind(null, article.id)} label="Excluir" confirmMessage={`Excluir definitivamente a notícia "${article.title}"?`} />
        ) : null}
      </AdminHeading>
      {canWrite ? (
        <Panel className="max-w-3xl">
          <NewsForm action={saveNewsAction.bind(null, article.id)} categories={categories} canPublish={can(user.role, "news:publish")} values={article} />
        </Panel>
      ) : (
        <>
          <ReadOnlyNotice />
          <Panel className="max-w-3xl">
            <h2 className="text-xl">{article.title}</h2>
            <p className="mt-2 text-gray-600">{article.summary}</p>
          </Panel>
        </>
      )}
    </>
  );
}
