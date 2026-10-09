import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/ui/page-title";
import { getSettings } from "@/modules/site/service";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o portal do Último Gole FC trata dados pessoais.",
  alternates: { canonical: "/privacidade" },
};

// Este texto descreve o que o portal efetivamente faz com dados pessoais.
// Deve ser revisado pela diretoria (e, se possível, por assessoria jurídica) antes da publicação definitiva.
export default async function PrivacidadePage() {
  const settings = await getSettings();
  const email = settings["contact.email"] ?? "";

  return (
    <>
      <PageTitle title="Política de privacidade" subtitle="Como o portal do Último Gole FC trata dados pessoais." />
      <div className="container-page py-10">
        <div className="mx-auto max-w-3xl space-y-8 text-gray-600">
          <section>
            <h2 className="section-title mb-3 text-black">Quais dados coletamos</h2>
            <ul className="list-inside list-disc space-y-2">
              <li>
                <strong className="text-black">Formulário de contato:</strong> nome, e-mail, assunto e mensagem que você enviar, além do endereço IP, usado para evitar abuso do formulário.
              </li>
              <li>
                <strong className="text-black">Navegação:</strong> o portal não usa cookies de publicidade nem de rastreamento. O único cookie existente é o de sessão do painel administrativo, usado apenas por quem administra o site.
              </li>
            </ul>
          </section>
          <section>
            <h2 className="section-title mb-3 text-black">Para que usamos</h2>
            <p>Os dados do formulário são usados somente para responder à sua mensagem. Não são vendidos nem compartilhados para fins de publicidade.</p>
          </section>
          <section>
            <h2 className="section-title mb-3 text-black">Imagem e nome de atletas e dirigentes</h2>
            <p>Nomes e fotos de jogadores, comissão técnica e diretoria só são publicados com autorização da pessoa, e podem ser retirados a pedido.</p>
          </section>
          <section>
            <h2 className="section-title mb-3 text-black">Por quanto tempo guardamos</h2>
            <p>As mensagens de contato ficam guardadas pelo tempo necessário para o atendimento e são excluídas pela administração quando deixam de ser necessárias.</p>
          </section>
          <section>
            <h2 className="section-title mb-3 text-black">Seus direitos</h2>
            <p>
              Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode pedir a confirmação da existência de tratamento, o acesso, a correção e a exclusão dos seus dados.{" "}
              {email ? (
                <>
                  Envie o pedido para{" "}
                  <a href={`mailto:${email}`} className="link">
                    {email}
                  </a>
                  .
                </>
              ) : (
                <>
                  Envie o pedido pela página de{" "}
                  <Link href="/contato" className="link">
                    contato
                  </Link>
                  .
                </>
              )}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
