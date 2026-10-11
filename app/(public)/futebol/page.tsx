import type { Metadata } from "next";
import { PersonCard } from "@/components/football/person-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { prisma } from "@/lib/db/prisma";
import { displayName, groupByPosition, sortCategoriesByGroup, ATHLETE_CATEGORY_LABELS, type Position, type AthleteCategory, POSITION_LABELS } from "@/modules/squad/rules";

export const metadata: Metadata = {
  title: "Futebol",
  description: "Elenco e comissão técnica do Último Gole FC.",
  alternates: { canonical: "/futebol" },
};

function groupByCategoryAndPosition(athletes: { id: string; name: string; nickname: string | null; position: string; category: string; shirtNumber: number | null; photoPath: string | null }[]) {
  const categorized = new Map<AthleteCategory, typeof athletes>();
  for (const athlete of athletes) {
    const cat = athlete.category as AthleteCategory;
    if (!categorized.has(cat)) categorized.set(cat, []);
    categorized.get(cat)!.push(athlete);
  }
  const sortedCategories = sortCategoriesByGroup([...categorized.keys()]);
  return sortedCategories.map((category) => ({
    category,
    label: ATHLETE_CATEGORY_LABELS[category],
    groups: groupByPosition(categorized.get(category)!),
  }));
}

export default async function FutebolPage() {
  // Só entram no portal os registros com divulgação autorizada.
  const [athletes, staff] = await Promise.all([
    prisma.athlete.findMany({ where: { isPublished: true, status: "ACTIVE" } }),
    prisma.staffMember.findMany({ where: { isPublished: true, group: "TECHNICAL" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const categorizedGroups = groupByCategoryAndPosition(athletes);

  return (
    <>
      <PageTitle title="Futebol" subtitle="Elenco e comissão técnica do Último Gole FC." />
      <div className="container-page space-y-12 py-10">
        {categorizedGroups.length === 0 ? (
          <EmptyState title="Elenco ainda não divulgado" description="Os jogadores aparecerão aqui assim que o elenco for publicado." />
        ) : (
          categorizedGroups.map(({ category, label, groups }) => (
            <section key={category} aria-labelledby={`categoria-${category}`}>
              <h2 id={`categoria-${category}`} className="section-title mb-5">
                {label}
              </h2>
              {groups.map((group) => (
                <div key={group.position}>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">{group.label}</h3>
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
                </div>
              ))}
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
