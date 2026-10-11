import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { SmartImage } from "@/components/ui/smart-image";
import { prisma } from "@/lib/db/prisma";
import { isAthleteCategory, resolveCategoryLabels, sortCategoriesByGroup, type AthleteCategory } from "@/modules/squad/rules";

export const metadata: Metadata = {
  title: "Equipes",
  description: "Equipes e categorias do Último Gole FC.",
  alternates: { canonical: "/equipes" },
};

export default async function EquipesPage() {
  // Só entram as categorias com atletas de divulgação autorizada.
  const [athletes, profiles] = await Promise.all([
    prisma.athlete.findMany({ where: { isPublished: true, status: "ACTIVE" }, select: { category: true } }),
    prisma.teamProfile.findMany(),
  ]);

  const counts = new Map<AthleteCategory, number>();
  for (const athlete of athletes) {
    if (isAthleteCategory(athlete.category)) counts.set(athlete.category, (counts.get(athlete.category) ?? 0) + 1);
  }
  const labels = resolveCategoryLabels(profiles);
  const covers = new Map<string, string | null>(profiles.map((profile) => [profile.category, profile.coverPath]));
  const teams = sortCategoriesByGroup([...counts.keys()]).map((category) => ({
    category,
    label: labels[category],
    coverPath: covers.get(category) ?? null,
    count: counts.get(category) ?? 0,
  }));

  return (
    <>
      <PageTitle title="Equipes" subtitle="Categorias e equipes do Último Gole FC." />
      <div className="container-page py-10">
        {teams.length === 0 ? (
          <EmptyState title="Nenhuma equipe publicada" description="As equipes aparecem aqui quando tiverem atletas publicados." />
        ) : (
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {teams.map((team) => (
              <li key={team.category}>
                <Link href={`/futebol?categoria=${team.category}`} className="competition-tile" aria-label={`${team.label}: ver elenco`}>
                  {team.coverPath ? <SmartImage src={team.coverPath} alt="" fill sizes="(min-width: 1024px) 23rem, 50vw" className="object-cover" /> : null}
                  <span className="tile-caption">
                    <span className="font-display text-lg font-extrabold uppercase leading-tight sm:text-2xl">{team.label}</span>
                    <span className="mt-1 block text-xs font-semibold sm:text-sm">
                      {team.count} atleta{team.count !== 1 ? "s" : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
