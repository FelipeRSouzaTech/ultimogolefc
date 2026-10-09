import Link from "next/link";

type Option = { value: string; label: string };

type Props = {
  action: string;
  competitions: { name: string; slug: string }[];
  seasonLabels: string[];
  statuses?: Option[];
  current: { competicao?: string; temporada?: string; status?: string };
};

/** Filtros por competição, temporada e status. Formulário GET: funciona sem JavaScript e gera URL compartilhável. */
export function MatchFilters({ action, competitions, seasonLabels, statuses, current }: Props) {
  const hasFilter = Boolean(current.competicao || current.temporada || current.status);
  return (
    <form action={action} method="get" className="card mb-8 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
      <div>
        <label className="label" htmlFor="competicao">
          Competição
        </label>
        <select id="competicao" name="competicao" className="input" defaultValue={current.competicao ?? ""}>
          <option value="">Todas</option>
          {competitions.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="temporada">
          Temporada
        </label>
        <select id="temporada" name="temporada" className="input" defaultValue={current.temporada ?? ""}>
          <option value="">Todas</option>
          {seasonLabels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {statuses ? (
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="input" defaultValue={current.status ?? ""}>
            <option value="">Todos os próximos</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="hidden lg:block" />
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary flex-1">
          Filtrar
        </button>
        {hasFilter ? (
          <Link href={action} className="btn btn-secondary">
            Limpar
          </Link>
        ) : null}
      </div>
    </form>
  );
}
