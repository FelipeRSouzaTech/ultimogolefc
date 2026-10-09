import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { formatDateTime } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { parseContent, publicationLabel } from "@/modules/news/rules";

export const metadata: Metadata = { title: "Pré-visualização" };

export default async function PreviewNewsPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("news:read");
  const { id } = await params;
  const article = await prisma.newsArticle.findUnique({ where: { id }, include: { category: true } });
  if (!article) notFound();

  return (
    <>
      <AdminHeading title="Pré-visualização" description={`Estado: ${publicationLabel(article)}. Esta página só é visível no painel.`}>
        <Link href={`/admin/noticias/${article.id}`} className="btn btn-secondary btn-sm">
          Voltar à edição
        </Link>
      </AdminHeading>
      <article className="card mx-auto max-w-3xl p-6 sm:p-10">
        <p className="eyebrow">{article.category?.name ?? "Notícias"}</p>
        <h2 className="mt-2 text-3xl">{article.title}</h2>
        <p className="mt-4 text-lg text-gray-600">{article.summary}</p>
        <p className="mt-4 border-b border-gray-100 pb-6 text-sm text-gray-600">
          {article.authorName ? `Por ${article.authorName} · ` : ""}
          {article.publishedAt ? formatDateTime(article.publishedAt) : "Sem data de publicação"}
        </p>
        <div className="prose-news mt-8">
          {parseContent(article.content).map((block, index) =>
            block.type === "heading" ? <h3 key={index} className="mb-3 mt-8 text-xl">{block.text}</h3> : <p key={index}>{block.text}</p>,
          )}
        </div>
      </article>
    </>
  );
}
