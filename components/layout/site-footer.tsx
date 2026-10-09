import Image from "next/image";
import Link from "next/link";
import { CREST_PATH, PUBLIC_NAV, SITE_NAME } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-gray-100 bg-gray-50">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-[auto_1fr] sm:gap-12">
        <div className="flex items-center gap-3">
          <Image src={CREST_PATH} alt="" width={448} height={594} className="h-16 w-auto" />
          <p className="font-display text-lg font-extrabold uppercase text-primary">{SITE_NAME}</p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-gray-600 hover:text-primary hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/resultados" className="text-gray-600 hover:text-primary hover:underline">
                Resultados
              </Link>
            </li>
            <li>
              <Link href="/apoie" className="text-gray-600 hover:text-primary hover:underline">
                Apoie o clube
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-gray-100">
        <p className="container-page py-4 text-xs text-gray-600">
          © {new Date().getFullYear()} {SITE_NAME}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
