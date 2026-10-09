"use server";

import { prisma } from "@/lib/db/prisma";
import { BusinessError, field, zodErrorState, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { withPermission } from "@/lib/auth/guard";
import { saoPauloLocalToUtc } from "@/lib/datetime";
import { uniqueSlug } from "@/lib/slug";
import { galleryImageSchema, gallerySchema } from "@/lib/validation/site";
import { nextSortOrder } from "@/modules/gallery/rules";
import { deleteMediaIfUnused, storeImage } from "@/modules/media/service";

export async function saveGalleryAction(id: string | null, formData: FormData): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const parsed = gallerySchema.safeParse({
      title: field(formData, "title"),
      description: field(formData, "description"),
      category: field(formData, "category"),
      eventDate: field(formData, "eventDate"),
      isPublished: formData.get("isPublished") === "on",
    });
    if (!parsed.success) return zodErrorState(parsed.error);

    // Meio-dia de Brasília: a data não muda de dia em nenhum fuso ao ser exibida.
    const eventDate = parsed.data.eventDate ? saoPauloLocalToUtc(`${parsed.data.eventDate}T12:00`) : null;
    if (parsed.data.eventDate && !eventDate) return { error: "Revise os campos destacados.", fieldErrors: { eventDate: ["Data inválida."] } };
    const data = { ...parsed.data, eventDate };

    let gallery;
    if (id) {
      if (!(await prisma.gallery.findUnique({ where: { id }, select: { id: true } }))) return { error: "Álbum não encontrado." };
      gallery = await prisma.gallery.update({ where: { id }, data });
    } else {
      const slug = await uniqueSlug(parsed.data.title, async (candidate) => (await prisma.gallery.findUnique({ where: { slug: candidate }, select: { id: true } })) !== null);
      gallery = await prisma.gallery.create({ data: { ...data, slug } });
    }
    await audit({
      userId: user.id,
      action: id ? "gallery.update" : "gallery.create",
      entity: "Gallery",
      entityId: gallery.id,
      summary: `${id ? "Editou" : "Criou"} o álbum "${gallery.title}" (${gallery.isPublished ? "publicado" : "não publicado"})`,
    });
    return { ok: true, message: "Álbum salvo.", redirectTo: id ? undefined : `/admin/galeria/${gallery.id}` };
  });
}

export async function deleteGalleryAction(id: string): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const gallery = await prisma.gallery.findUnique({ where: { id }, include: { images: { include: { media: true } } } });
    if (!gallery) return { error: "Álbum não encontrado." };
    await prisma.gallery.delete({ where: { id } });
    // Remove do armazenamento os arquivos que ficaram sem uso.
    for (const image of gallery.images) await deleteMediaIfUnused(image.media.key);
    await audit({ userId: user.id, action: "gallery.delete", entity: "Gallery", entityId: id, summary: `Excluiu o álbum "${gallery.title}" e ${gallery.images.length} imagem(ns)` });
    return { ok: true, redirectTo: "/admin/galeria" };
  });
}

export async function addGalleryImageAction(galleryId: string, formData: FormData): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const parsed = galleryImageSchema.safeParse({
      altText: field(formData, "altText"),
      caption: field(formData, "caption"),
      sortOrder: "0",
    });
    if (!parsed.success) return zodErrorState(parsed.error);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Revise os campos destacados.", fieldErrors: { file: ["Selecione uma imagem."] } };

    const gallery = await prisma.gallery.findUnique({ where: { id: galleryId }, include: { images: { select: { sortOrder: true } } } });
    if (!gallery) return { error: "Álbum não encontrado." };

    let stored;
    try {
      stored = await storeImage(file, user.id);
    } catch (error) {
      if (error instanceof BusinessError) return { error: "Revise os campos destacados.", fieldErrors: { file: [error.message] } };
      throw error;
    }
    await prisma.galleryImage.create({
      data: {
        galleryId,
        mediaId: stored.asset.id,
        altText: parsed.data.altText,
        caption: parsed.data.caption,
        sortOrder: nextSortOrder(gallery.images.map((image) => image.sortOrder)),
      },
    });
    await audit({ userId: user.id, action: "gallery.image.add", entity: "Gallery", entityId: galleryId, summary: `Adicionou uma imagem ao álbum "${gallery.title}"` });
    return { ok: true, message: "Imagem adicionada." };
  });
}

export async function updateGalleryImageAction(imageId: string, formData: FormData): Promise<ActionState> {
  return withPermission("content:write", async () => {
    const parsed = galleryImageSchema.safeParse({
      altText: field(formData, "altText"),
      caption: field(formData, "caption"),
      sortOrder: field(formData, "sortOrder") || "0",
    });
    if (!parsed.success) return zodErrorState(parsed.error);
    if (!(await prisma.galleryImage.findUnique({ where: { id: imageId }, select: { id: true } }))) return { error: "Imagem não encontrada." };
    await prisma.galleryImage.update({ where: { id: imageId }, data: parsed.data });
    return { ok: true, message: "Imagem atualizada." };
  });
}

export async function removeGalleryImageAction(imageId: string): Promise<ActionState> {
  return withPermission("content:write", async (user) => {
    const image = await prisma.galleryImage.findUnique({ where: { id: imageId }, include: { media: true, gallery: true } });
    if (!image) return { error: "Imagem não encontrada." };
    await prisma.galleryImage.delete({ where: { id: imageId } });
    await deleteMediaIfUnused(image.media.key);
    await audit({ userId: user.id, action: "gallery.image.remove", entity: "Gallery", entityId: image.galleryId, summary: `Removeu uma imagem do álbum "${image.gallery.title}"` });
    return { ok: true };
  });
}
