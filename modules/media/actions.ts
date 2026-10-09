"use server";

import { BusinessError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { storeImage } from "./service";

export type UploadResult = { ok: true; path: string } | { ok: false; error: string };

/** Envio de uma imagem pelos campos de imagem do painel. Autorização e validação feitas no servidor. */
export async function uploadImageAction(formData: FormData): Promise<UploadResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente." };
  if (!can(user.role, "media:upload")) return { ok: false, error: "Você não tem permissão para enviar imagens." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Selecione uma imagem." };

  try {
    const { asset, path } = await storeImage(file, user.id);
    await audit({ userId: user.id, action: "media.upload", entity: "MediaAsset", entityId: asset.id, summary: `Enviou a imagem ${asset.originalName ?? asset.key}` });
    return { ok: true, path };
  } catch (error) {
    if (error instanceof BusinessError) return { ok: false, error: error.message };
    console.error("[midia] falha no envio", error);
    return { ok: false, error: "Não foi possível enviar a imagem. Tente novamente." };
  }
}
