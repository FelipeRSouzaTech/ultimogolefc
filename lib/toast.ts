// Fila de notificações (toasts). Módulo puro: quem dispara chama toast(); o <Toaster> escuta e desenha.

export const TOAST_KINDS = ["success", "error", "warning", "info"] as const;
export type ToastKind = (typeof TOAST_KINDS)[number];
export type ToastItem = { id: number; kind: ToastKind; message: string; durationMs: number };

export const TOAST_TITLES: Record<ToastKind, string> = { success: "Sucesso!", error: "Erro!", warning: "Atenção!", info: "Informação" };

/** No máximo este número de avisos na tela; os mais antigos saem primeiro. */
export const MAX_TOASTS = 4;

/** Erros e avisos ficam mais tempo; textos longos ganham tempo de leitura (até 12 s). */
export function toastDuration(kind: ToastKind, message: string): number {
  const base = kind === "error" || kind === "warning" ? 7000 : 4500;
  return Math.min(12000, base + Math.max(0, message.length - 60) * 40);
}

/** Acrescenta um aviso à fila, sem repetir um igual que ainda esteja visível, e respeitando o limite. */
export function pushToast(queue: readonly ToastItem[], item: ToastItem, max: number = MAX_TOASTS): ToastItem[] {
  const withoutSame = queue.filter((current) => !(current.kind === item.kind && current.message === item.message));
  return [...withoutSame, item].slice(-max);
}

type Listener = (item: ToastItem) => void;
const listeners = new Set<Listener>();
let nextId = 1;

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Mostra uma notificação no canto da tela. Mensagem vazia é ignorada. */
export function toast(kind: ToastKind, message: string | null | undefined): void {
  const text = message?.trim();
  if (!text) return;
  const item: ToastItem = { id: nextId++, kind, message: text, durationMs: toastDuration(kind, text) };
  for (const listener of listeners) listener(item);
}
