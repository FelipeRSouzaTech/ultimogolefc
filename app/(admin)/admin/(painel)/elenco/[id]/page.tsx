import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { deleteAthleteAction, saveAthleteAction } from "../actions";
import { AthleteForm } from "../athlete-form";

export const metadata: Metadata = { title: "Editar jogador" };

export default async function EditAthletePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("football:read");
  const { id } = await params;
  const athlete = await prisma.athlete.findUnique({ where: { id } });
  if (!athlete) notFound();

  return (
    <>
      <AdminHeading title={athlete.name}>
        <Link href="/admin/elenco" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
        {can(user.role, "football:delete") ? (
          <ConfirmButton action={deleteAthleteAction.bind(null, athlete.id)} label="Remover" confirmMessage={`Remover "${athlete.name}" do cadastro? Para apenas tirá-lo do portal, marque como inativo.`} />
        ) : null}
      </AdminHeading>
      {can(user.role, "football:write") ? (
        <Panel className="max-w-2xl">
          <AthleteForm action={saveAthleteAction.bind(null, athlete.id)} values={athlete} />
        </Panel>
      ) : (
        <ReadOnlyNotice />
      )}
    </>
  );
}
