"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/action";
import { toast } from "@/lib/toast";

type Props = {
  action: () => Promise<ActionState>;
  label: string;
  confirmMessage: string;
  className?: string;
};

/** Botão para operações que pedem confirmação (exclusão, revogação). A autorização é feita no servidor; o resultado aparece como notificação. */
export function ConfirmButton({ action, label, confirmMessage, className = "btn btn-danger btn-sm" }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) {
          toast("error", result.error);
          return;
        }
        toast("success", result?.message);
        if (result?.redirectTo) router.push(result.redirectTo);
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
