"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";

type NavItem = { href: string; label: string };
type DropdownItem = { href: string; label: string; parentHref?: string };

type PublicNavItem = NavItem | { type: "dropdown"; item: NavItem; children: readonly DropdownItem[] };

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Dropdown do menu */
function NavDropdown({
  item,
  items,
  pathname,
}: {
  item: NavItem;
  items: readonly DropdownItem[];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const isActiveParent = isActive(pathname, item.href) || items.some((c) => isActive(pathname, c.href));

  return (
    <li className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={`flex items-center gap-1 px-2 py-2 text-xs font-bold uppercase tracking-[0.04em] border-b-2 transition-colors ${
          isActiveParent ? "border-primary text-primary" : "border-transparent text-black hover:text-primary"
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
      >
        {item.label}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <ul className="absolute left-0 top-full min-w-[180px] bg-white border border-gray-100 shadow-card rounded-md py-1 z-50" role="menu">
          {items.map((child) => (
            <li key={child.href} role="none">
              <Link
                href={child.href}
                className={`block px-3 py-2 text-sm font-medium transition-colors ${isActive(pathname, child.href) ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-50"}`}
                role="menuitem"
                aria-current={isActive(pathname, child.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function isDropdown(item: PublicNavItem): item is { type: "dropdown"; item: NavItem; children: readonly DropdownItem[] } {
  return "type" in item && item.type === "dropdown";
}

/** Navegação principal: horizontal no desktop, menu compacto no celular. */

export function SiteNav({ items }: { items: readonly PublicNavItem[] }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = (href: string) =>
    `block px-2 py-2 text-xs font-bold uppercase tracking-[0.04em] border-b-2 transition-colors ${
      isActive(pathname, href) ? "border-primary text-primary" : "border-transparent text-black hover:text-primary"
    }`;

  return (
    <>
      <nav aria-label="Navegação principal" className="hidden lg:block">
        <ul className="flex items-center">
          {items.map((navItem) => {
            if (isDropdown(navItem)) {
              return <NavDropdown key={navItem.item.href} item={navItem.item} items={navItem.children} pathname={pathname} />;
            }
            return (
              <li key={navItem.href}>
                <Link href={navItem.href} className={linkClass(navItem.href)} aria-current={isActive(pathname, navItem.href) ? "page" : undefined}>
                  {navItem.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Link href="/apoie" className="btn btn-primary btn-sm hidden lg:inline-flex">
        Apoie o clube
      </Link>

      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-md border border-gray-100 text-primary lg:hidden"
        aria-expanded={mobileOpen}
        aria-controls="menu-mobile"
        onClick={() => setMobileOpen((value) => !value)}
      >
        {mobileOpen ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
        <span className="sr-only">{mobileOpen ? "Fechar menu" : "Abrir menu"}</span>
      </button>

      {mobileOpen ? (
        <nav id="menu-mobile" aria-label="Navegação principal" className="absolute inset-x-0 top-full border-b border-gray-100 bg-white shadow-card lg:hidden">
          <ul className="container-page py-2">
            {items.map((navItem) => {
              if (isDropdown(navItem)) {
                return (
                  <li key={navItem.item.href} className="border-b border-gray-100">
                    <button
                      type="button"
                      className="w-full py-3 text-sm font-bold uppercase tracking-[0.04em] text-left flex items-center justify-between text-black"
                      onClick={() => setMobileOpen(false)}
                    >
                      {navItem.item.label}
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </button>
                    <ul className="pl-4 py-2 space-y-1">
                      {navItem.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={`block py-2 text-sm font-medium ${isActive(pathname, child.href) ? "text-primary" : "text-gray-700"}`}
                            onClick={() => setMobileOpen(false)}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }
              return (
                <li key={navItem.href} className="border-b border-gray-100 last:border-b-0">
                  <Link
                    href={navItem.href}
                    className={`block py-3 text-sm font-bold uppercase tracking-[0.04em] ${isActive(pathname, navItem.href) ? "text-primary" : "text-black"}`}
                    aria-current={isActive(pathname, navItem.href) ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    {navItem.label}
                  </Link>
                </li>
              );
            })}
            <li className="py-3">
              <Link href="/apoie" className="btn btn-primary w-full" onClick={() => setMobileOpen(false)}>
                Apoie o clube
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </>
  );
}