import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { ATHLETE_CATEGORY_LABELS, isAthleteCategory } from "@/modules/squad/rules";
import { saveTeamProfileAction } from "../actions";
import { TeamForm } from "../team-form";

export const metadata: Metadata = { title: "Editar equipe" };

export default async function EditTeamPage({ params }: { params: Promise<{ category: string }> }) {
  const user = await requirePagePermission("football:read");
  const { category } = await params;
  if (!isAthleteCategory(category)) notFound();
  const profile = await prisma.teamProfile.findUnique({ where: { category } });
  const defaultLabel = ATHLETE_CATEGORY_LABELS[category];

  return (
    <>
      <AdminHeading title={profile?.name?.trim() || defaultLabel} description="Nome e imagem exibidos no cartão da equipe em /equipes.">
        <Link href="/admin/equipes" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
      </AdminHeading>
      {can(user.role, "football:write") ? (
        <Panel className="max-w-xl">
          <TeamForm action={saveTeamProfileAction.bind(null, category)} defaultLabel={defaultLabel} values={{ name: profile?.name ?? null, coverPath: profile?.coverPath ?? null }} />
        </Panel>
      ) : (
        <ReadOnlyNotice />
      )}
    </>
  );
}
