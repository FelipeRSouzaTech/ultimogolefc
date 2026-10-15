// Diretores: cargos e situações.

export const DIRECTOR_ROLES = [
  "PRESIDENT",
  "VICE_PRESIDENT",
  "FOOTBALL_DIRECTOR",
  "FOOTBALL_VICE_DIRECTOR",
  "FINANCIAL_DIRECTOR",
  "TREASURER",
  "ADMINISTRATIVE_DIRECTOR",
  "HERITAGE_DIRECTOR",
  "COMMUNICATION_DIRECTOR",
  "MARKETING_SPONSORSHIP_DIRECTOR",
  "EVENTS_DIRECTOR",
  "LOGISTICS_DIRECTOR",
  "FIELD_FOOTBALL_DIRECTOR",
  "FOOTBALL_SUPERVISOR",
  "TECHNICAL_COORDINATOR",
  "SOCIAL_DIRECTOR",
  "COUNCILOR",
  "REFEREE_DIRECTOR",
  "UNIFORM_EQUIPMENT_DIRECTOR",
  "REGISTRATION_COMPETITION_DIRECTOR",
  "FUNDRAISING_DIRECTOR",
  "INSTITUTIONAL_RELATIONS_DIRECTOR",
  "YOUTH_DIRECTOR",
  "SPONSORSHIP_CAPTATION_DIRECTOR",
  "MATCH_OPERATIONS_DIRECTOR",
  "SECRETARY",
  "MESARIO",
  "SQUAD_COORDINATOR",
  "TECHNICAL_STAFF_RESPONSIBLE",
  "PLAYER_RELATIONS_DIRECTOR",
] as const;
export type DirectorRole = (typeof DIRECTOR_ROLES)[number];

export const DIRECTOR_ROLE_LABELS: Record<DirectorRole, string> = {
  PRESIDENT: "Presidente",
  VICE_PRESIDENT: "Vice-presidente",
  FOOTBALL_DIRECTOR: "Diretor de Futebol",
  FOOTBALL_VICE_DIRECTOR: "Vice-diretor de Futebol",
  FINANCIAL_DIRECTOR: "Diretor Financeiro",
  TREASURER: "Tesoureiro",
  ADMINISTRATIVE_DIRECTOR: "Diretor Administrativo",
  HERITAGE_DIRECTOR: "Diretor de Patrimônio",
  COMMUNICATION_DIRECTOR: "Diretor de Comunicação",
  MARKETING_SPONSORSHIP_DIRECTOR: "Diretor de Marketing e Patrocínio",
  EVENTS_DIRECTOR: "Diretor de Eventos",
  LOGISTICS_DIRECTOR: "Diretor de Logística",
  FIELD_FOOTBALL_DIRECTOR: "Diretor de Futebol de Campo",
  FOOTBALL_SUPERVISOR: "Supervisor de Futebol",
  TECHNICAL_COORDINATOR: "Coordenador Técnico",
  SOCIAL_DIRECTOR: "Diretor Social",
  COUNCILOR: "Conselheiro",
  REFEREE_DIRECTOR: "Diretor de Arbitragem",
  UNIFORM_EQUIPMENT_DIRECTOR: "Diretor de Uniformes e Materiais Esportivos",
  REGISTRATION_COMPETITION_DIRECTOR: "Diretor de Inscrições e Competições",
  FUNDRAISING_DIRECTOR: "Diretor de Arrecadação",
  INSTITUTIONAL_RELATIONS_DIRECTOR: "Diretor de Relações Institucionais",
  YOUTH_DIRECTOR: "Diretor de Base",
  SPONSORSHIP_CAPTATION_DIRECTOR: "Diretor de Captação de Patrocínios",
  MATCH_OPERATIONS_DIRECTOR: "Diretor de Operações de Jogo",
  SECRETARY: "Secretário",
  MESARIO: "Mesário",
  SQUAD_COORDINATOR: "Coordenador de Elenco",
  TECHNICAL_STAFF_RESPONSIBLE: "Responsável pela Comissão Técnica",
  PLAYER_RELATIONS_DIRECTOR: "Diretor de Relações com Atletas",
};

export const DIRECTOR_STATUSES = ["ACTIVE", "AWAY", "ON_LEAVE", "INACTIVE", "DISMISSED"] as const;
export type DirectorStatus = (typeof DIRECTOR_STATUSES)[number];
export const DIRECTOR_STATUS_LABELS: Record<DirectorStatus, string> = {
  ACTIVE: "Ativo",
  AWAY: "Afastado",
  ON_LEAVE: "Licenciado",
  INACTIVE: "Inativo",
  DISMISSED: "Desligado",
};

/** Só diretores ativos recebem cobrança de mensalidade; afastados, licenciados, inativos e desligados ficam de fora. */
export function paysDues(status: string): boolean {
  return status === "ACTIVE";
}
