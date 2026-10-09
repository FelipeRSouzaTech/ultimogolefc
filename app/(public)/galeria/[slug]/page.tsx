import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lightbox } from "@/components/gallery/lightbox";
import { PageTitle } from "@/components/ui/page-title";
import { formatDate } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { GALLERY_CATEGORY_LABELS, type GalleryCategory } from "@/modules/gallery/rules";
import { keyToPath } from "@/modules/media/rules";

type Props = { params: Promise<{ slug: string }> };

// Álbuns arquivados não são encontrados: a consulta exige isPublished.
async function loadGallery(slug: string) {
  return prisma.gallery.findFirst({
    where: { slug, isPublished: true },
    include: { images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { media: true } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await loadGallery(slug);
  if (!gallery) return { title: "Álbum não encontrado" };
  const cover = gallery.images[0];
  return {
    title: gallery.title,
    description: gallery.description?.slice(0, 160) ?? `Álbum de fotos: ${gallery.title}.`,
    alternates: { canonical: `/galeria/${gallery.slug}` },
    openGraph: cover ? { images: [{ url: keyToPath(cover.media.key) }] } : undefined,
  };
}

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;
  const gallery = await loadGallery(slug);
  if (!gallery) notFound();

  const subtitle = [GALLERY_CATEGORY_LABELS[gallery.category as GalleryCategory], gallery.eventDate ? formatDate(gallery.eventDate) : null].filter(Boolean).join(" · ");

  return (
    <>
      <PageTitle title={gallery.title} subtitle={subtitle} />
      <div className="container-page py-10">
        <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-gray-600">
          <Link href="/galeria" className="link">
            Galeria
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{gallery.title}</span>
        </nav>
        {gallery.description ? <p className="mb-8 max-w-3xl whitespace-pre-line text-gray-600">{gallery.description}</p> : null}
        {gallery.images.length === 0 ? (
          <p className="text-gray-600">Este álbum ainda não tem fotos.</p>
        ) : (
          <Lightbox photos={gallery.images.map((image) => ({ id: image.id, src: keyToPath(image.media.key), alt: image.altText, caption: image.caption }))} />
        )}
      </div>
    </>
  );
}
