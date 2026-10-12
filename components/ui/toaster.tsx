"use client";

import { useEffect, useState } from "react";
import { pushToast, subscribeToasts, toast, TOAST_TITLES, type ToastItem, type ToastKind } from "@/lib/toast";

const ICON_PATHS: Record<ToastKind, string> = {
  success: "M5 12.5l4.5 4.5L19 7.5",
  error: "M7 7l10 10M17 7L7 17",
  warning: "M12 6v8M12 17.5v.5",
  info: "M12 11v7M12 6.5v.5",
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const [paused, setPaused] = useState(false);

  // O tempo é contado pela animação da barra: pausar a barra (mouse ou foco em cima) pausa o fechamento.
  return (
    <li
      className={`toast toast-${item.kind}`}
      role={item.kind === "error" || item.kind === "warning" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="toast-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d={ICON_PATHS[item.kind]} />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="toast-title">{TOAST_TITLES[item.kind]}</p>
        <p className="toast-message">{item.message}</p>
      </div>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Fechar notificação">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <span
        className="toast-progress"
        aria-hidden="true"
        style={{ animationDuration: `${item.durationMs}ms`, animationPlayState: paused ? "paused" : "running" }}
        onAnimationEnd={onClose}
      />
    </li>
  );
}

/** Pilha de notificações no canto superior direito. Montado uma vez, no layout raiz. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts((item) => setItems((current) => pushToast(current, item))), []);

  const close = (id: number) => setItems((current) => current.filter((item) => item.id !== id));

  return (
    <ol className="toast-stack" aria-label="Notificações">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onClose={() => close(item.id)} />
      ))}
    </ol>
  );
}

/** Dispara uma notificação ao carregar a página (avisos que vêm do servidor, ex.: acesso negado). */
export function FlashToast({ kind, message }: { kind: ToastKind; message: string }) {
  useEffect(() => {
    toast(kind, message);
  }, [kind, message]);
  return null;
}
