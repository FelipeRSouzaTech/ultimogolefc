import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { GALLERY_CATEGORY_LABELS, type GalleryCategory } from "@/modules/gallery/rules";
import { saveGalleryAction } from "./actions";
import { GalleryForm } from "./gallery-form";

export const metadata: Metadata = { title: "Galeria" };

export default async function GalleriesAdminPage() {
  const user = await requirePagePermission("content:read");
  const galleries = await prisma.gallery.findMany({ orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }], include: { _count: { select: { images: true } } } });
  const canWrite = can(user.role, "content:write");

  return (
    <>
      <AdminHeading title="Galeria" description="Álbuns de fotos do portal." />
      {canWrite ? null : <ReadOnlyNotice />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Álbuns">
          {galleries.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum álbum cadastrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {galleries.map((gallery) => (
                <li key={gallery.id} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <Link href={`/admin/galeria/${gallery.id}`} className="font-semibold hover:text-primary hover:underline">
                      {gallery.title}
                    </Link>
                    <span className="block text-xs text-gray-600">
                      {GALLERY_CATEGORY_LABELS[gallery.category as GalleryCategory]} · {gallery._count.images} foto(s)
                      {gallery.eventDate ? ` · ${formatDate(gallery.eventDate)}` : ""}
                    </span>
                  </span>
                  <span className={`badge ${gallery.isPublished ? "badge-solid" : ""}`}>{gallery.isPublished ? "Publicado" : "Arquivado"}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {canWrite ? (
          <Panel title="Novo álbum">
            <GalleryForm action={saveGalleryAction.bind(null, null)} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
