import type { ReactNode } from "react";

/** Título de página do painel, com área opcional para ações (botões). */
export function AdminHeading({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl uppercase">{title}</h1>
        {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {title ? <h2 className="mb-4 text-lg uppercase">{title}</h2> : null}
      {children}
    </section>
  );
}

/** Aviso exibido a perfis que podem consultar, mas não alterar. */
export function ReadOnlyNotice() {
  return <p className="alert alert-info mb-6">Seu perfil permite apenas consulta nesta área.</p>;
}
