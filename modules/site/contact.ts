// Regras do formulário de contato. Módulo puro.

export const CONTACT_WINDOW_MINUTES = 60;
export const CONTACT_MAX_PER_IP = 3;
export const CONTACT_MAX_GLOBAL = 40;

/** Decide se um novo envio deve ser recusado, dadas as contagens recentes. */
export function isContactRateLimited(countFromIp: number | null, countGlobal: number): boolean {
  if (countGlobal >= CONTACT_MAX_GLOBAL) return true;
  return countFromIp !== null && countFromIp >= CONTACT_MAX_PER_IP;
}
