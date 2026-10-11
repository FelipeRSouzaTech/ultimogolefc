import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { displayName, groupByPosition, sortCategoriesByGroup, ATHLETE_CATEGORY_LABELS, type AthleteCategory } from "@/modules/squad/rules";
import { saveAthleteAction } from "./actions";
import { AthleteForm } from "./athlete-form";

export const metadata: Metadata = { title: "Elenco" };

function groupByCategoryAndPosition(athletes: { id: string; name: string; nickname: string | null; position: string; category: string; shirtNumber: number | null; status: string; isPublished: boolean }[]) {
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

export default async function SquadAdminPage() {
  const user = await requirePagePermission("football:read");
  const athletes = await prisma.athlete.findMany();
  const categorizedGroups = groupByCategoryAndPosition(athletes);
  const canWrite = can(user.role, "football:write");

  return (
    <>
      <AdminHeading title="Elenco" description="Jogadores do clube. Só aparecem no portal os ativos com divulgação autorizada." />
      {canWrite ? null : <ReadOnlyNotice />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Jogadores cadastrados">
          {categorizedGroups.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum jogador cadastrado.</p>
          ) : (
            <div className="space-y-5">
              {categorizedGroups.map(({ category, label, groups }) => (
                <div key={category}>
                  <h3 className="eyebrow mb-1">{label}</h3>
                  {groups.length === 0 ? null : (
                    <div className="space-y-3">
                      {groups.map((group) => (
                        <div key={group.position}>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">{group.label}</h4>
                          <ul className="divide-y divide-gray-100">
                            {group.athletes.map((athlete) => (
                              <li key={athlete.id} className="flex items-center gap-3 py-2">
                                <span className="w-7 text-center font-display font-extrabold text-primary">{athlete.shirtNumber ?? "–"}</span>
                                <Link href={`/admin/elenco/${athlete.id}`} className="flex-1 font-semibold hover:text-primary hover:underline">
                                  {displayName(athlete)}
                                </Link>
                                {athlete.status === "INACTIVE" ? <span className="badge">Inativo</span> : null}
                                <span className={`badge ${athlete.isPublished ? "badge-solid" : ""}`}>{athlete.isPublished ? "No portal" : "Oculto"}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
        {canWrite ? (
          <Panel title="Novo jogador">
            <AthleteForm action={saveAthleteAction.bind(null, null)} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
