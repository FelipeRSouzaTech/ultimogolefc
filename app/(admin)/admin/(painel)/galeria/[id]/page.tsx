import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field } from "@/components/ui/field";
import { SmartImage } from "@/components/ui/smart-image";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { keyToPath } from "@/modules/media/rules";
import { addGalleryImageAction, deleteGalleryAction, removeGalleryImageAction, saveGalleryAction, updateGalleryImageAction } from "../actions";
import { GalleryForm } from "../gallery-form";

export const metadata: Metadata = { title: "Álbum" };

export default async function GalleryAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("content:read");
  const { id } = await params;
  const gallery = await prisma.gallery.findUnique({
    where: { id },
    include: { images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { media: true } } },
  });
  if (!gallery) notFound();
  const canWrite = can(user.role, "content:write");

  return (
    <>
      <AdminHeading title={gallery.title} description={`${gallery.images.length} foto(s) · ${gallery.isPublished ? "publicado" : "arquivado"}`}>
        <Link href="/admin/galeria" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
        {gallery.isPublished ? (
          <Link href={`/galeria/${gallery.slug}`} className="btn btn-secondary btn-sm">
            Ver no portal
          </Link>
        ) : null}
        {canWrite ? (
          <ConfirmButton action={deleteGalleryAction.bind(null, gallery.id)} label="Excluir álbum" confirmMessage={`Excluir o álbum "${gallery.title}" e todas as suas fotos? Para apenas tirá-lo do portal, desmarque "Publicado".`} />
        ) : null}
      </AdminHeading>
      {canWrite ? null : <ReadOnlyNotice />}

      {canWrite ? (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Dados do álbum">
            <GalleryForm action={saveGalleryAction.bind(null, gallery.id)} values={gallery} />
          </Panel>
          <Panel title="Adicionar foto">
            <ActionForm action={addGalleryImageAction.bind(null, gallery.id)} submitLabel="Enviar foto" pendingLabel="Enviando…" className="space-y-4" resetOnSuccess>
              <Field name="file" label="Imagem" hint="PNG, JPG ou WebP, até 5 MB. Uma foto por envio.">
                <input id="file" name="file" type="file" accept="image/png,image/jpeg,image/webp" required className="input" />
              </Field>
              <Field name="altText" label="Texto alternativo" hint="Descreva o que aparece na foto, para quem usa leitor de tela.">
                <input id="altText" name="altText" className="input" required maxLength={200} />
              </Field>
              <Field name="caption" label="Legenda" hint="Opcional.">
                <input id="caption" name="caption" className="input" maxLength={300} />
              </Field>
            </ActionForm>
          </Panel>
        </div>
      ) : null}

      <Panel title="Fotos do álbum">
        {gallery.images.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhuma foto neste álbum.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {gallery.images.map((image) => (
              <li key={image.id} className="rounded-lg border border-gray-100 p-3">
                <SmartImage src={keyToPath(image.media.key)} alt={image.altText} width={480} height={320} className="aspect-[3/2] w-full rounded-md bg-gray-50 object-cover" />
                {canWrite ? (
                  <>
                    <ActionForm action={updateGalleryImageAction.bind(null, image.id)} submitLabel="Salvar" submitClassName="btn btn-secondary btn-sm" className="mt-3 space-y-3">
                      <div>
                        <label className="label" htmlFor={`alt-${image.id}`}>
                          Texto alternativo
                        </label>
                        <input id={`alt-${image.id}`} name="altText" className="input" defaultValue={image.altText} required maxLength={200} />
                      </div>
                      <div>
                        <label className="label" htmlFor={`caption-${image.id}`}>
                          Legenda
                        </label>
                        <input id={`caption-${image.id}`} name="caption" className="input" defaultValue={image.caption ?? ""} maxLength={300} />
                      </div>
                      <div>
                        <label className="label" htmlFor={`order-${image.id}`}>
                          Ordem
                        </label>
                        <input id={`order-${image.id}`} name="sortOrder" type="number" min={0} max={9999} className="input" defaultValue={image.sortOrder} />
                      </div>
                    </ActionForm>
                    <div className="mt-3">
                      <ConfirmButton action={removeGalleryImageAction.bind(null, image.id)} label="Remover foto" confirmMessage="Remover esta foto do álbum?" />
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-gray-600">{image.caption ?? image.altText}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
