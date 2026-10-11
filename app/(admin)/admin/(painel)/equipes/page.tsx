import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { SmartImage } from "@/components/ui/smart-image";
import { prisma } from "@/lib/db/prisma";
import { ATHLETE_CATEGORIES, resolveCategoryLabels, sortCategoriesByGroup } from "@/modules/squad/rules";

export const metadata: Metadata = { title: "Equipes" };

export default async function EquipesAdminPage() {
  const user = await requirePagePermission("football:read");
  const canWrite = can(user.role, "football:write");

  // Atletas ativos (para a contagem) e a apresentação de cada equipe (nome e imagem do cartão).
  const [athletes, profiles] = await Promise.all([
    prisma.athlete.findMany({ where: { status: "ACTIVE" }, select: { category: true, isPublished: true } }),
    prisma.teamProfile.findMany(),
  ]);
  const labels = resolveCategoryLabels(profiles);
  const covers = new Map<string, string | null>(profiles.map((profile) => [profile.category, profile.coverPath]));

  const counts = new Map<string, { total: number; published: number }>();
  for (const athlete of athletes) {
    const cat = athlete.category;
    const current = counts.get(cat) ?? { total: 0, published: 0 };
    current.total++;
    if (athlete.isPublished) current.published++;
    counts.set(cat, current);
  }

  return (
    <>
      <AdminHeading title="Equipes" description="Categorias de atletas: nome, imagem do cartão e contagem de atletas." />
      {canWrite ? null : <ReadOnlyNotice />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Categorias de atletas">
          <p className="mb-3 text-sm text-gray-600">Em /equipes aparecem só as categorias com atletas publicados.</p>
          <ul className="divide-y divide-gray-100">
            {sortCategoriesByGroup([...ATHLETE_CATEGORIES]).map((category) => {
              const count = counts.get(category) ?? { total: 0, published: 0 };
              const cover = covers.get(category);
              return (
                <li key={category} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="flex min-w-0 items-center gap-3">
                    {cover ? (
                      <SmartImage src={cover} alt="" width={40} height={48} className="h-12 w-10 shrink-0 rounded-sm bg-gray-50 object-cover" />
                    ) : (
                      <span aria-hidden="true" className="h-12 w-10 shrink-0 rounded-sm border border-dashed border-gray-400" />
                    )}
                    <span className="font-semibold uppercase">{labels[category]}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <span className="badge badge-solid">
                      {count.total} atleta{count.total !== 1 ? "s" : ""}
                    </span>
                    <span className="badge">
                      {count.published} publicado{count.published !== 1 ? "s" : ""}
                    </span>
                    {canWrite ? (
                      <Link href={`/admin/equipes/${category}`} className="btn btn-secondary btn-sm">
                        Editar
                      </Link>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
        {canWrite ? (
          <Panel title="Ações rápidas">
            <ul className="space-y-2">
              <li>
                <Link href="/admin/elenco" className="btn btn-primary w-full justify-start">
                  Gerenciar elenco
                </Link>
              </li>
              <li>
                <Link href="/admin/comissao-tecnica" className="btn btn-secondary w-full justify-start">
                  Gerenciar comissão técnica
                </Link>
              </li>
            </ul>
          </Panel>
        ) : null}
      </div>
    </>
  );
}