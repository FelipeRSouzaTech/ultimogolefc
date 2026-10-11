export const SITE_NAME = "Último Gole FC";
export const SITE_DESCRIPTION = "Portal oficial do Último Gole FC: jogos, resultados, competições e notícias.";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const CREST_PATH = "/brand/escudo.png";
// Mesmo valor do token --color-primary; repetido aqui porque a meta tag theme-color não lê variáveis CSS.
export const BRAND_COLOR = "#0f2145";

export const PUBLIC_NAV = [
  { href: "/clube", label: "Clube" },
  {
    type: "dropdown" as const,
    item: { href: "/futebol", label: "Futebol" },
    children: [
      { href: "/jogos", label: "Jogos", parentHref: "/futebol" },
      { href: "/campeonatos", label: "Campeonatos", parentHref: "/futebol" },
      { href: "/equipes", label: "Equipes", parentHref: "/futebol" },
    ],
  },
  { href: "/noticias", label: "Notícias" },
  { href: "/galeria", label: "Galeria" },
  { href: "/patrocinadores", label: "Patrocinadores" },
  { href: "/contato", label: "Contato" },
] as const;
