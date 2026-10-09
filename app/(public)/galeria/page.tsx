import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { SmartImage } from "@/components/ui/smart-image";
import { formatDate } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { param, type SearchParams } from "@/lib/params";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS, isGalleryCategory, type GalleryCategory } from "@/modules/gallery/rules";
import { keyToPath } from "@/modules/media/rules";

export const metadata: Metadata = {
  title: "Galeria",
  description: "Fotos de partidas, eventos e bastidores do Último Gole FC.",
  alternates: { canonical: "/galeria" },
};

export default async function GaleriaPage({ searchParams }: { searchParams: SearchParams }) {
  const wanted = param(await searchParams, "categoria");
  const category = isGalleryCategory(wanted) ? wanted : undefined;

  // Só álbuns publicados e com pelo menos uma foto.
  const galleries = await prisma.gallery.findMany({
    where: { isPublished: true, images: { some: {} }, ...(category ? { category } : {}) },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    include: {
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1, include: { media: true } },
      _count: { select: { images: true } },
    },
    take: 60,
  });

  return (
    <>
      <PageTitle title="Galeria" subtitle="Fotos de partidas, eventos e bastidores." />
      <div className="container-page py-10">
        <nav aria-label="Categorias" className="mb-8 flex flex-wrap gap-2">
          <Link href="/galeria" className={`btn btn-sm ${category ? "btn-secondary" : "btn-primary"}`} aria-current={category ? undefined : "page"}>
            Todas
          </Link>
          {GALLERY_CATEGORIES.map((item) => (
            <Link key={item} href={`/galeria?categoria=${item}`} className={`btn btn-sm ${category === item ? "btn-primary" : "btn-secondary"}`} aria-current={category === item ? "page" : undefined}>
              {GALLERY_CATEGORY_LABELS[item]}
            </Link>
          ))}
        </nav>

        {galleries.length === 0 ? (
          <EmptyState title={category ? "Nenhum álbum nesta categoria" : "Nenhum álbum publicado"} description="As fotos do clube aparecerão aqui assim que forem publicadas." />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {galleries.map((gallery) => {
              const cover = gallery.images[0];
              return (
                <li key={gallery.id}>
                  <article className="card h-full overflow-hidden">
                    {cover ? <SmartImage src={keyToPath(cover.media.key)} alt="" width={640} height={480} className="aspect-[4/3] w-full object-cover" /> : null}
                    <div className="p-5">
                      <p className="eyebrow">{GALLERY_CATEGORY_LABELS[gallery.category as GalleryCategory]}</p>
                      <h2 className="mt-1 text-lg uppercase">
                        <Link href={`/galeria/${gallery.slug}`} className="hover:text-primary hover:underline">
                          {gallery.title}
                        </Link>
                      </h2>
                      <p className="mt-2 text-sm text-gray-600">
                        {gallery._count.images} foto(s)
                        {gallery.eventDate ? ` · ${formatDate(gallery.eventDate)}` : ""}
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
