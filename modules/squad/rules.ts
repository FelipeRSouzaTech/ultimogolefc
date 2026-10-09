// Elenco e comissão. Módulo puro.

export const POSITIONS = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  GOALKEEPER: "Goleiro",
  DEFENDER: "Defensor",
  MIDFIELDER: "Meio-campista",
  FORWARD: "Atacante",
};

export const POSITION_GROUP_LABELS: Record<Position, string> = {
  GOALKEEPER: "Goleiros",
  DEFENDER: "Defensores",
  MIDFIELDER: "Meio-campistas",
  FORWARD: "Atacantes",
};

export const STAFF_GROUPS = ["BOARD", "TECHNICAL"] as const;
export type StaffGroup = (typeof STAFF_GROUPS)[number];

export const STAFF_GROUP_LABELS: Record<StaffGroup, string> = {
  BOARD: "Diretoria",
  TECHNICAL: "Comissão técnica",
};

type AthleteLike = { name: string; nickname: string | null; position: string; shirtNumber: number | null };

/** Nome exibido: o apelido esportivo, quando houver. */
export function displayName(athlete: { name: string; nickname: string | null }): string {
  return athlete.nickname?.trim() || athlete.name;
}

/** Agrupa por posição na ordem goleiros → atacantes; dentro do grupo, por número da camisa e depois por nome. */
export function groupByPosition<T extends AthleteLike>(athletes: readonly T[]): { position: Position; label: string; athletes: T[] }[] {
  return POSITIONS.map((position) => ({
    position,
    label: POSITION_GROUP_LABELS[position],
    athletes: athletes
      .filter((athlete) => athlete.position === position)
      .sort(
        (a, b) =>
          (a.shirtNumber ?? Number.MAX_SAFE_INTEGER) - (b.shirtNumber ?? Number.MAX_SAFE_INTEGER) ||
          displayName(a).localeCompare(displayName(b), "pt-BR"),
      ),
  })).filter((group) => group.athletes.length > 0);
}
