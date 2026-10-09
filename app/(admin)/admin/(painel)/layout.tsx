import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdminNav } from "@/components/layout/admin-nav";
import { requireUser } from "@/lib/auth/guard";
import { can, ROLE_LABELS, type Permission } from "@/lib/auth/permissions";
import { CREST_PATH, SITE_NAME } from "@/lib/site";
import { logoutAction } from "../actions";

export const metadata: Metadata = {
  title: { default: "Painel", template: `%s | Painel ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

const MENU: { href: string; label: string; permission: Permission | null }[] = [
  { href: "/admin", label: "Visão geral", permission: "dashboard:view" },
  { href: "/admin/noticias", label: "Notícias", permission: "news:read" },
  { href: "/admin/jogos", label: "Jogos", permission: "football:read" },
  { href: "/admin/competicoes", label: "Competições", permission: "football:read" },
  { href: "/admin/clubes", label: "Clubes", permission: "football:read" },
  { href: "/admin/elenco", label: "Elenco", permission: "football:read" },
  { href: "/admin/patrocinadores", label: "Patrocinadores", permission: "content:read" },
  { href: "/admin/institucional", label: "Institucional", permission: "content:read" },
  { href: "/admin/galeria", label: "Galeria", permission: "content:read" },
  { href: "/admin/midia", label: "Mídia", permission: "content:read" },
  { href: "/admin/mensagens", label: "Mensagens", permission: "messages:manage" },
  { href: "/admin/usuarios", label: "Usuários", permission: "users:manage" },
  { href: "/admin/auditoria", label: "Auditoria", permission: "audit:read" },
  { href: "/admin/conta", label: "Minha conta", permission: null },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Toda página do painel passa por aqui: sem sessão válida, redireciona para o login.
  const user = await requireUser();
  const items = MENU.filter((item) => item.permission === null || can(user.role, item.permission)).map(({ href, label }) => ({ href, label }));

  return (
    <div className="min-h-screen bg-gray-50 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-gray-100 bg-white lg:border-b-0 lg:border-r">
        <Link href="/admin" className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Image src={CREST_PATH} alt="" width={448} height={594} className="h-10 w-auto" />
          <span className="font-display text-sm font-extrabold uppercase leading-tight text-primary">
            {SITE_NAME}
            <span className="block text-xs font-semibold text-gray-600">Painel</span>
          </span>
        </Link>
        <AdminNav items={items} />
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 sm:px-6">
          <p className="text-sm">
            <span className="font-semibold">{user.name}</span>
            <span className="text-gray-600"> · {ROLE_LABELS[user.role]}</span>
          </p>
          <div className="flex items-center gap-2">
            <Link href="/" className="btn btn-secondary btn-sm">
              Ver portal
            </Link>
            <form action={logoutAction}>
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
