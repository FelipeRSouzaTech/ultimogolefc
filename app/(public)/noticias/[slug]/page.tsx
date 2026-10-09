import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsCard } from "@/components/news/news-card";
import { ShareLink } from "@/components/news/share-link";
import { SmartImage } from "@/components/ui/smart-image";
import { formatDate, formatTime } from "@/lib/datetime";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { parseContent } from "@/modules/news/rules";
import { getPublicArticle, relatedArticles } from "@/modules/news/service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublicArticle(slug);
  if (!article) return { title: "Notícia não encontrada" };
  const title = article.seoTitle ?? article.title;
  const description = article.seoDescription ?? article.summary;
  return {
    title,
    description,
    alternates: { canonical: `/noticias/${article.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/noticias/${article.slug}`,
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      images: article.coverPath ? [{ url: article.coverPath }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  // Rascunhos, arquivadas e agendadas não são encontrados aqui: a consulta já filtra pela visibilidade pública.
  const article = await getPublicArticle(slug);
  if (!article) notFound();

  const related = await relatedArticles(article.id, article.categoryId);
  const url = `${SITE_URL}/noticias/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    mainEntityOfPage: url,
    author: article.authorName ? { "@type": "Person", name: article.authorName } : { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <div className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <article className="mx-auto max-w-3xl">
        <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-gray-600">
          <Link href="/noticias" className="link">
            Notícias
          </Link>
          {article.category ? (
            <>
              <span aria-hidden="true"> / </span>
              <Link href={`/noticias?categoria=${article.category.slug}`} className="link">
                {article.category.name}
              </Link>
            </>
          ) : null}
        </nav>
        <header className="border-b border-gray-100 pb-6">
          <h1 className="text-3xl sm:text-4xl">{article.title}</h1>
          <p className="mt-4 text-lg text-gray-600">{article.summary}</p>
          <p className="mt-4 text-sm text-gray-600">
            {article.authorName ? <span>Por {article.authorName} · </span> : null}
            {article.publishedAt ? (
              <time dateTime={article.publishedAt.toISOString()}>
                Publicado em {formatDate(article.publishedAt)} às {formatTime(article.publishedAt)}
              </time>
            ) : null}
          </p>
        </header>
        {article.coverPath ? (
          <SmartImage src={article.coverPath} alt="" width={1600} height={900} priority className="mt-8 aspect-video w-full rounded-lg object-cover" />
        ) : null}
        <div className="prose-news mt-8">
          {parseContent(article.content).map((block, index) =>
            block.type === "heading" ? <h2 key={index}>{block.text}</h2> : <p key={index}>{block.text}</p>,
          )}
        </div>
        <footer className="mt-10 border-t border-gray-100 pt-6">
          <p className="label">Compartilhar</p>
          <ShareLink url={url} />
        </footer>
      </article>

      {related.length > 0 ? (
        <section aria-labelledby="relacionadas" className="mt-16">
          <h2 id="relacionadas" className="section-title mb-5">
            Leia também
          </h2>
          <ul className="grid gap-6 md:grid-cols-3">
            {related.map((item) => (
              <li key={item.id}>
                <NewsCard article={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
