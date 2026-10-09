import { ClubCrest } from "./club-crest";

type Props = { name: string; caption: string; photoPath?: string | null; number?: number | null; description?: string | null };

/** Card de pessoa (jogador, diretoria, comissão). Sem foto, mostra as iniciais. */
export function PersonCard({ name, caption, photoPath = null, number = null, description = null }: Props) {
  return (
    <article className="card flex h-full flex-col items-center p-5 text-center">
      <div className="relative">
        <ClubCrest name={name} crestPath={photoPath} size={96} />
        {number !== null ? (
          <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-primary font-display text-sm font-extrabold text-white" aria-label={`Camisa ${number}`}>
            {number}
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-lg uppercase">{name}</h3>
      <p className="eyebrow mt-1">{caption}</p>
      {description ? <p className="mt-3 line-clamp-4 text-sm text-gray-600">{description}</p> : null}
    </article>
  );
}
