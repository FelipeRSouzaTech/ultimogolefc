import type { Metadata } from "next";
import { AdminHeading } from "@/components/ui/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePagePermission } from "@/lib/auth/guard";
import { formatDateTime } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Auditoria" };

export default async function AuditPage() {
  await requirePagePermission("audit:read");
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { name: true, email: true } } } });

  return (
    <>
      <AdminHeading title="Auditoria" description="Últimas 200 operações registradas no painel." />
      {logs.length === 0 ? (
        <EmptyState title="Nenhuma operação registrada" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="text-left">
                  Quando
                </th>
                <th scope="col" className="text-left">
                  Quem
                </th>
                <th scope="col" className="text-left">
                  Operação
                </th>
                <th scope="col" className="text-left">
                  Descrição
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-left">{formatDateTime(log.createdAt)}</td>
                  <td className="text-left">{log.user?.name ?? "Sistema"}</td>
                  <td className="text-left font-mono text-xs">{log.action}</td>
                  <td className="text-left">{log.summary ?? `${log.entity}${log.entityId ? ` ${log.entityId}` : ""}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
