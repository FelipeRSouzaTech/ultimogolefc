import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubCrest } from "@/components/football/club-crest";
import { Prose } from "@/components/ui/prose";
import { prisma } from "@/lib/db/prisma";
import { displayName, POSITION_LABELS, type Position } from "@/modules/squad/rules";

type Props = { params: Promise<{ id: string }> };

// Só existe página para jogador ativo e com divulgação autorizada; os demais respondem 404.
async function loadAthlete(id: string) {
  return prisma.athlete.findFirst({ where: { id, isPublished: true, status: "ACTIVE" } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const athlete = await loadAthlete(id);
  if (!athlete) return { title: "Jogador não encontrado" };
  return {
    title: displayName(athlete),
    description: `${displayName(athlete)}, ${POSITION_LABELS[athlete.position as Position].toLowerCase()} do Último Gole FC.`,
    alternates: { canonical: `/futebol/jogador/${athlete.id}` },
  };
}

export default async function AthletePage({ params }: Props) {
  const { id } = await params;
  const athlete = await loadAthlete(id);
  if (!athlete) notFound();
  const shown = displayName(athlete);

  return (
    <div className="container-page py-10">
      <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-gray-600">
        <Link href="/futebol" className="link">
          Futebol
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{shown}</span>
      </nav>
      <article className="card mx-auto max-w-3xl overflow-hidden">
        <header className="flex flex-col items-center gap-6 border-b border-gray-100 bg-gray-50 p-8 text-center sm:flex-row sm:text-left">
          <ClubCrest name={shown} crestPath={athlete.photoPath} size={160} />
          <div>
            <p className="eyebrow">{POSITION_LABELS[athlete.position as Position]}</p>
            <h1 className="mt-1 text-3xl uppercase sm:text-4xl">{shown}</h1>
            {athlete.nickname && athlete.nickname.trim() !== athlete.name ? <p className="mt-1 text-gray-600">{athlete.name}</p> : null}
            {athlete.shirtNumber !== null ? (
              <p className="mt-3 font-display text-2xl font-extrabold text-primary">
                <span className="sr-only">Camisa </span>#{athlete.shirtNumber}
              </p>
            ) : null}
          </div>
        </header>
        <div className="p-8">
          {athlete.bio ? <Prose text={athlete.bio} /> : <p className="text-gray-600">Biografia ainda não cadastrada.</p>}
        </div>
      </article>
    </div>
  );
}
