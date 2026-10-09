import type { Metadata } from "next";
import { PersonCard } from "@/components/football/person-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { prisma } from "@/lib/db/prisma";
import { displayName, groupByPosition, POSITION_LABELS, type Position } from "@/modules/squad/rules";

export const metadata: Metadata = {
  title: "Futebol",
  description: "Elenco e comissão técnica do Último Gole FC.",
  alternates: { canonical: "/futebol" },
};

export default async function FutebolPage() {
  // Só entram no portal os registros com divulgação autorizada.
  const [athletes, staff] = await Promise.all([
    prisma.athlete.findMany({ where: { isPublished: true, status: "ACTIVE" } }),
    prisma.staffMember.findMany({ where: { isPublished: true, group: "TECHNICAL" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const groups = groupByPosition(athletes);

  return (
    <>
      <PageTitle title="Futebol" subtitle="Elenco e comissão técnica do Último Gole FC." />
      <div className="container-page space-y-12 py-10">
        {groups.length === 0 ? (
          <EmptyState title="Elenco ainda não divulgado" description="Os jogadores aparecerão aqui assim que o elenco for publicado." />
        ) : (
          groups.map((group) => (
            <section key={group.position} aria-labelledby={`grupo-${group.position}`}>
              <h2 id={`grupo-${group.position}`} className="section-title mb-5">
                {group.label}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {group.athletes.map((athlete) => (
                  <li key={athlete.id}>
                    <PersonCard
                      name={displayName(athlete)}
                      caption={POSITION_LABELS[athlete.position as Position]}
                      photoPath={athlete.photoPath}
                      number={athlete.shirtNumber}
                      href={`/futebol/jogador/${athlete.id}`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {staff.length > 0 ? (
          <section aria-labelledby="comissao">
            <h2 id="comissao" className="section-title mb-5">
              Comissão técnica
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {staff.map((member) => (
                <li key={member.id}>
                  <PersonCard name={member.name} caption={member.role} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
