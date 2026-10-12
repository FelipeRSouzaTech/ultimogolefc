"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/action";
import { confirmTexts } from "@/lib/confirm";
import { toast } from "@/lib/toast";

type Props = {
  action: () => Promise<ActionState>;
  label: string;
  confirmMessage: string;
  className?: string;
  /** Aviso mostrado quando a operação dá certo e a ação não devolve mensagem própria. */
  successMessage?: string;
};

/**
 * Botão para operações que pedem confirmação (exclusão, revogação). Abre um modal com a pergunta;
 * ao confirmar, executa a Server Action (a autorização é feita no servidor) e mostra o resultado
 * como notificação. Cancelar, Esc ou clicar fora fecham sem fazer nada.
 */
export function ConfirmButton({ action, label, confirmMessage, className = "btn btn-danger btn-sm", successMessage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  const texts = confirmTexts(label);

  // showModal() dá o comportamento nativo de modal: foco preso, Esc para fechar e fundo inerte.
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);

  function confirm() {
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) {
          toast("error", result.error);
          setOpen(false);
          return;
        }
        toast("success", result?.message ?? successMessage ?? texts.success);
        setOpen(false);
        if (result?.redirectTo) router.push(result.redirectTo);
        router.refresh();
      } catch {
        toast("error", "Não foi possível concluir a operação.");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} disabled={pending}>
        {pending ? "Aguarde…" : label}
      </button>
      {open ? (
        <dialog
          ref={dialog}
          className="modal"
          aria-labelledby={titleId}
          aria-describedby={messageId}
          onClose={() => setOpen(false)}
          onCancel={(event) => {
            // Enquanto a operação está em andamento, Esc não fecha.
            if (pending) event.preventDefault();
          }}
          onClick={(event) => {
            // Clique no fundo escuro (fora da caixa) fecha.
            if (event.target === event.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="modal-body">
            <span className="modal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v5M12 16.5v.5M10.3 3.9L2.6 17.3A2 2 0 004.3 20.3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
              </svg>
            </span>
            <h2 id={titleId} className="text-lg uppercase">
              {texts.title}
            </h2>
            <p id={messageId} className="mt-2 text-sm text-gray-600">
              {confirmMessage}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {/* Cancelar recebe o foco ao abrir: Enter por engano não exclui. */}
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={pending} autoFocus>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger-solid" onClick={confirm} disabled={pending}>
                {pending ? "Aguarde…" : label}
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
