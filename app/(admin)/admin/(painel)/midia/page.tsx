import type { Metadata } from "next";
import { AdminHeading } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SmartImage } from "@/components/ui/smart-image";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { keyToPath } from "@/modules/media/rules";
import { deleteMediaAction } from "./actions";

export const metadata: Metadata = { title: "Mídia" };

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default async function MediaLibraryPage() {
  const user = await requirePagePermission("content:read");
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 120, include: { uploadedBy: { select: { name: true } } } });
  const canDelete = can(user.role, "content:write");

  return (
    <>
      <AdminHeading title="Mídia" description="Últimas 120 imagens enviadas. O envio é feito nos próprios formulários (notícias, clubes, elenco, patrocinadores, galeria)." />
      {assets.length === 0 ? (
        <EmptyState title="Nenhuma imagem enviada" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <li key={asset.id} className="card p-3">
              <SmartImage src={keyToPath(asset.key)} alt="" width={320} height={220} className="aspect-[3/2] w-full rounded-md bg-gray-50 object-contain" />
              <p className="mt-2 truncate text-sm font-semibold" title={asset.originalName ?? undefined}>
                {asset.originalName ?? "Sem nome"}
              </p>
              <p className="text-xs text-gray-600">
                {formatSize(asset.size)} · {formatDateTime(asset.createdAt)}
                {asset.uploadedBy ? ` · ${asset.uploadedBy.name}` : ""}
              </p>
              <p className="mt-1 select-all break-all font-mono text-xs text-gray-600">{keyToPath(asset.key)}</p>
              {canDelete ? (
                <div className="mt-3">
                  <ConfirmButton action={deleteMediaAction.bind(null, asset.id)} label="Excluir" confirmMessage="Excluir esta imagem definitivamente? Só é possível se ela não estiver em uso." />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
