import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { deleteSponsorAction, saveSponsorAction } from "../actions";
import { SponsorForm } from "../sponsor-form";

export const metadata: Metadata = { title: "Editar patrocinador" };

export default async function EditSponsorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("content:read");
  const { id } = await params;
  const sponsor = await prisma.sponsor.findUnique({ where: { id } });
  if (!sponsor) notFound();
  const canWrite = can(user.role, "content:write");

  return (
    <>
      <AdminHeading title={sponsor.name}>
        <Link href="/admin/patrocinadores" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
        {canWrite ? <ConfirmButton action={deleteSponsorAction.bind(null, sponsor.id)} label="Excluir" confirmMessage={`Excluir o patrocinador "${sponsor.name}"?`} /> : null}
      </AdminHeading>
      {canWrite ? (
        <Panel className="max-w-2xl">
          <SponsorForm action={saveSponsorAction.bind(null, sponsor.id)} values={sponsor} />
        </Panel>
      ) : (
        <ReadOnlyNotice />
      )}
    </>
  );
}
