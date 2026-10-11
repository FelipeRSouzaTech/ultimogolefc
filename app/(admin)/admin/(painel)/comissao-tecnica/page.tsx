import type { Metadata } from "next";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { TECHNICAL_STAFF_ROLE_LABELS, ATHLETE_CATEGORY_LABELS, type TechnicalStaffRole, type AthleteCategory } from "@/modules/squad/rules";
import { deleteTechnicalStaffAction, saveTechnicalStaffAction } from "./actions";
import { TechnicalStaffForm } from "./technical-staff-form";

export const metadata: Metadata = { title: "Comissão Técnica" };

export default async function TechnicalStaffAdminPage() {
  const user = await requirePagePermission("football:read");
  const [staff, seasons] = await Promise.all([
    prisma.technicalStaff.findMany({
      include: { seasons: { include: { season: { include: { competition: true } } } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.season.findMany({
      where: { isCurrent: true },
      include: { competition: true },
      orderBy: [{ competition: { name: "asc" } }, { label: "desc" }],
    }),
  ]);
  const canWrite = can(user.role, "football:write");

  const seasonOptions = seasons.map((s) => ({
    id: s.id,
    label: `${s.competition.name} — ${s.label}`,
  }));

  return (
    <>
      <AdminHeading title="Comissão Técnica" description="Cadastro da comissão técnica vinculada a competições/temporadas e categorias." />
      {canWrite ? null : <ReadOnlyNotice />}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={staff.length === 0 ? "Cadastrados" : `Cadastrados (${staff.length})`} className="lg:col-span-2">
          {staff.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum membro da comissão técnica cadastrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {staff.map((member) => (
                <li key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3">
                  <div>
                    <span className="font-semibold">{member.name}</span>
                    {member.nickname ? <span className="ml-2 text-sm text-gray-500">&#8220;{member.nickname}&#8221;</span> : null}
                    <span className="block text-xs text-gray-600 mt-1">
                      {TECHNICAL_STAFF_ROLE_LABELS[member.role as TechnicalStaffRole]} ·
                      {member.seasons
                        .map((ts) => `${ts.season.competition.name} — ${ts.season.label}`)
                        .join(", ")}
                      {member.categories.length > 0 && (
                        <>
                          <span className="mx-1">·</span>
                          {member.categories.map((c) => ATHLETE_CATEGORY_LABELS[c as AthleteCategory]).join(", ")}
                        </>
                      )}
                      · ordem {member.sortOrder}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${member.isPublished ? "badge-solid" : ""} ${member.status === "ACTIVE" ? "badge-green" : "badge-gray"}`}>
                      {member.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      {member.isPublished ? " · No portal" : " · Oculto"}
                    </span>
                    {canWrite ? (
                      <>
                        <ConfirmButton
                          action={deleteTechnicalStaffAction.bind(null, member.id)}
                          label="Remover"
                          confirmMessage={`Remover "${member.name}"?`}
                        />
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {canWrite ? (
          <Panel title="Novo membro">
            <TechnicalStaffForm
              action={saveTechnicalStaffAction.bind(null, null)}
              seasonOptions={seasonOptions}
            />
          </Panel>
        ) : null}
      </div>
    </>
  );
}