import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { logoutFinanceAction } from "@/app/(admin)/admin/actions";
import { AdminNav } from "@/components/layout/admin-nav";
import { requireFinance } from "@/lib/auth/finance-guard";
import { can, ROLE_LABELS } from "@/lib/auth/permissions";
import { CREST_PATH, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: "Financeiro", template: `%s | Financeiro ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

const MENU = [
  { href: "/financeiro", label: "Resumo" },
  { href: "/financeiro/lancamentos", label: "Lançamentos" },
  { href: "/financeiro/mensalidades", label: "Mensalidades" },
  { href: "/financeiro/acordos", label: "Patrocínios e doações" },
  { href: "/financeiro/jogos", label: "Custos por jogo" },
  { href: "/financeiro/conta", label: "Minha conta" },
];

/**
 * Portal financeiro: área própria, separada do painel administrativo, mas com o mesmo login,
 * as mesmas contas e os mesmos componentes. Toda página passa por aqui e exige a permissão do financeiro.
 */
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireFinance();

  return (
    <div className="min-h-screen bg-gray-50 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-gray-100 bg-white lg:border-b-0 lg:border-r">
        <Link href="/financeiro" className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Image src={CREST_PATH} alt="" width={448} height={505} className="h-10 w-auto" />
          <span className="font-display text-sm font-extrabold uppercase leading-tight text-primary">
            {SITE_NAME}
            <span className="block text-xs font-semibold text-gray-600">Financeiro</span>
          </span>
        </Link>
        <AdminNav items={MENU} root="/financeiro" label="Menu do financeiro" />
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 sm:px-6">
          <p className="text-sm">
            <span className="font-semibold">{user.name}</span>
            <span className="text-gray-600"> · {ROLE_LABELS[user.role]}</span>
          </p>
          <div className="flex items-center gap-2">
            {can(user.role, "dashboard:view") ? (
              <Link href="/admin" className="btn btn-secondary btn-sm">
                Painel
              </Link>
            ) : null}
            <form action={logoutFinanceAction}>
              <button type="submit" className="btn btn-primary btn-sm">
                Sair
              </button>
            </form>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
