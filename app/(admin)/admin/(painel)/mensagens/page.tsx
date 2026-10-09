import type { Metadata } from "next";
import { ActionButton } from "@/components/ui/action-button";
import { AdminHeading } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePagePermission } from "@/lib/auth/guard";
import { formatDateTime } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { deleteMessageAction, toggleMessageReadAction } from "./actions";

export const metadata: Metadata = { title: "Mensagens" };

export default async function MessagesPage() {
  await requirePagePermission("messages:manage");
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <>
      <AdminHeading title="Mensagens" description="Últimas 100 mensagens enviadas pelo formulário de contato. Contêm dados pessoais: exclua as que não forem mais necessárias." />
      {messages.length === 0 ? (
        <EmptyState title="Nenhuma mensagem recebida" />
      ) : (
        <ul className="space-y-4">
          {messages.map((message) => (
            <li key={message.id} className={`card p-5 ${message.isRead ? "" : "border-l-4 border-l-primary"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg">{message.subject}</h2>
                  <p className="text-sm text-gray-600">
                    {message.name} ·{" "}
                    <a href={`mailto:${message.email}`} className="link">
                      {message.email}
                    </a>{" "}
                    · {formatDateTime(message.createdAt)}
                  </p>
                </div>
                <span className={`badge ${message.isRead ? "" : "badge-solid"}`}>{message.isRead ? "Lida" : "Nova"}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm">{message.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton action={toggleMessageReadAction.bind(null, message.id)} label={message.isRead ? "Marcar como não lida" : "Marcar como lida"} />
                <ConfirmButton action={deleteMessageAction.bind(null, message.id)} label="Excluir" confirmMessage="Excluir esta mensagem definitivamente?" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
