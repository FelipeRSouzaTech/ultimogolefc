import type { Metadata } from "next";
import Link from "next/link";
import { ClubCrest } from "@/components/football/club-crest";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { saveClubAction } from "./actions";
import { ClubForm } from "./club-form";

export const metadata: Metadata = { title: "Clubes" };

export default async function ClubsPage() {
  const user = await requirePagePermission("football:read");
  const clubs = await prisma.club.findMany({ orderBy: [{ isOwnClub: "desc" }, { name: "asc" }] });
  const canWrite = can(user.role, "football:write");

  return (
    <>
      <AdminHeading title="Clubes" description="Nosso clube e os adversários usados em partidas e competições." />
      {canWrite ? null : <ReadOnlyNotice />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Clubes cadastrados">
          {clubs.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum clube cadastrado. Comece pelo nosso clube.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {clubs.map((club) => (
                <li key={club.id} className="flex items-center gap-3 py-3">
                  <ClubCrest name={club.name} crestPath={club.crestPath} size={32} />
                  <Link href={`/admin/clubes/${club.id}`} className="flex-1 font-semibold hover:text-primary hover:underline">
                    {club.name}
                  </Link>
                  {club.isOwnClub ? <span className="badge badge-solid">Nosso clube</span> : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {canWrite ? (
          <Panel title="Novo clube">
            <ClubForm action={saveClubAction.bind(null, null)} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
