"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

type Item = { href: string; label: string };

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Navegação principal: horizontal no desktop, menu compacto no celular. */
export function SiteNav({ items }: { items: readonly Item[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) =>
    `block px-2 py-2 text-xs font-bold uppercase tracking-[0.04em] border-b-2 transition-colors ${
      isActive(pathname, href) ? "border-primary text-primary" : "border-transparent text-black hover:text-primary"
    }`;

  return (
    <>
      <nav aria-label="Navegação principal" className="hidden lg:block">
        <ul className="flex items-center">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={linkClass(item.href)} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Link href="/apoie" className="btn btn-primary btn-sm hidden lg:inline-flex">
        Apoie o clube
      </Link>

      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-md border border-gray-100 text-primary lg:hidden"
        aria-expanded={open}
        aria-controls="menu-mobile"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
        <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
      </button>

      {open ? (
        <nav id="menu-mobile" aria-label="Navegação principal" className="absolute inset-x-0 top-full border-b border-gray-100 bg-white shadow-card lg:hidden">
          <ul className="container-page py-2">
            {items.map((item) => (
              <li key={item.href} className="border-b border-gray-100 last:border-b-0">
                <Link
                  href={item.href}
                  className={`block py-3 text-sm font-bold uppercase tracking-[0.04em] ${isActive(pathname, item.href) ? "text-primary" : "text-black"}`}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="py-3">
              <Link href="/apoie" className="btn btn-primary w-full" onClick={() => setOpen(false)}>
                Apoie o clube
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </>
  );
}
