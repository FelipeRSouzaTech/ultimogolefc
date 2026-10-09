import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { Prose } from "@/components/ui/prose";
import { getSettings } from "@/modules/site/service";

export const metadata: Metadata = {
  title: "Apoie o clube",
  description: "Saiba como contribuir com o Último Gole FC.",
  alternates: { canonical: "/apoie" },
};

export default async function ApoiePage() {
  const settings = await getSettings();
  const intro = settings["support.intro"] ?? "";
  const purpose = settings["support.purpose"] ?? "";
  const pixKey = settings["support.pixKey"] ?? "";
  const pixHolder = settings["support.pixHolder"] ?? "";
  const qrCodePath = settings["support.qrCodePath"] ?? "";
  const empty = !intro && !purpose && !pixKey;

  return (
    <>
      <PageTitle title="Apoie o clube" subtitle="Sua contribuição ajuda a manter as atividades do Último Gole FC." />
      <div className="container-page py-10">
        {empty ? (
          <EmptyState title="Informações de apoio em preparação" description="As formas de contribuição serão divulgadas em breve. Enquanto isso, fale com o clube.">
            <Link href="/contato" className="btn btn-primary">
              Entrar em contato
            </Link>
          </EmptyState>
        ) : (
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-10">
              {intro ? (
                <section aria-labelledby="formas">
                  <h2 id="formas" className="section-title mb-5">
                    Formas de contribuição
                  </h2>
                  <Prose text={intro} />
                </section>
              ) : null}
              {purpose ? (
                <section aria-labelledby="finalidade">
                  <h2 id="finalidade" className="section-title mb-5">
                    Para onde vai a contribuição
                  </h2>
                  <Prose text={purpose} />
                </section>
              ) : null}
              <p className="text-sm text-gray-600">
                Dúvidas?{" "}
                <Link href="/contato" className="link">
                  Fale com o clube
                </Link>
                .
              </p>
            </div>

            {pixKey ? (
              <aside aria-labelledby="pix" className="card h-fit border-t-4 border-t-primary p-6">
                <h2 id="pix" className="text-xl uppercase">
                  Pix
                </h2>
                {qrCodePath ? (
                  <Image src={qrCodePath} alt="QR Code do Pix do clube" width={240} height={240} className="mx-auto mt-4 size-56 object-contain" />
                ) : null}
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="font-bold uppercase tracking-wider text-gray-600">Chave</dt>
                    <dd className="mt-1 select-all break-all rounded-md border border-gray-100 bg-gray-50 px-3 py-2 font-mono">{pixKey}</dd>
                  </div>
                  {pixHolder ? (
                    <div>
                      <dt className="font-bold uppercase tracking-wider text-gray-600">Titular</dt>
                      <dd className="mt-1">{pixHolder}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="mt-5">
                  <CopyButton value={pixKey} label="Copiar chave Pix" copiedLabel="Chave copiada" />
                </div>
                <p className="hint mt-4">Confira o nome do titular no aplicativo do seu banco antes de confirmar. O portal não processa nem confirma pagamentos.</p>
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
