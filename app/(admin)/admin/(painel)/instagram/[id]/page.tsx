import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SmartImage } from "@/components/ui/smart-image";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDateTime, utcToSaoPauloLocal } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { instagramConfig } from "@/lib/instagram/client";
import { INSTAGRAM_FORMAT_LABELS, INSTAGRAM_ORIGIN_LABELS, isDeletable, isEditable, MAX_ATTEMPTS } from "@/modules/instagram/rules";
import { AccountNotice } from "../account-notice";
import { cancelInstagramPostAction, deleteInstagramPostAction, publishInstagramNowAction, saveInstagramPostAction } from "../actions";
import { InstagramPostForm } from "../post-form";
import { StatusBadge } from "../status-badge";

export const metadata: Metadata = { title: "Publicação no Instagram" };

export default async function InstagramPostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("content:read");
  const { id } = await params;
  const post = await prisma.instagramPost.findUnique({ where: { id }, include: { createdBy: { select: { name: true } } } });
  if (!post) notFound();
  const config = instagramConfig();
  const canWrite = can(user.role, "instagram:publish");
  const editable = canWrite && isEditable(post.status);

  return (
    <>
      <AdminHeading title={`${INSTAGRAM_FORMAT_LABELS[post.format]} no Instagram`} description={`${INSTAGRAM_ORIGIN_LABELS[post.origin]} · criada por ${post.createdBy?.name ?? "sistema"}`}>
        <Link href="/admin/instagram" className="btn btn-secondary btn-sm">
          Voltar à agenda
        </Link>
        {post.permalink ? (
          <a href={post.permalink} className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer">
            Ver no Instagram
          </a>
        ) : null}
        {editable && config ? <ActionButton action={publishInstagramNowAction.bind(null, post.id)} label="Publicar agora" className="btn btn-primary btn-sm" /> : null}
        {canWrite && (post.status === "SCHEDULED" || post.status === "FAILED") ? (
          <ConfirmButton
            action={cancelInstagramPostAction.bind(null, post.id)}
            label="Cancelar agendamento"
            confirmMessage="Cancelar esta publicação? Ela não será enviada ao Instagram. Dá para reagendar depois."
            className="btn btn-secondary btn-sm"
          />
        ) : null}
        {canWrite && isDeletable(post.status) ? (
          <ConfirmButton action={deleteInstagramPostAction.bind(null, post.id)} label="Excluir" confirmMessage="Excluir definitivamente esta publicação?" />
        ) : null}
      </AdminHeading>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <StatusBadge status={post.status} />
        {post.scheduledAt && post.status !== "PUBLISHED" ? <span>Marcada para {formatDateTime(post.scheduledAt)}</span> : null}
        {post.publishedAt ? (
          <span>
            Publicada em {formatDateTime(post.publishedAt)}
            {post.accountLabel ? ` em ${post.accountLabel}` : ""}
          </span>
        ) : null}
        {post.attempts > 0 && post.status !== "PUBLISHED" ? (
          <span className="text-gray-600">
            Tentativas: {post.attempts} de {MAX_ATTEMPTS}
          </span>
        ) : null}
      </div>

      {post.lastError && post.status !== "PUBLISHED" ? (
        <p className="alert alert-error mb-6" role="alert">
          <strong>Última falha:</strong> {post.lastError}
        </p>
      ) : null}

      {editable ? (
        <>
          <AccountNotice config={config} />
          <Panel>
            <InstagramPostForm
              action={saveInstagramPostAction.bind(null, post.id)}
              configured={config !== null}
              accountLabel={config?.accountLabel ?? "ultimogolefc"}
              values={{
                format: post.format,
                imagePath: post.imagePath,
                caption: post.caption,
                scheduledAtLocal: post.status === "SCHEDULED" && post.scheduledAt ? utcToSaoPauloLocal(post.scheduledAt) : null,
              }}
            />
          </Panel>
        </>
      ) : (
        <>
          {canWrite ? null : <ReadOnlyNotice />}
          <Panel className="max-w-3xl">
            <div className="flex flex-wrap gap-6">
              <SmartImage
                src={post.imagePath}
                alt="Imagem da publicação"
                width={1080}
                height={post.format === "FEED" ? 1350 : 1920}
                className={`w-full max-w-[16rem] rounded-md border border-gray-100 object-cover ${post.format === "FEED" ? "aspect-[4/5]" : "aspect-[9/16]"}`}
              />
              <div className="min-w-0 flex-1">
                <h2 className="mb-2 text-lg uppercase">Legenda</h2>
                <p className="whitespace-pre-line text-sm">{post.caption ?? (post.format === "STORY" ? "Stories não levam legenda." : "Sem legenda.")}</p>
              </div>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
