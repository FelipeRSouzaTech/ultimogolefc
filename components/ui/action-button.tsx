"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/action";
import { toast } from "@/lib/toast";

/** Botão que executa uma Server Action sem pedir confirmação (ex.: marcar como lida). O resultado aparece como notificação. */
export function ActionButton({ action, label, className = "btn btn-secondary btn-sm" }: { action: () => Promise<ActionState>; label: string; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) {
          toast("error", result.error);
          return;
        }
        toast("success", result?.message);
        router.refresh();
      } catch {
        toast("error", "Não foi possível concluir a operação.");
      }
    });
  }

  return (
    <button type="button" className={className} onClick={onClick} disabled={pending}>
      {pending ? "Aguarde…" : label}
    </button>
  );
}
