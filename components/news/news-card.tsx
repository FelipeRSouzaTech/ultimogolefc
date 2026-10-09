import Link from "next/link";
import { SmartImage } from "@/components/ui/smart-image";
import { formatDate } from "@/lib/datetime";

type Article = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: Date | null;
  coverPath?: string | null;
  category: { name: string } | null;
};

/**
 * Card editorial. `featured` destaca a notícia principal: com foto de capa, o título fica numa caixa
 * branca sobreposta à base da imagem.
 */
export function NewsCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  const overlap = featured && Boolean(article.coverPath);
  return (
    <article className={`card flex h-full flex-col overflow-hidden ${featured && !overlap ? "border-t-4 border-t-primary" : ""}`}>
      {article.coverPath ? <SmartImage src={article.coverPath} alt="" width={1600} height={900} className="aspect-video w-full object-cover" /> : null}
      <div className={`flex flex-1 flex-col p-5 sm:p-6 ${overlap ? "relative -mt-12 mr-6 rounded-tr-lg bg-white sm:-mt-20 sm:mr-[22%] sm:px-8" : ""}`}>
      <p className="eyebrow flex flex-wrap items-center gap-x-2">
        {article.publishedAt ? <time dateTime={article.publishedAt.toISOString()}>{formatDate(article.publishedAt)}</time> : null}
        {article.publishedAt ? <span aria-hidden="true">·</span> : null}
        <span className="text-gray-600">{article.category?.name ?? "Notícias"}</span>
      </p>
      <h3 className={`mt-2 ${featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg"}`}>
        <Link href={`/noticias/${article.slug}`} className="hover:text-primary hover:underline">
          {article.title}
        </Link>
      </h3>
      <p className="mt-3 flex-1 text-sm text-gray-600">{article.summary}</p>
      <div className="mt-4 text-sm">
        <Link href={`/noticias/${article.slug}`} className="link" aria-label={`Ler a notícia: ${article.title}`}>
          Ler notícia
        </Link>
      </div>
      </div>
    </article>
  );
}
