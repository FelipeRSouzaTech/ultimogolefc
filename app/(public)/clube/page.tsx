import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { Prose } from "@/components/ui/prose";
import { getSettings } from "@/modules/site/service";

export const metadata: Metadata = {
  title: "Clube",
  description: "História, missão e informações do Último Gole FC.",
  alternates: { canonical: "/clube" },
};

export default async function ClubePage() {
  const settings = await getSettings();
  const sections = [
    { id: "historia", title: "História", text: settings["club.history"] ?? "" },
    { id: "missao", title: "Missão e objetivos", text: settings["club.mission"] ?? "" },
    { id: "associacao", title: "Informações da associação", text: settings["club.association"] ?? "" },
  ].filter((section) => section.text.trim() !== "");
  const empty = sections.length === 0;

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
      </div>
    </>
  );
}
