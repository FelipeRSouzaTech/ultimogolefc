import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/page-title";
import { prisma } from "@/lib/db/prisma";
import { groupByPosition, isAthleteCategory, resolveCategoryLabels, sortCategoriesByGroup, TECHNICAL_STAFF_ROLE_LABELS, type Position, type AthleteCategory, type TechnicalStaffRole } from "@/modules/squad/rules";
import { FutebolContent } from "./futebol-content";

export const metadata: Metadata = {
  title: "Futebol",
  description: "Elenco e comissão técnica do Último Gole FC.",
  alternates: { canonical: "/futebol" },
};

function groupByCategoryAndPosition(athletes: { id: string; name: string; nickname: string | null; position: string; category: string; shirtNumber: number | null; photoPath: string | null }[], labels: Record<AthleteCategory, string>) {
  const categorized = new Map<AthleteCategory, typeof athletes>();
  for (const athlete of athletes) {
    const cat = athlete.category as AthleteCategory;
    if (!categorized.has(cat)) categorized.set(cat, []);
    categorized.get(cat)!.push(athlete);
  }
  const sortedCategories = sortCategoriesByGroup([...categorized.keys()]);
  return sortedCategories.map((category) => ({
    category,
    label: labels[category],
    groups: groupByPosition(categorized.get(category)!),
  }));
}

export default async function FutebolPage({ searchParams }: { searchParams: Promise<{ categoria?: string | string[] }> }) {
  // /equipes aponta para cá com ?categoria=…, para abrir o elenco já filtrado.
  const { categoria } = await searchParams;
  // Só entram no portal os registros com divulgação autorizada.
  const [athletes, technicalStaff, legacyStaff, teamProfiles] = await Promise.all([
    prisma.athlete.findMany({ where: { isPublished: true, status: "ACTIVE" } }),
    // Fonte da comissão técnica: o cadastro do painel em Comissão Técnica.
    prisma.technicalStaff.findMany({ where: { isPublished: true, status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    // Cadastro antigo (Institucional → Diretoria e comissão técnica): usado só enquanto o novo estiver vazio.
    prisma.staffMember.findMany({ where: { isPublished: true, group: "TECHNICAL" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    // Nomes de exibição das categorias, editados no painel em Equipes.
    prisma.teamProfile.findMany({ select: { category: true, name: true } }),
  ]);
  const categoryLabels = resolveCategoryLabels(teamProfiles);
  const staff =
    technicalStaff.length > 0
      ? technicalStaff.map((member) => ({
          id: member.id,
          name: member.nickname?.trim() || member.name,
          role: TECHNICAL_STAFF_ROLE_LABELS[member.role as TechnicalStaffRole],
          categories: member.categories as AthleteCategory[],
        }))
      : legacyStaff.map((member) => ({ id: member.id, name: member.name, role: member.role, categories: [] as AthleteCategory[] }));
  const categorizedGroups = groupByCategoryAndPosition(athletes, categoryLabels);
  const initialCategory = isAthleteCategory(categoria) && categorizedGroups.some((group) => group.category === categoria) ? categoria : "all";

  // Cast para o tipo esperado pelo componente cliente
  const clientCategorizedGroups = categorizedGroups.map((cg) => ({
    category: cg.category,
    label: cg.label,
    groups: cg.groups.map((g) => ({
      position: g.position as Position,
      label: g.label,
      athletes: g.athletes.map((a) => ({
        id: a.id,
        name: a.name,
        nickname: a.nickname,
        position: a.position as Position,
        shirtNumber: a.shirtNumber,
        photoPath: a.photoPath,
      })),
    })),
  }));

  return (
    <>
      <PageTitle title="Futebol" subtitle="Elenco e comissão técnica do Último Gole FC." />
      <FutebolContent
        categorizedGroups={clientCategorizedGroups}
        staff={staff}
        initialCategory={initialCategory}
      />
    </>
  );
}
