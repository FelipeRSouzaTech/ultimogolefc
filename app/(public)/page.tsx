import Image from "next/image";
import Link from "next/link";
import { MatchCard, ResultCard } from "@/components/football/match-card";
import { StandingsTable } from "@/components/football/standings-table";
import { NewsCard } from "@/components/news/news-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SmartImage } from "@/components/ui/smart-image";
import { CREST_PATH, SITE_NAME } from "@/lib/site";
import { getFeaturedSeason, getSeasonStandings } from "@/modules/competitions/service";
import { getOwnClub, lastOwnResults, nextOwnMatch } from "@/modules/matches/service";
import { latestPublicNews } from "@/modules/news/service";
import { getSettings } from "@/modules/site/service";
import { isExternalUrl, isSafeUrl } from "@/modules/site/settings";
import { listVisibleSponsors } from "@/modules/sponsors/service";

export default async function HomePage() {
  const [ownClub, news, featuredSeason, settings, sponsors] = await Promise.all([
    getOwnClub(),
    latestPublicNews(4),
    getFeaturedSeason(),
    getSettings(),
    listVisibleSponsors(),
  ]);
  // Banner configurável pelo painel; sem configuração, usa a apresentação padrão.
  const bannerTitle = settings["home.bannerTitle"] || SITE_NAME;
  const bannerDescription = settings["home.bannerDescription"] || "Jogos, resultados, competições e notícias do clube em um só lugar.";
  const bannerLinkLabel = settings["home.bannerLinkLabel"] ?? "";
  const bannerLinkUrl = settings["home.bannerLinkUrl"] ?? "";
  const bannerImagePath = settings["home.bannerImagePath"] ?? "";
  const hasBannerLink = bannerLinkLabel !== "" && bannerLinkUrl !== "" && isSafeUrl(bannerLinkUrl);
  const [nextMatch, results, standings] = await Promise.all([
    ownClub ? nextOwnMatch(ownClub.id) : null,
    ownClub ? lastOwnResults(ownClub.id) : [],
    featuredSeason ? getSeasonStandings(featuredSeason.id) : null,
  ]);
  const [mainNews, ...otherNews] = news;

  return (
    <>
      <section className="relative overflow-hidden border-b border-gray-100 bg-primary text-white">
        {bannerImagePath ? (
          <>
            <SmartImage src={bannerImagePath} alt="" fill priority sizes="100vw" className="object-cover" />
            {/* Camada azul-marinho sobre a foto para garantir o contraste do texto. */}
            <div aria-hidden="true" className="absolute inset-0 bg-primary/85" />
          </>
        ) : null}
        <div className="container-page relative flex flex-col items-center gap-8 py-12 text-center md:flex-row md:py-16 md:text-left">
          <Image src={CREST_PATH} alt={`Escudo do ${SITE_NAME}`} width={448} height={505} priority className="h-44 w-auto shrink-0 md:h-60" />
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em]">Portal oficial</p>
            <h1 className="mt-2 text-3xl uppercase sm:text-5xl lg:text-6xl">{bannerTitle}</h1>
            <p className="mt-4 max-w-xl text-base sm:text-lg">{bannerDescription}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
              {hasBannerLink ? (
                isExternalUrl(bannerLinkUrl) ? (
                  <a href={bannerLinkUrl} className="btn btn-inverse btn-lg" target="_blank" rel="noopener noreferrer">
                    {bannerLinkLabel}
                  </a>
                ) : (
                  <Link href={bannerLinkUrl} className="btn btn-inverse btn-lg">
                    {bannerLinkLabel}
                  </Link>
                )
              ) : (
                <Link href="/jogos" className="btn btn-inverse btn-lg">
                  Próximos jogos
                </Link>
              )}
              <Link href="/noticias" className="btn btn-outline-inverse btn-lg">
                Notícias
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page space-y-14 py-12">
        <section aria-labelledby="proximo-jogo">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 id="proximo-jogo" className="section-title">
              Próximo jogo
            </h2>
            <Link href="/jogos" className="link text-sm">
              Ver todos
            </Link>
          </div>
          {nextMatch ? (
            <MatchCard match={nextMatch} />
          ) : (
            <EmptyState title="Nenhum jogo agendado" description="Assim que a próxima partida for confirmada, ela aparecerá aqui." />
          )}
        </section>

        <section aria-labelledby="ultimos-resultados">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 id="ultimos-resultados" className="section-title">
              Últimos resultados
            </h2>
            <Link href="/resultados" className="link text-sm">
              Ver todos
            </Link>
          </div>
          {results.length === 0 ? (
            <EmptyState title="Nenhum resultado registrado" description="Os placares aparecerão aqui depois que as partidas forem encerradas." />
          ) : (
            <ul className="space-y-4">
              {results.map((match) => (
                <li key={match.id}>
                  <ResultCard match={match} ownClubId={ownClub?.id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <section aria-labelledby="noticias-destaque">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 id="noticias-destaque" className="section-title">
                Notícias
              </h2>
              <Link href="/noticias" className="link text-sm">
                Ver todas
              </Link>
            </div>
            {!mainNews ? (
              <EmptyState title="Nenhuma notícia publicada" description="As notícias do clube aparecerão aqui assim que forem publicadas." />
            ) : (
              <div className="space-y-6">
                <NewsCard article={mainNews} featured />
                {otherNews.length > 0 ? (
                  <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {otherNews.map((article) => (
                      <li key={article.id}>
                        <NewsCard article={article} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </section>

          <section aria-labelledby="classificacao-home">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 id="classificacao-home" className="section-title">
                Classificação
              </h2>
              {featuredSeason ? (
                <Link href={`/competicoes/${featuredSeason.competition.slug}`} className="link text-sm">
                  Tabela completa
                </Link>
              ) : null}
            </div>
            {featuredSeason && standings && standings.rows.length > 0 ? (
              <div className="card p-4">
                <p className="eyebrow mb-3">
                  {featuredSeason.competition.name} · {featuredSeason.label}
                </p>
                <StandingsTable rows={standings.rows} mode={standings.mode} caption={`Classificação — ${featuredSeason.competition.name} ${featuredSeason.label}`} compact />
              </div>
            ) : (
              <EmptyState title="Classificação indisponível" description="A tabela será exibida quando houver uma temporada em andamento cadastrada." />
            )}
          </section>
        </div>

        {sponsors.length > 0 ? (
          <section aria-labelledby="patrocinadores-home">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 id="patrocinadores-home" className="section-title">
                Patrocinadores
              </h2>
              <Link href="/patrocinadores" className="link text-sm">
                Ver todos
              </Link>
            </div>
            <ul className="flex flex-wrap items-center justify-center gap-4">
              {sponsors.slice(0, 12).map((sponsor) => (
                <li key={sponsor.id} className="card flex h-24 w-44 items-center justify-center p-4 text-center">
                  {sponsor.logoPath ? (
                    <SmartImage src={sponsor.logoPath} alt={sponsor.name} width={160} height={80} className="max-h-full w-auto object-contain" />
                  ) : (
                    <span className="text-sm font-bold uppercase">{sponsor.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="card grid gap-6 border-t-4 border-t-primary p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl uppercase">Apoie o Último Gole FC</h2>
            <p className="mt-2 max-w-xl text-gray-600">Conheça o clube e saiba como contribuir com as nossas atividades.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/apoie" className="btn btn-primary">
              Apoie o clube
            </Link>
            <Link href="/clube" className="btn btn-secondary">
              Conheça o clube
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
