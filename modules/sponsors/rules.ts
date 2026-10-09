// Patrocinadores. Módulo puro.

export const SPONSOR_TIERS = ["MASTER", "OFFICIAL", "SUPPORTER", "INSTITUTIONAL"] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];

export const SPONSOR_TIER_LABELS: Record<SponsorTier, string> = {
  MASTER: "Patrocinador master",
  OFFICIAL: "Patrocinadores oficiais",
  SUPPORTER: "Apoiadores",
  INSTITUTIONAL: "Parceiros institucionais",
};

type SponsorLike = { isActive: boolean; startsAt: Date | null; endsAt: Date | null };

/** Um patrocinador aparece no portal se estiver ativo e dentro do período de vigência (quando informado). */
export function isSponsorVisible(sponsor: SponsorLike, now: Date = new Date()): boolean {
  if (!sponsor.isActive) return false;
  if (sponsor.startsAt && sponsor.startsAt.getTime() > now.getTime()) return false;
  if (sponsor.endsAt && sponsor.endsAt.getTime() < now.getTime()) return false;
  return true;
}

export function groupByTier<T extends { tier: string; sortOrder: number; name: string }>(
  sponsors: readonly T[],
): { tier: SponsorTier; label: string; sponsors: T[] }[] {
  return SPONSOR_TIERS.map((tier) => ({
    tier,
    label: SPONSOR_TIER_LABELS[tier],
    sponsors: sponsors.filter((sponsor) => sponsor.tier === tier).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt-BR")),
  })).filter((group) => group.sponsors.length > 0);
}
