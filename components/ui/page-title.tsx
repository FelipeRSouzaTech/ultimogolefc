type Props = { title: string; subtitle?: string };

/** Cabeçalho das páginas públicas: título em destaque sobre fundo claro. */
export function PageTitle({ title, subtitle }: Props) {
  return (
    <div className="border-b border-gray-100 bg-gray-50">
      <div className="container-page py-10 text-center sm:py-14">
        <span aria-hidden="true" className="mx-auto mb-4 block h-1 w-12 bg-primary" />
        <h1 className="text-3xl uppercase sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mx-auto mt-3 max-w-xl text-gray-600">{subtitle}</p> : null}
      </div>
    </div>
  );
}
