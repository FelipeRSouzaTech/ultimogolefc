"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/action";

type Props = {
  action: () => Promise<ActionState>;
  label: string;
  confirmMessage: string;
  className?: string;
};

/** Botão para operações que pedem confirmação (exclusão, revogação). A autorização é feita no servidor. */
export function ConfirmButton({ action, label, confirmMessage, className = "btn btn-danger btn-sm" }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) {
          setError(result.error);
          return;
        }
        setError(null);
        if (result?.redirectTo) router.push(result.redirectTo);
        router.refresh();
      } catch {
        setError("Não foi possível concluir a operação.");
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className={className} onClick={onClick} disabled={pending}>
        {pending ? "Aguarde…" : label}
      </button>
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
