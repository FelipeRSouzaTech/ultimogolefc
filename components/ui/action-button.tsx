"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/action";

/** Botão que executa uma Server Action sem pedir confirmação (ex.: marcar como lida). */
export function ActionButton({ action, label, className = "btn btn-secondary btn-sm" }: { action: () => Promise<ActionState>; label: string; className?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        const result = await action();
        setError(result?.error ?? null);
        if (!result?.error) router.refresh();
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
