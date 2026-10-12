"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";

/** Copia o endereço da notícia para a área de transferência, com retorno visual. */
export function ShareLink({ url }: { url: string }) {
  // Se a cópia falhar, o endereço fica visível para ser copiado à mão (um aviso passageiro não serviria).
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setFailed(false);
      toast("success", "Link copiado.");
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
        Copiar link
      </button>
      <span role="status" className="text-sm text-gray-600">
        {failed ? `Copie manualmente: ${url}` : ""}
      </span>
    </div>
  );
}
