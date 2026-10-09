import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { NewsCard } from "@/components/news/news-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { param, type SearchParams } from "@/lib/params";
import { listCategories, listPublicNews } from "@/modules/news/service";

export const metadata: Metadata = {
  title: "Notícias",
  description: "Notícias do Último Gole FC.",
  alternates: { canonical: "/noticias" },
};

function pageHref(page: number, search?: string, category?: string): string {
  const query = new URLSearchParams();
  if (search) query.set("busca", search);
  if (category) query.set("categoria", category);
  if (page > 1) query.set("pagina", String(page));
  const text = query.toString();
  return text ? `/noticias?${text}` : "/noticias";
}

export default async function NoticiasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = param(params, "busca", 80);
  const category = param(params, "categoria");
  const page = Number(param(params, "pagina")) || 1;

  const [news, categories] = await Promise.all([listPublicNews({ page, search, categorySlug: category }), listCategories()]);
  const filtered = Boolean(search || category);
  const showFeatured = news.page === 1 && !filtered;
  const [first, ...rest] = news.items;

  return (
    <>
      <PageTitle title="Notícias" subtitle="Acompanhe as novidades do Último Gole FC." />
      <div className="container-page py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Categorias" className="flex flex-wrap gap-2">
            <Link href={pageHref(1, search)} className={`btn btn-sm ${category ? "btn-secondary" : "btn-primary"}`} aria-current={category ? undefined : "page"}>
              Todas
            </Link>
            {categories.map((item) => (
              <Link
                key={item.id}
                href={pageHref(1, search, item.slug)}
                className={`btn btn-sm ${category === item.slug ? "btn-primary" : "btn-secondary"}`}
                aria-current={category === item.slug ? "page" : undefined}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <form action="/noticias" method="get" role="search" className="flex gap-2 lg:w-80">
            {category ? <input type="hidden" name="categoria" value={category} /> : null}
            <label htmlFor="busca" className="sr-only">
              Pesquisar notícias
            </label>
            <input id="busca" name="busca" type="search" className="input" placeholder="Pesquisar notícias" defaultValue={search ?? ""} maxLength={80} />
            <button type="submit" className="btn btn-primary" aria-label="Pesquisar">
              <Search aria-hidden="true" className="size-4" />
            </button>
          </form>
        </div>

        {news.items.length === 0 ? (
          <EmptyState
            title={filtered ? "Nenhuma notícia encontrada" : "Nenhuma notícia publicada"}
            description={filtered ? "Tente outra busca ou outra categoria." : "As notícias do clube aparecerão aqui assim que forem publicadas."}
          >
            {filtered ? (
              <Link href="/noticias" className="btn btn-secondary">
                Ver todas
              </Link>
            ) : null}
          </EmptyState>
        ) : (
          <>
            {showFeatured && first ? (
              <div className="mb-6">
                <NewsCard article={first} featured />
              </div>
            ) : null}
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(showFeatured ? rest : news.items).map((article) => (
                <li key={article.id}>
                  <NewsCard article={article} />
                </li>
              ))}
            </ul>
          </>
        )}

        {news.pages > 1 ? (
          <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-4">
            {news.page > 1 ? (
              <Link href={pageHref(news.page - 1, search, category)} className="btn btn-secondary btn-sm" rel="prev">
                Anterior
              </Link>
            ) : (
              <span className="btn btn-sm" aria-disabled="true">
                Anterior
              </span>
            )}
            <span className="text-sm text-gray-600">
              Página {news.page} de {news.pages}
            </span>
            {news.page < news.pages ? (
              <Link href={pageHref(news.page + 1, search, category)} className="btn btn-secondary btn-sm" rel="next">
                Próxima
              </Link>
            ) : (
              <span className="btn btn-sm" aria-disabled="true">
                Próxima
              </span>
            )}
          </nav>
        ) : null}
      </div>
    </>
  );
}
