import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/ui/page-title";
import { getSettings } from "@/modules/site/service";
import { sendContactAction } from "./actions";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com o Último Gole FC.",
  alternates: { canonical: "/contato" },
};

export default async function ContatoPage() {
  const settings = await getSettings();
  const channels = [
    { label: "E-mail", value: settings["contact.email"] ?? "", href: settings["contact.email"] ? `mailto:${settings["contact.email"]}` : null },
    { label: "Telefone", value: settings["contact.phone"] ?? "", href: null },
    { label: "Endereço", value: settings["contact.address"] ?? "", href: null },
  ].filter((channel) => channel.value !== "");
  const social = [
    { label: "Instagram", href: settings["social.instagram"] ?? "" },
    { label: "Facebook", href: settings["social.facebook"] ?? "" },
    { label: "YouTube", href: settings["social.youtube"] ?? "" },
  ].filter((item) => item.href.startsWith("https://"));

  return (
    <>
      <PageTitle title="Contato" subtitle="Fale com o Último Gole FC." />
      <div className="container-page py-10">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.5fr_1fr]">
          <section aria-labelledby="formulario" className="card p-6 sm:p-8">
            <h2 id="formulario" className="section-title mb-5">
              Envie uma mensagem
            </h2>
            <ContactForm action={sendContactAction} />
            <p className="hint mt-5">
              Usamos seus dados somente para responder à sua mensagem. Veja a{" "}
              <Link href="/privacidade" className="link">
                política de privacidade
              </Link>
              .
            </p>
          </section>

          {channels.length > 0 || social.length > 0 ? (
            <aside aria-labelledby="canais" className="card h-fit p-6">
              <h2 id="canais" className="text-xl uppercase">
                Canais oficiais
              </h2>
              <dl className="mt-4 space-y-4 text-sm">
                {channels.map((channel) => (
                  <div key={channel.label}>
                    <dt className="font-bold uppercase tracking-wider text-gray-600">{channel.label}</dt>
                    <dd className="mt-1 break-words">
                      {channel.href ? (
                        <a href={channel.href} className="link">
                          {channel.value}
                        </a>
                      ) : (
                        channel.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              {social.length > 0 ? (
                <ul className="mt-5 flex flex-wrap gap-4 border-t border-gray-100 pt-4 text-sm">
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
            </aside>
          ) : null}
        </div>
      </div>
    </>
  );
}
