import type { ReactNode } from "react";

type Props = { title: string; description?: string; children?: ReactNode };

/** Estado vazio: usado quando ainda não há dados cadastrados. Nunca simula informações. */
export function EmptyState({ title, description, children }: Props) {
  return (
    <div className="rounded-lg border border-dashed border-gray-400 bg-gray-50 px-6 py-10 text-center">
      <p className="font-display text-lg font-extrabold uppercase">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">{description}</p> : null}
      {children ? <div className="mt-4 flex justify-center">{children}</div> : null}
    </div>
  );
}
