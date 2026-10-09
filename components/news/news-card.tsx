import Link from "next/link";
import { formatDate } from "@/lib/datetime";

type Article = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: Date | null;
  category: { name: string } | null;
};

/** Card editorial. `featured` destaca a notícia principal. */
export function NewsCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  return (
    <article className={`card flex h-full flex-col p-5 sm:p-6 ${featured ? "border-t-4 border-t-primary" : ""}`}>
      <p className="eyebrow">{article.category?.name ?? "Notícias"}</p>
      <h3 className={`mt-2 ${featured ? "text-2xl sm:text-3xl" : "text-lg"}`}>
        <Link href={`/noticias/${article.slug}`} className="hover:text-primary hover:underline">
          {article.title}
        </Link>
      </h3>
      <p className="mt-3 flex-1 text-sm text-gray-600">{article.summary}</p>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        {article.publishedAt ? (
          <time dateTime={article.publishedAt.toISOString()} className="text-gray-600">
            {formatDate(article.publishedAt)}
          </time>
        ) : (
          <span />
        )}
        <Link href={`/noticias/${article.slug}`} className="link" aria-label={`Ler a notícia: ${article.title}`}>
          Ler notícia
        </Link>
      </div>
    </article>
  );
}
