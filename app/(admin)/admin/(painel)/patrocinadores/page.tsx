import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { SPONSOR_TIER_LABELS, isSponsorVisible, type SponsorTier } from "@/modules/sponsors/rules";
import { saveSponsorAction } from "./actions";
import { SponsorForm } from "./sponsor-form";

export const metadata: Metadata = { title: "Patrocinadores" };

export default async function SponsorsAdminPage() {
  const user = await requirePagePermission("content:read");
  const sponsors = await prisma.sponsor.findMany({ orderBy: [{ tier: "asc" }, { sortOrder: "asc" }, { name: "asc" }] });
  const canWrite = can(user.role, "content:write");

  return (
    <>
      <AdminHeading title="Patrocinadores" description="Parceiros exibidos no portal, por categoria." />
      {canWrite ? null : <ReadOnlyNotice />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Patrocinadores cadastrados">
          {sponsors.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum patrocinador cadastrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sponsors.map((sponsor) => (
                <li key={sponsor.id} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <Link href={`/admin/patrocinadores/${sponsor.id}`} className="font-semibold hover:text-primary hover:underline">
                      {sponsor.name}
                    </Link>
                    <span className="block text-xs text-gray-600">{SPONSOR_TIER_LABELS[sponsor.tier as SponsorTier]}</span>
                  </span>
                  <span className={`badge ${isSponsorVisible(sponsor) ? "badge-solid" : ""}`}>
                    {isSponsorVisible(sponsor) ? "No portal" : sponsor.isActive ? "Fora da vigência" : "Inativo"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {canWrite ? (
          <Panel title="Novo patrocinador">
            <SponsorForm action={saveSponsorAction.bind(null, null)} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
