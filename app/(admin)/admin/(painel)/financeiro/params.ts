import { param } from "@/lib/params";
import { currentMonthKey, isMonthKey } from "@/modules/finance/rules";

/** Mês pedido na URL (?mes=AAAA-MM) ou, se ausente ou inválido, o mês atual. */
export function monthFromParams(params: Record<string, string | string[] | undefined>): string {
  const wanted = param(params, "mes", 7);
  return isMonthKey(wanted) ? wanted : currentMonthKey();
}
