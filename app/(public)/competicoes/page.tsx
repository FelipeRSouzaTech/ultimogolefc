import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Competições",
  description: "Campeonatos disputados pelo Último Gole FC, com calendário, resultados e classificação.",
  alternates: { canonical: "/competicoes" },
};

export default async function CompeticoesPage() {
  const competitions = await prisma.competition.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { seasons: { orderBy: { label: "desc" }, select: { id: true, label: true, isCurrent: true } } },
  });

  return (
    <>
      <PageTitle title="Competições" subtitle="Campeonatos, temporadas e classificação." />
      <div className="container-page py-10">
        {competitions.length === 0 ? (
          <EmptyState title="Nenhuma competição cadastrada" description="As competições disputadas pelo clube aparecerão aqui." />
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {competitions.map((competition) => (
              <li key={competition.id} className="card flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl uppercase">{competition.name}</h2>
                  {competition.isActive ? <span className="badge badge-solid">Ativa</span> : <span className="badge">Encerrada</span>}
                </div>
                {competition.description ? <p className="mt-3 line-clamp-3 text-sm text-gray-600">{competition.description}</p> : null}
                <p className="mt-4 text-sm text-gray-600">
                  {competition.seasons.length === 0
                    ? "Nenhuma temporada cadastrada."
                    : `Temporadas: ${competition.seasons.map((season) => season.label).join(", ")}`}
                </p>
                <div className="mt-5 flex-1" />
                <Link href={`/competicoes/${competition.slug}`} className="btn btn-primary self-start">
                  Ver competição
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
