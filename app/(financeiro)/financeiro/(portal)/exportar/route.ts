import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/datetime";
import { CATEGORY_LABELS, centsToInput, currentMonthKey, ENTRY_TYPE_LABELS, isMonthKey, PAYMENT_METHOD_LABELS, toCsv, type Category, type EntryType, type PaymentMethod } from "@/modules/finance/rules";
import { listEntries } from "@/modules/finance/service";

export const dynamic = "force-dynamic";

/** GET /financeiro/exportar?mes=AAAA-MM — lançamentos do mês em CSV. Exige sessão e permissão. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sessão expirada.", { status: 401 });
  if (!can(user.role, "finance:read")) return new NextResponse("Sem permissão.", { status: 403 });

  const wanted = request.nextUrl.searchParams.get("mes");
  const month = isMonthKey(wanted) ? wanted : currentMonthKey();
  const entries = await listEntries({ month });

  const csv = toCsv(
    ["Data", "Tipo", "Categoria", "Descrição", "Valor (R$)", "Forma", "Partida", "Acordo", "Situação", "Motivo do estorno", "Lançado por"],
    entries.map((entry) => [
      formatDate(entry.occurredOn),
      ENTRY_TYPE_LABELS[entry.type as EntryType],
      CATEGORY_LABELS[entry.category as Category],
      entry.description,
      // Despesa sai negativa, para a coluna poder ser somada direto na planilha.
      centsToInput(entry.type === "EXPENSE" ? -entry.amountCents : entry.amountCents),
      PAYMENT_METHOD_LABELS[entry.method as PaymentMethod],
      entry.match ? `${entry.match.homeTeam.name} x ${entry.match.awayTeam.name}` : "",
      entry.agreement?.name ?? "",
      entry.voidedAt ? "Estornado" : "Válido",
      entry.voidReason ?? "",
      entry.createdBy?.name ?? "",
    ]),
  );
  await audit({ userId: user.id, action: "finance.export", entity: "FinanceEntry", entityId: month, summary: `Exportou os lançamentos de ${month} (${entries.length})` });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
