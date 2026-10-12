"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

type NavItem = { type: "item"; href: string; label: string };

type AdminNavItem = NavItem | { type: "group"; label: string; items: NavItem[]; permission?: string };

function isActive(pathname: string, href: string, isRoot: boolean): boolean {
  if (isRoot) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function GroupItem({ group, pathname, onNavigate }: { group: { label: string; items: NavItem[] }; pathname: string; onNavigate: () => void }) {
  const [open, setOpen] = useState(true);
  const isGroupActive = group.items.some((item) => isActive(pathname, item.href, false));

  return (
    <li className="shrink-0">
      <button
        type="button"
        className={`w-full flex items-center justify-between whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
          isGroupActive ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-black"
        }`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{group.label}</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-90" : "-rotate-90"}`} aria-hidden="true" />
      </button>
      {open && (
        <ul className="mt-1 ml-3 space-y-0.5 border-l border-gray-200 pl-3" role="group" aria-label={group.label}>
          {group.items.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href, false) ? "page" : undefined}
                onClick={onNavigate}
                className={`block whitespace-nowrap rounded-md px-2 py-2 lg:py-1.5 text-sm font-medium transition-colors ${
                  isActive(pathname, item.href, false) ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function SimpleItem({ item, pathname, root, onNavigate }: { item: NavItem; pathname: string; root?: string; onNavigate: () => void }) {
  return (
    <li className="shrink-0">
      <Link
        href={item.href}
        aria-current={isActive(pathname, item.href, item.href === root) ? "page" : undefined}
        onClick={onNavigate}
        className={`block whitespace-nowrap rounded-md px-3 py-2.5 lg:py-2 text-sm font-semibold transition-colors ${
          isActive(pathname, item.href, item.href === root) ? "bg-primary text-white" : "text-black hover:bg-gray-50 hover:text-primary"
        }`}
      >
        {item.label}
      </Link>
    </li>
  );
}

/**
 * Menu dos portais internos (painel e financeiro). No desktop é a coluna lateral; no celular vira um botão
 * "Menu" (com o nome da página atual) que abre a lista em coluna — a faixa rolável antiga cortava os itens
 * e abria os grupos no meio dela.
 * `root` é a página inicial do portal, que só fica ativa quando o endereço é exatamente ela.
 */
export function AdminNav({
  items,
  root = "/admin",
  label = "Menu do painel",
}: { items: AdminNavItem[]; root?: string; label?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const flat = items.flatMap((item) => (item.type === "group" ? item.items : [item]));
  const current = flat.find((item) => isActive(pathname, item.href, item.href === root))?.label;

  return (
    <nav aria-label={label}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold lg:hidden"
        aria-expanded={open}
        aria-controls="menu-portal"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 truncate">
          <span className="text-gray-600">Menu</span>
          {current ? <span className="text-primary"> · {current}</span> : null}
        </span>
        <ChevronDown className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <ul id="menu-portal" className={`${open ? "flex" : "hidden"} flex-col gap-1 border-t border-gray-100 px-2 py-2 lg:flex lg:border-t-0 lg:px-3 lg:py-4`}>
        {items.map((navItem) => {
          if (navItem.type === "group") {
            return <GroupItem key={navItem.label} group={navItem} pathname={pathname} onNavigate={close} />;
          }
          return <SimpleItem key={navItem.href} item={navItem} pathname={pathname} root={root} onNavigate={close} />;
        })}
      </ul>
    </nav>
  );
}
