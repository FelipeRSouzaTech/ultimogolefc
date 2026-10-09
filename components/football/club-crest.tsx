import Image from "next/image";

type Props = { name: string; crestPath: string | null; size?: number };

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length >= 2 ? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}` : name.slice(0, 2);
  return letters.toUpperCase();
}

/** Escudo do clube; sem imagem cadastrada, mostra as iniciais. O nome é exibido ao lado por quem usa. */
export function ClubCrest({ name, crestPath, size = 56 }: Props) {
  if (crestPath) {
    return (
      <Image
        src={crestPath}
        alt=""
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span aria-hidden="true" className="crest-fallback" style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}>
      {initials(name)}
    </span>
  );
}
