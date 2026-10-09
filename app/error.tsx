"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="text-3xl uppercase">Algo deu errado</h1>
      <p className="mt-3 max-w-md text-gray-600">Não foi possível carregar esta página agora. Tente novamente em instantes.</p>
      <button type="button" className="btn btn-primary mt-6" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
