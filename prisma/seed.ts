/**
 * Seed de DEMONSTRAÇÃO. Todos os dados abaixo são fictícios e identificados como tal,
 * exceto o nome e o escudo do próprio clube. Não cria usuários nem senhas:
 * o primeiro administrador é criado com `npm run admin:create`.
 *
 * Por segurança, não roda em produção a menos que SEED_DEMO=true seja definido explicitamente.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO !== "true") {
    console.log("Seed de demonstração ignorado em produção (defina SEED_DEMO=true para forçar).");
    return;
  }
  if ((await prisma.club.count()) > 0) {
    console.log("O banco já tem clubes cadastrados; seed de demonstração não aplicado.");
    return;
  }

  const [own, a, b, c] = await Promise.all([
    prisma.club.create({ data: { name: "Último Gole FC", shortName: "Último Gole", slug: "ultimo-gole-fc", crestPath: "/brand/escudo.png", isOwnClub: true } }),
    prisma.club.create({ data: { name: "Adversário Demonstração A", shortName: "Demo A", slug: "adversario-demonstracao-a" } }),
    prisma.club.create({ data: { name: "Adversário Demonstração B", shortName: "Demo B", slug: "adversario-demonstracao-b" } }),
    prisma.club.create({ data: { name: "Adversário Demonstração C", shortName: "Demo C", slug: "adversario-demonstracao-c" } }),
  ]);

  const competition = await prisma.competition.create({
    data: {
      name: "Campeonato de Demonstração",
      slug: "campeonato-de-demonstracao",
      description: "Competição fictícia criada pelo seed para demonstrar o portal. Substitua pelos dados reais no painel.",
    },
  });
  const season = await prisma.season.create({
    data: {
      competitionId: competition.id,
      label: String(new Date().getFullYear()),
      isCurrent: true,
      regulation: "Regulamento fictício de demonstração: turno único, todos contra todos.",
      teams: { create: [own, a, b, c].map((club) => ({ clubId: club.id })) },
    },
  });

  const now = Date.now();
  const venue = "Campo de demonstração";
  await prisma.match.createMany({
    data: [
      { seasonId: season.id, homeTeamId: own.id, awayTeamId: a.id, kickoffAt: new Date(now - 21 * DAY), venue, round: "1ª rodada", status: "FINISHED", homeScore: 2, awayScore: 1 },
      { seasonId: season.id, homeTeamId: b.id, awayTeamId: c.id, kickoffAt: new Date(now - 21 * DAY), venue, round: "1ª rodada", status: "FINISHED", homeScore: 0, awayScore: 0 },
      { seasonId: season.id, homeTeamId: c.id, awayTeamId: own.id, kickoffAt: new Date(now - 14 * DAY), venue, round: "2ª rodada", status: "FINISHED", homeScore: 1, awayScore: 1 },
      { seasonId: season.id, homeTeamId: a.id, awayTeamId: b.id, kickoffAt: new Date(now - 14 * DAY), venue, round: "2ª rodada", status: "POSTPONED" },
      { seasonId: season.id, homeTeamId: own.id, awayTeamId: b.id, kickoffAt: new Date(now + 7 * DAY), venue, round: "3ª rodada", status: "SCHEDULED" },
      { seasonId: season.id, homeTeamId: a.id, awayTeamId: c.id, kickoffAt: new Date(now + 7 * DAY), venue, round: "3ª rodada", status: "SCHEDULED" },
    ],
  });

  const category = await prisma.newsCategory.create({ data: { name: "Demonstração", slug: "demonstracao" } });
  await prisma.newsArticle.create({
    data: {
      title: "[Demonstração] Portal do Último Gole FC em configuração",
      slug: "demonstracao-portal-em-configuracao",
      summary: "Notícia fictícia criada pelo seed para demonstrar a área editorial. Apague-a ou edite-a no painel.",
      content:
        "Este texto é um exemplo gerado pelo seed de demonstração e não representa um fato real.\n\n## Como substituir\n\nAcesse o painel administrativo, abra Notícias e edite ou exclua este conteúdo.",
      status: "PUBLISHED",
      publishedAt: new Date(now - DAY),
      categoryId: category.id,
    },
  });

  console.log("Seed de demonstração aplicado. Crie o primeiro administrador com: npm run admin:create");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
