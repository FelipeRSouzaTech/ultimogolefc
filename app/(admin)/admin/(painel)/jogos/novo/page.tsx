import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel } from "@/components/ui/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePagePermission } from "@/lib/auth/guard";
import { saveMatchAction } from "../actions";
import { loadSeasonOptions } from "../data";
import { MatchForm } from "../match-form";

export const metadata: Metadata = { title: "Nova partida" };

export default async function NewMatchPage() {
  await requirePagePermission("football:write");
  const seasons = await loadSeasonOptions();

  return (
    <>
      <AdminHeading title="Nova partida">
        <Link href="/admin/jogos" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
      </AdminHeading>
      {seasons.length === 0 ? (
        <EmptyState title="Cadastre uma temporada primeiro" description="Uma partida pertence a uma temporada de uma competição, com os clubes participantes definidos.">
          <Link href="/admin/competicoes" className="btn btn-primary">
            Ir para competições
          </Link>
        </EmptyState>
      ) : (
        <Panel className="max-w-3xl">
          <MatchForm action={saveMatchAction.bind(null, null)} seasons={seasons} />
        </Panel>
      )}
    </>
  );
}
