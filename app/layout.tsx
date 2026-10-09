import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { BRAND_COLOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { type: "website", locale: "pt_BR", siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION },
};

// Montserrat variável (recorte latino), servida pelo próprio site: sem download externo no build nem no navegador.
// O Next gera um fallback com métricas ajustadas, o que evita salto de layout enquanto a fonte carrega.
const montserrat = localFont({
  src: "./fonts/montserrat-latin.woff",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-montserrat",
});

export const viewport: Viewport = {
  themeColor: BRAND_COLOR,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
