import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/layout/admin-nav";
import { requireUser } from "@/lib/auth/guard";
import { can, ROLE_LABELS, type Permission } from "@/lib/auth/permissions";
import { CREST_PATH, SITE_NAME } from "@/lib/site";
import { logoutAction } from "../actions";

export const metadata: Metadata = {
  title: { default: "Painel", template: `%s | Painel ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

type AdminMenuItem =
  | { type: "item"; href: string; label: string; permission: Permission | null }
  | { type: "group"; label: string; items: { type: "item"; href: string; label: string; permission: Permission | null }[] };

type AdminNavItem =
  | { type: "item"; href: string; label: string }
  | { type: "group"; label: string; items: { type: "item"; href: string; label: string }[] };

const MENU: AdminMenuItem[] = [
  { type: "item", href: "/admin", label: "Visão geral", permission: "dashboard:view" },
  { type: "item", href: "/admin/noticias", label: "Notícias", permission: "news:read" },
  {
    type: "group",
    label: "Futebol",
    items: [
      { type: "item", href: "/admin/jogos", label: "Jogos", permission: "football:read" },
      { type: "item", href: "/admin/campeonatos", label: "Campeonatos", permission: "football:read" },
      { type: "item", href: "/admin/clubes", label: "Clubes", permission: "football:read" },
      { type: "item", href: "/admin/elenco", label: "Elenco", permission: "football:read" },
      { type: "item", href: "/admin/comissao-tecnica", label: "Comissão Técnica", permission: "football:read" },
      { type: "item", href: "/admin/equipes", label: "Equipes", permission: "football:read" },
    ],
  },
  { type: "item", href: "/admin/diretores", label: "Diretores", permission: "content:read" },
  { type: "item", href: "/admin/patrocinadores", label: "Patrocinadores", permission: "content:read" },
  { type: "item", href: "/admin/institucional", label: "Institucional", permission: "content:read" },
  { type: "item", href: "/admin/galeria", label: "Galeria", permission: "content:read" },
  { type: "item", href: "/admin/midia", label: "Mídia", permission: "content:read" },
  { type: "item", href: "/admin/mensagens", label: "Mensagens", permission: "messages:manage" },
  { type: "item", href: "/admin/usuarios", label: "Usuários", permission: "users:manage" },
  { type: "item", href: "/admin/auditoria", label: "Auditoria", permission: "audit:read" },
  { type: "item", href: "/admin/conta", label: "Minha conta", permission: null },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Toda página do painel passa por aqui: sem sessão válida, redireciona para o login.
  const user = await requireUser();
  // Funções sem acesso ao painel (hoje, o tesoureiro) são levadas ao portal a que pertencem.
  if (!can(user.role, "dashboard:view")) redirect(can(user.role, "finance:read") ? "/financeiro" : "/admin/login");

  const filterItem = (item: { permission: Permission | null }) => item.permission === null || can(user.role, item.permission);

  const items: AdminNavItem[] = MENU.flatMap((item): AdminNavItem[] => {
    if (item.type === "group") {
      const visibleItems = item.items.filter(filterItem);
      if (visibleItems.length === 0) return [];
      return [{
        type: "group",
        label: item.label,
        items: visibleItems.map(({ href, label }) => ({ type: "item" as const, href, label }))
      }];
    }
    return filterItem(item) ? [{ type: "item" as const, href: item.href, label: item.label }] : [];
  });

  return (
    <div className="min-h-screen bg-gray-50 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-gray-100 bg-white lg:border-b-0 lg:border-r">
        <Link href="/admin" className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Image src={CREST_PATH} alt="" width={448} height={505} className="h-10 w-auto" />
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
            {can(user.role, "finance:read") ? (
              <Link href="/financeiro" className="btn btn-secondary btn-sm">
                Financeiro
              </Link>
            ) : null}
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
