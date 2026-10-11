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

function GroupItem({ group, pathname }: { group: { label: string; items: NavItem[] }; pathname: string }) {
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
                className={`block whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
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

function SimpleItem({ item, pathname, root }: { item: NavItem; pathname: string; root?: string }) {
  return (
    <li className="shrink-0">
      <Link
        href={item.href}
        aria-current={isActive(pathname, item.href, item.href === root) ? "page" : undefined}
        className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
          isActive(pathname, item.href, item.href === root) ? "bg-primary text-white" : "text-black hover:bg-gray-50 hover:text-primary"
        }`}
      >
        {item.label}
      </Link>
    </li>
  );
}

/**
 * Menu lateral dos portais internos (painel e financeiro): lateral no desktop, faixa rolável no celular.
 * `root` é a página inicial do portal, que só fica ativa quando o endereço é exatamente ela.
 * Suporta itens simples e grupos expansíveis.
 */
export function AdminNav({
  items,
  root = "/admin",
  label = "Menu do painel",
}: { items: AdminNavItem[]; root?: string; label?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="flex gap-1 overflow-x-auto px-2 py-2 lg:flex-col lg:overflow-visible lg:px-3 lg:py-4">
        {items.map((navItem) => {
          if (navItem.type === "group") {
            return <GroupItem key={navItem.label} group={navItem} pathname={pathname} />;
          }
          return <SimpleItem key={navItem.href} item={navItem} pathname={pathname} root={root} />;
        })}
      </ul>
    </nav>
  );
}