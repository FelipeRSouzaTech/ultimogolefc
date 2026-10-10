"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

/**
 * Menu lateral dos portais internos (painel e financeiro): lateral no desktop, faixa rolável no celular.
 * `root` é a página inicial do portal, que só fica ativa quando o endereço é exatamente ela.
 */
export function AdminNav({ items, root = "/admin", label = "Menu do painel" }: { items: Item[]; root?: string; label?: string }) {
  const pathname = usePathname();
  const active = (href: string) => (href === root ? pathname === root : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav aria-label={label}>
      <ul className="flex gap-1 overflow-x-auto px-2 py-2 lg:flex-col lg:overflow-visible lg:px-3 lg:py-4">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                active(item.href) ? "bg-primary text-white" : "text-black hover:bg-gray-50 hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
