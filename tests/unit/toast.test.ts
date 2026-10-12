import { describe, expect, it } from "vitest";
import { confirmTexts } from "@/lib/confirm";
import { MAX_TOASTS, pushToast, subscribeToasts, toast, toastDuration, type ToastItem } from "@/lib/toast";

const item = (id: number, kind: ToastItem["kind"], message: string): ToastItem => ({ id, kind, message, durationMs: 1000 });

describe("notificações (toasts)", () => {
  it("erros e avisos ficam mais tempo, e textos longos ganham tempo de leitura até o limite", () => {
    expect(toastDuration("success", "Salvo.")).toBe(4500);
    expect(toastDuration("info", "Salvo.")).toBe(4500);
    expect(toastDuration("error", "Falhou.")).toBe(7000);
    expect(toastDuration("warning", "Cuidado.")).toBe(7000);
    expect(toastDuration("success", "x".repeat(110))).toBe(6500);
    expect(toastDuration("error", "x".repeat(2000))).toBe(12000);
  });

  it("não repete um aviso igual ainda visível e respeita o limite da pilha", () => {
    const queue = pushToast([item(1, "success", "Salvo.")], item(2, "success", "Salvo."));
    expect(queue.map((entry) => entry.id)).toEqual([2]);
    expect(pushToast(queue, item(3, "error", "Salvo.")).map((entry) => entry.id)).toEqual([2, 3]);

    let full: ToastItem[] = [];
    for (let id = 1; id <= MAX_TOASTS + 2; id++) full = pushToast(full, item(id, "info", `Aviso ${id}`));
    expect(full).toHaveLength(MAX_TOASTS);
    expect(full[0]?.id).toBe(3);
  });

  it("entrega o aviso a quem escuta, ignora mensagem vazia e para ao cancelar a inscrição", () => {
    const received: ToastItem[] = [];
    const unsubscribe = subscribeToasts((entry) => received.push(entry));
    toast("success", "  Campeonato salvo.  ");
    toast("error", "   ");
    toast("info", undefined);
    toast("info", null);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ kind: "success", message: "Campeonato salvo.", durationMs: 4500 });
    unsubscribe();
    toast("success", "Depois de cancelar.");
    expect(received).toHaveLength(1);
  });
});

describe("modal de confirmação", () => {
  it("usa título e aviso de exclusão ou remoção conforme o rótulo do botão", () => {
    expect(confirmTexts("Excluir")).toEqual({ title: "Confirmar exclusão", success: "Excluído com sucesso." });
    expect(confirmTexts("Excluir álbum")).toEqual({ title: "Confirmar exclusão", success: "Excluído com sucesso." });
    expect(confirmTexts("Remover foto")).toEqual({ title: "Confirmar remoção", success: "Removido com sucesso." });
    expect(confirmTexts("  remover ")).toEqual({ title: "Confirmar remoção", success: "Removido com sucesso." });
  });

  it("para outras operações usa o próprio rótulo", () => {
    expect(confirmTexts("Revogar sessões")).toEqual({ title: "Revogar sessões?", success: "Operação concluída." });
    expect(confirmTexts("")).toEqual({ title: "Confirmar", success: "Operação concluída." });
  });
});
