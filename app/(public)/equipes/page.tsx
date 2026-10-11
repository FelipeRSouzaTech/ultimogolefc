import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/page-title";
import { prisma } from "@/lib/db/prisma";
import { ATHLETE_CATEGORIES, ATHLETE_CATEGORY_LABELS, ATHLETE_CATEGORY_GROUPS, getCategoryGroup } from "@/modules/squad/rules";

export const metadata: Metadata = {
  title: "Equipes",
  description: "Equipes e categorias do Último Gole FC.",
  alternates: { canonical: "/equipes" },
};

export default async function EquipesPage() {
  // Busca atletas publicados para contar por categoria
  const athletes = await prisma.athlete.findMany({
    where: { isPublished: true, status: "ACTIVE" },
    select: { category: true },
  });

  // Conta atletas por categoria
  const counts = new Map<string, number>();
  for (const athlete of athletes) {
    const cat = athlete.category;
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  // Ordena categorias por grupo
  const categoriesWithCount = ATHLETE_CATEGORIES.filter((cat) => (counts.get(cat) ?? 0) > 0).map((cat) => ({
    category: cat,
    label: ATHLETE_CATEGORY_LABELS[cat],
    groupKey: getCategoryGroup(cat as typeof ATHLETE_CATEGORIES[number]),
    groupLabel: ATHLETE_CATEGORY_GROUPS[getCategoryGroup(cat as typeof ATHLETE_CATEGORIES[number])].label,
    count: counts.get(cat) ?? 0,
  }));

  // Agrupa por grupo (Base, Adulto, Veterano)
  const grouped = new Map<string, Array<{ category: string; label: string; groupKey: string; groupLabel: string; count: number }>>();
  for (const item of categoriesWithCount) {
    if (!grouped.has(item.groupKey)) grouped.set(item.groupKey, []);
    grouped.get(item.groupKey)!.push(item);
  }

  const groupOrder = ["adult", "base", "veteran"];
  const sortedGroups = groupOrder.filter((g) => grouped.has(g));

  return (
    <>
      <PageTitle title="Equipes" subtitle="Categorias e equipes do Último Gole FC." />
      <div className="container-page py-10">
        {categoriesWithCount.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-600">Nenhuma equipe com atletas publicados no momento.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedGroups.map((groupKey) => {
              const items = grouped.get(groupKey)!;
              const groupLabel = items[0].groupLabel;
              return (
                <section key={groupKey}>
                  <h2 className="section-title mb-5">{groupLabel}</h2>
                  <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <li key={item.category} className="card p-6 hover:shadow-card-hover transition-shadow">
                        <h3 className="text-xl uppercase font-bold">{item.label}</h3>
                        <p className="mt-2 text-sm text-gray-600">
                          {item.count} atleta{item.count !== 1 ? "s" : ""} publicado{item.count !== 1 ? "s" : ""}
                        </p>
                        <div className="mt-4">
                          <a href="/futebol" className="btn btn-primary btn-sm">
                            Ver elenco
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}