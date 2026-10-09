import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { deleteClubAction, saveClubAction } from "../actions";
import { ClubForm } from "../club-form";

export const metadata: Metadata = { title: "Editar clube" };

export default async function EditClubPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("football:read");
  const { id } = await params;
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) notFound();

  return (
    <>
      <AdminHeading title={club.name}>
        <Link href="/admin/clubes" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
        {can(user.role, "football:delete") ? (
          <ConfirmButton action={deleteClubAction.bind(null, club.id)} label="Excluir" confirmMessage={`Excluir o clube "${club.name}"?`} />
        ) : null}
      </AdminHeading>
      {can(user.role, "football:write") ? (
        <Panel className="max-w-xl">
          <ClubForm action={saveClubAction.bind(null, club.id)} values={club} />
        </Panel>
      ) : (
        <ReadOnlyNotice />
      )}
    </>
  );
}
