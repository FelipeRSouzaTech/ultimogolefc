import type { Metadata } from "next";
import { PersonCard } from "@/components/football/person-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { Prose } from "@/components/ui/prose";
import { prisma } from "@/lib/db/prisma";
import { getSettings } from "@/modules/site/service";

export const metadata: Metadata = {
  title: "Clube",
  description: "História, missão e diretoria do Último Gole FC.",
  alternates: { canonical: "/clube" },
};

export default async function ClubePage() {
  const [settings, board] = await Promise.all([
    getSettings(),
    prisma.staffMember.findMany({ where: { isPublished: true, group: "BOARD" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const sections = [
    { id: "historia", title: "História", text: settings["club.history"] ?? "" },
    { id: "missao", title: "Missão e objetivos", text: settings["club.mission"] ?? "" },
    { id: "associacao", title: "Informações da associação", text: settings["club.association"] ?? "" },
  ].filter((section) => section.text.trim() !== "");
  const empty = sections.length === 0 && board.length === 0;

  return (
    <>
      <PageTitle title="Clube" subtitle="Conheça o Último Gole FC." />
      <div className="container-page space-y-12 py-10">
        {empty ? (
          <EmptyState title="Conteúdo institucional em preparação" description="A história e as informações do clube serão publicadas em breve." />
        ) : null}

        {sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id} className="mx-auto max-w-3xl">
            <h2 id={section.id} className="section-title mb-5">
              {section.title}
            </h2>
            <Prose text={section.text} />
          </section>
        ))}

        {board.length > 0 ? (
          <section aria-labelledby="diretoria">
            <h2 id="diretoria" className="section-title mb-5">
              Diretoria
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {board.map((member) => (
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
