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

export const ATHLETE_CATEGORIES = [
  "ADULT",
  "BASE_U7",
  "BASE_U9",
  "BASE_U11",
  "BASE_U13",
  "BASE_U15",
  "BASE_U17",
  "BASE_U20",
  "VETERAN",
  "MASTER",
  "SUPER_MASTER",
  "SIXTY",
] as const;
export type AthleteCategory = (typeof ATHLETE_CATEGORIES)[number];

export const ATHLETE_CATEGORY_LABELS: Record<AthleteCategory, string> = {
  ADULT: "Principal / Adulto (livre)",
  BASE_U7: "Base — Sub-7",
  BASE_U9: "Base — Sub-9",
  BASE_U11: "Base — Sub-11",
  BASE_U13: "Base — Sub-13",
  BASE_U15: "Base — Sub-15",
  BASE_U17: "Base — Sub-17",
  BASE_U20: "Base — Sub-20",
  VETERAN: "Veterano (35+)",
  MASTER: "Master (40+ / 45+)",
  SUPER_MASTER: "Super Master / Cinquentão (50+)",
  SIXTY: "Sessentão (60+)",
};

export const ATHLETE_CATEGORY_GROUPS: Record<string, { label: string; categories: AthleteCategory[] }> = {
  adult: { label: "Principal / Adulto", categories: ["ADULT"] },
  base: { label: "Base", categories: ["BASE_U7", "BASE_U9", "BASE_U11", "BASE_U13", "BASE_U15", "BASE_U17", "BASE_U20"] },
  veteran: { label: "Veterano / Master", categories: ["VETERAN", "MASTER", "SUPER_MASTER", "SIXTY"] },
};

export function getCategoryGroup(category: AthleteCategory): string {
  if (category === "ADULT") return "adult";
  if (category.startsWith("BASE_")) return "base";
  return "veteran";
}

export function sortCategoriesByGroup(categories: AthleteCategory[]): AthleteCategory[] {
  const groupOrder = ["adult", "base", "veteran"];
  return [...categories].sort((a, b) => {
    const ga = groupOrder.indexOf(getCategoryGroup(a));
    const gb = groupOrder.indexOf(getCategoryGroup(b));
    if (ga !== gb) return ga - gb;
    return ATHLETE_CATEGORIES.indexOf(a) - ATHLETE_CATEGORIES.indexOf(b);
  });
}

export const STAFF_GROUPS = ["BOARD", "TECHNICAL"] as const;
export type StaffGroup = (typeof STAFF_GROUPS)[number];

export const STAFF_GROUP_LABELS: Record<StaffGroup, string> = {
  BOARD: "Diretoria",
  TECHNICAL: "Comissão técnica",
};

export const TECHNICAL_STAFF_ROLES = [
  "HEAD_COACH",
  "ASSISTANT_COACH",
  "PHYSICAL_TRAINER",
  "GOALKEEPER_COACH",
  "PHYSIOTHERAPIST",
  "DOCTOR",
  "NUTRITIONIST",
  "PSYCHOLOGIST",
  "ANALYST",
  "OTHER",
] as const;
export type TechnicalStaffRole = (typeof TECHNICAL_STAFF_ROLES)[number];

export const TECHNICAL_STAFF_ROLE_LABELS: Record<TechnicalStaffRole, string> = {
  HEAD_COACH: "Técnico",
  ASSISTANT_COACH: "Aux. Técnico",
  PHYSICAL_TRAINER: "Preparador Físico",
  GOALKEEPER_COACH: "Treineiro de Goleiros",
  PHYSIOTHERAPIST: "Fisioterapeuta",
  DOCTOR: "Médico",
  NUTRITIONIST: "Nutricionista",
  PSYCHOLOGIST: "Psicólogo",
  ANALYST: "Analista de Desempenho",
  OTHER: "Outro",
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
