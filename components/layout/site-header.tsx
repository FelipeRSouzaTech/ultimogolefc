import Image from "next/image";
import Link from "next/link";
import { CREST_PATH, PUBLIC_NAV, SITE_NAME } from "@/lib/site";
import { SiteNav } from "./site-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-header">
      <div className="container-page relative flex h-16 items-center justify-between gap-4 lg:h-20">
        <Link href="/" className="flex items-center gap-3" aria-label={`${SITE_NAME} — página inicial`}>
          <Image src={CREST_PATH} alt="" width={448} height={594} priority className="h-11 w-auto lg:h-14" />
          <span className="font-display text-lg font-extrabold uppercase leading-none text-primary lg:text-xl">{SITE_NAME}</span>
        </Link>
        <SiteNav items={PUBLIC_NAV} />
      </div>
    </header>
  );
}
