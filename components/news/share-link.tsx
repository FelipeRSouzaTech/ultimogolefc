"use client";

import { useState } from "react";

/** Copia o endereço da notícia para a área de transferência, com retorno visual. */
export function ShareLink({ url }: { url: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
        Copiar link
      </button>
      <span role="status" className="text-sm text-gray-600">
        {status === "copied" ? "Link copiado." : status === "failed" ? `Copie manualmente: ${url}` : ""}
      </span>
    </div>
  );
}
