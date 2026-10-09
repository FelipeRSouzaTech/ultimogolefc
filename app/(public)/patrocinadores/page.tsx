import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { SmartImage } from "@/components/ui/smart-image";
import { groupByTier } from "@/modules/sponsors/rules";
import { listVisibleSponsors } from "@/modules/sponsors/service";

export const metadata: Metadata = {
  title: "Patrocinadores",
  description: "Empresas e parceiros que apoiam o Último Gole FC.",
  alternates: { canonical: "/patrocinadores" },
};

export default async function PatrocinadoresPage() {
  const groups = groupByTier(await listVisibleSponsors());

  return (
    <>
      <PageTitle title="Patrocinadores" subtitle="Empresas e parceiros que apoiam o Último Gole FC." />
      <div className="container-page space-y-12 py-10">
        {groups.length === 0 ? (
          <EmptyState title="Nenhum patrocinador divulgado" description="Os parceiros do clube aparecerão aqui." />
        ) : (
          groups.map((group) => (
            <section key={group.tier} aria-labelledby={`categoria-${group.tier}`}>
              <h2 id={`categoria-${group.tier}`} className="section-title mb-5">
                {group.label}
              </h2>
              <ul className={`grid gap-4 ${group.tier === "MASTER" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
                {group.sponsors.map((sponsor) => (
                  <li key={sponsor.id} className="card flex flex-col items-center p-6 text-center">
                    {sponsor.logoPath ? (
                      <SmartImage src={sponsor.logoPath} alt="" width={240} height={120} className="h-20 w-auto max-w-full object-contain" />
                    ) : null}
                    <h3 className={`text-lg uppercase ${sponsor.logoPath ? "mt-4" : ""}`}>{sponsor.name}</h3>
                    {sponsor.description ? <p className="mt-2 text-sm text-gray-600">{sponsor.description}</p> : null}
                    {sponsor.websiteUrl || sponsor.instagramUrl ? (
                      <p className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
                        {sponsor.websiteUrl ? (
                          <a href={sponsor.websiteUrl} className="link" target="_blank" rel="noopener noreferrer">
                            Site<span className="sr-only"> de {sponsor.name} (abre em nova aba)</span>
                          </a>
                        ) : null}
                        {sponsor.instagramUrl ? (
                          <a href={sponsor.instagramUrl} className="link" target="_blank" rel="noopener noreferrer">
                            Instagram<span className="sr-only"> de {sponsor.name} (abre em nova aba)</span>
                          </a>
                        ) : null}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <section className="card border-t-4 border-t-primary p-6 text-center sm:p-10">
          <h2 className="text-2xl uppercase">Sua marca com o Último Gole FC</h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-600">Empresas interessadas em apoiar o clube podem falar com a diretoria pelo formulário de contato.</p>
          <Link href="/contato" className="btn btn-primary mt-6">
            Quero apoiar
          </Link>
        </section>
      </div>
    </>
  );
}
