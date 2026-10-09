"use client";

import { useState } from "react";

/** Copia um texto para a área de transferência e informa o resultado. */
export function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn btn-primary" onClick={copy}>
        {status === "copied" ? copiedLabel : label}
      </button>
      <span role="status" className="text-sm text-gray-600">
        {status === "copied" ? "Copiado para a área de transferência." : status === "failed" ? "Não foi possível copiar automaticamente. Selecione e copie o texto." : ""}
      </span>
    </div>
  );
}
