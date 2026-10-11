import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { SmartImage } from "@/components/ui/smart-image";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Campeonatos",
  description: "Campeonatos disputados pelo Último Gole FC, com calendário, resultados e classificação.",
  alternates: { canonical: "/campeonatos" },
};

export default async function CampeonatosPage() {
  const competitions = await prisma.competition.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <>
      <PageTitle title="Campeonatos" subtitle="Campeonatos, temporadas e classificação." />
      <div className="container-page py-10">
        {competitions.length === 0 ? (
          <EmptyState title="Nenhum campeonato cadastrado" description="Os campeonatos disputados pelo clube aparecerão aqui." />
        ) : (
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {competitions.map((competition) => (
              <li key={competition.id}>
                <Link href={`/campeonatos/${competition.slug}`} className="competition-tile" aria-label={competition.isActive ? competition.name : `${competition.name} (encerrada)`}>
                  {competition.coverPath ? (
                    <SmartImage src={competition.coverPath} alt="" fill sizes="(min-width: 1024px) 23rem, 50vw" className="object-cover" />
                  ) : (
                    <span className="px-4 font-display text-lg font-extrabold uppercase leading-tight sm:text-2xl">{competition.name}</span>
                  )}
                  {competition.isActive ? null : <span className="badge absolute left-3 top-3 border-white bg-primary-dark text-white">Encerrada</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}