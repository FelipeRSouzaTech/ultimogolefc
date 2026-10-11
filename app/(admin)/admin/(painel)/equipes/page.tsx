import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Equipes" };

export default async function EquipesAdminPage() {
  const user = await requirePagePermission("football:read");
  const canWrite = can(user.role, "football:write");

  // Busca categorias com contagem de atletas
  const athletes = await prisma.athlete.findMany({
    where: { status: "ACTIVE" },
    select: { category: true, isPublished: true },
  });

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
      <AdminHeading title="Equipes" description="Visão geral das categorias e contagem de atletas." />
      {canWrite ? null : <ReadOnlyNotice />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Categorias de atletas">
          {athletes.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum atleta cadastrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {Array.from(counts.entries())
                .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
                .map(([category, count]) => (
                  <li key={category} className="flex items-center justify-between gap-3 py-3">
                    <span className="font-semibold uppercase">{category}</span>
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="badge badge-solid">{count.total} atleta{count.total !== 1 ? "s" : ""}</span>
                      <span className="badge">{count.published} publicado{count.published !== 1 ? "s" : ""}</span>
                    </span>
                  </li>
                ))}
            </ul>
          )}
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