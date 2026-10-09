import Image from "next/image";
import Link from "next/link";
import { CREST_PATH, PUBLIC_NAV, SITE_NAME } from "@/lib/site";
import { getSettings } from "@/modules/site/service";

export async function SiteFooter() {
  const settings = await getSettings();
  const footerText = settings["footer.text"] ?? "";
  const contact = [settings["contact.email"] ?? "", settings["contact.phone"] ?? "", settings["contact.address"] ?? ""].filter((value) => value !== "");
  const social = [
    { label: "Instagram", href: settings["social.instagram"] ?? "" },
    { label: "Facebook", href: settings["social.facebook"] ?? "" },
    { label: "YouTube", href: settings["social.youtube"] ?? "" },
  ].filter((item) => item.href.startsWith("https://"));
  const links = [...PUBLIC_NAV, { href: "/resultados", label: "Resultados" }, { href: "/apoie", label: "Apoie o clube" }, { href: "/privacidade", label: "Privacidade" }];

  return (
    <footer className="mt-16 border-t border-gray-100 bg-gray-50">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.2fr_1.5fr_1fr] md:gap-12">
        <div>
          <div className="flex items-center gap-3">
            <Image src={CREST_PATH} alt="" width={448} height={505} className="h-16 w-auto" />
            <p className="font-display text-lg font-extrabold uppercase text-primary">{SITE_NAME}</p>
          </div>
          {footerText ? <p className="mt-4 text-sm text-gray-600">{footerText}</p> : null}
        </div>
        <nav aria-label="Rodapé">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {links.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-gray-600 hover:text-primary hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {contact.length > 0 || social.length > 0 ? (
          <div className="text-sm text-gray-600">
            <p className="font-bold uppercase tracking-wider text-black">Contato</p>
            <ul className="mt-2 space-y-1">
              {contact.map((value) => (
                <li key={value} className="break-words">
                  {value}
                </li>
              ))}
            </ul>
            {social.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-4">
                {social.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="link" target="_blank" rel="noopener noreferrer">
                      {item.label}
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="border-t border-gray-100">
        <p className="container-page py-4 text-xs text-gray-600">
          © {new Date().getFullYear()} {SITE_NAME}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
