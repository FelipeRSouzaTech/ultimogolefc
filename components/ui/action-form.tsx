"use client";

import { createContext, useContext, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionState, FormAction } from "@/lib/action";
import { toast } from "@/lib/toast";

const FormStateContext = createContext<ActionState>({});

/** Mostra os erros de validação de um campo. Deve estar dentro de <ActionForm>. */
export function FieldError({ name }: { name: string }) {
  const state = useContext(FormStateContext);
  const messages = state.fieldErrors?.[name];
  if (!messages?.length) return null;
  return (
    <p className="field-error" id={`${name}-erro`} role="alert">
      {messages.join(" ")}
    </p>
  );
}

type Props = {
  action: FormAction;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  submitClassName?: string;
  /** Limpa os campos depois de um envio bem-sucedido (formulários de "adicionar"). */
  resetOnSuccess?: boolean;
};

/**
 * Formulário ligado a uma Server Action.
 * Mantém os valores digitados quando o servidor devolve erro. O resultado (erro ou sucesso) aparece como
 * notificação no canto da tela; os erros de cada campo continuam ao lado do campo.
 */
export function ActionForm({ action, children, submitLabel, pendingLabel = "Salvando…", className, submitClassName, resetOnSuccess = false }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        const result = await action(formData);
        setState(result ?? {});
        if (result?.error) {
          toast("error", result.error);
          // Algumas operações gravam algo antes de falhar (ex.: publicação salva que o Instagram recusou):
          // nesse caso a action indica para onde levar a pessoa, para ela não repetir o envio.
          if (result.redirectTo) router.push(result.redirectTo);
        }
        if (result?.ok) {
          toast("success", result.message);
          if (resetOnSuccess) form.reset();
          if (result.redirectTo) router.push(result.redirectTo);
          router.refresh();
        }
      } catch {
        setState({});
        toast("error", "Não foi possível falar com o servidor. Verifique a conexão e tente novamente.");
      }
    });
  }

  return (
    <FormStateContext.Provider value={state}>
      <form onSubmit={onSubmit} className={className} noValidate>
        {children}
        <div className="mt-6">
          <button type="submit" className={submitClassName ?? "btn btn-primary"} disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </button>
        </div>
      </form>
    </FormStateContext.Provider>
  );
}
