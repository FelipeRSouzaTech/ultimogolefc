import type { Metadata } from "next";
import Link from "next/link";
import { ClubCrest } from "@/components/football/club-crest";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { DIRECTOR_ROLE_LABELS, DIRECTOR_STATUS_LABELS, type DirectorRole, type DirectorStatus } from "@/modules/finance/rules";
import { saveDirectorAction } from "./actions";
import { DirectorForm } from "./director-form";

export const metadata: Metadata = { title: "Diretores" };

export default async function DirectorsPage() {
  const user = await requirePagePermission("content:read");
  const directors = await prisma.director.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }] });
  const canWrite = can(user.role, "content:write");

  return (
    <>
      <AdminHeading title="Diretores" description="Cadastro interno da diretoria. É a base das mensalidades no portal financeiro e não aparece no site público." />
      {canWrite ? null : <ReadOnlyNotice />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Diretores cadastrados">
          {directors.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum diretor cadastrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {directors.map((director) => (
                <li key={director.id} className="flex items-center gap-3 py-3">
                  <ClubCrest name={director.name} crestPath={director.photoPath} size={40} />
                  <span className="min-w-0 flex-1">
                    <Link href={`/admin/diretores/${director.id}`} className="font-semibold hover:text-primary hover:underline">
                      {director.name}
                    </Link>
                    <span className="block text-xs text-gray-600">
                      {DIRECTOR_ROLE_LABELS[director.role as DirectorRole] ?? director.role}
                    </span>
                  </span>
                  <span className={`badge ${director.status === "ACTIVE" ? "badge-solid" : ""}`}>{DIRECTOR_STATUS_LABELS[director.status as DirectorStatus]}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {canWrite ? (
          <Panel title="Novo diretor">
            <DirectorForm action={saveDirectorAction.bind(null, null)} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
