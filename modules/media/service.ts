import "server-only";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { BusinessError } from "@/lib/action";
import { getStorage } from "@/lib/storage";
import { buildKey, detectImageType, IMAGE_TYPES, inspectImage, keyToPath } from "./rules";

/** Valida a imagem, grava o arquivo no armazenamento e registra os metadados no banco. */
export async function storeImage(file: File, userId: string) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspection = inspectImage(bytes, file.name);
  if (!inspection.ok) throw new BusinessError(inspection.error);

  const key = buildKey(randomBytes(12).toString("hex"), inspection.extension);
  const storage = getStorage();
  await storage.put(key, bytes, inspection.mime);
  try {
    const asset = await prisma.mediaAsset.create({
      data: { key, mimeType: inspection.mime, size: bytes.length, originalName: file.name.slice(0, 200), uploadedById: userId },
    });
    return { asset, path: keyToPath(key) };
  } catch (error) {
    // Sem registro no banco o arquivo ficaria órfão: remove antes de propagar o erro.
    await storage.remove(key).catch(() => undefined);
    throw error;
  }
}

/** Grava uma imagem gerada pelo sistema (ex.: arte automática do Instagram). Sem usuário: quem gerou foi o portal. */
export async function storeGeneratedImage(bytes: Uint8Array, originalName: string) {
  const mime = detectImageType(bytes);
  if (!mime) throw new Error("Imagem gerada em formato desconhecido.");
  const key = buildKey(randomBytes(12).toString("hex"), IMAGE_TYPES[mime]);
  const storage = getStorage();
  const data = new Uint8Array(bytes);
  await storage.put(key, data, mime);
  try {
    await prisma.mediaAsset.create({ data: { key, mimeType: mime, size: data.length, originalName: originalName.slice(0, 200) } });
    return keyToPath(key);
  } catch (error) {
    await storage.remove(key).catch(() => undefined);
    throw error;
  }
}

/** Lista onde um arquivo enviado está em uso. Vazio = pode ser excluído. */
export async function findMediaUsage(key: string): Promise<string[]> {
  const path = keyToPath(key);
  const [galleries, clubs, athletes, sponsors, articles, settings, instagramPosts] = await Promise.all([
    prisma.galleryImage.count({ where: { media: { key } } }),
    prisma.club.count({ where: { crestPath: path } }),
    prisma.athlete.count({ where: { photoPath: path } }),
    prisma.sponsor.count({ where: { logoPath: path } }),
    prisma.newsArticle.count({ where: { coverPath: path } }),
    prisma.siteSetting.count({ where: { value: path } }),
    prisma.instagramPost.count({ where: { OR: [{ imagePath: path }, { publishImagePath: path }] } }),
  ]);
  const usage: string[] = [];
  if (galleries) usage.push("galeria");
  if (clubs) usage.push("escudo de clube");
  if (athletes) usage.push("foto de jogador");
  if (sponsors) usage.push("logotipo de patrocinador");
  if (articles) usage.push("capa de notícia");
  if (settings) usage.push("configurações do site");
  if (instagramPosts) usage.push("publicação do Instagram");
  return usage;
}

/** Exclui o arquivo e o registro, desde que não esteja em uso. Devolve false quando estava em uso. */
export async function deleteMediaIfUnused(key: string): Promise<boolean> {
  if ((await findMediaUsage(key)).length > 0) return false;
  await prisma.mediaAsset.deleteMany({ where: { key } });
  await getStorage().remove(key);
  return true;
}
