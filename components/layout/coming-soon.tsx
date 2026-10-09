import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";

/** Página de seção ainda não implementada. Diz isso claramente, sem simular conteúdo. */
export function ComingSoon({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <PageTitle title={title} subtitle={subtitle} />
      <div className="container-page py-12">
        <EmptyState title="Seção em preparação" description="Esta área do portal ainda está sendo construída e será publicada em breve.">
          <Link href="/" className="btn btn-secondary">
            Voltar ao início
          </Link>
        </EmptyState>
      </div>
    </>
  );
}
