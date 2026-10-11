import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { deleteDirectorAction, saveDirectorAction } from "../actions";
import { DirectorForm } from "../director-form";

export const metadata: Metadata = { title: "Editar diretor" };

export default async function EditDirectorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("content:read");
  const { id } = await params;
  const director = await prisma.director.findUnique({ where: { id } });
  if (!director) notFound();
  const canWrite = can(user.role, "content:write");

  return (
    <>
      <AdminHeading title={director.name} description={director.role}>
        <Link href="/admin/diretores" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
        {canWrite ? (
          <ConfirmButton action={deleteDirectorAction.bind(null, director.id)} label="Remover" confirmMessage={`Remover "${director.name}" do cadastro? Se ele só deixou a diretoria, altere a situação para "Desligado".`} />
        ) : null}
      </AdminHeading>
      {canWrite ? (
        <Panel className="max-w-2xl">
          <DirectorForm action={saveDirectorAction.bind(null, director.id)} values={director} />
        </Panel>
      ) : (
        <ReadOnlyNotice />
      )}
    </>
  );
}
