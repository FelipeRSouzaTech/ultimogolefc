"use client";

import { createContext, useContext, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionState, FormAction } from "@/lib/action";

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
};

/**
 * Formulário ligado a uma Server Action.
 * Mantém os valores digitados quando o servidor devolve erro e exibe as mensagens de forma acessível.
 */
export function ActionForm({ action, children, submitLabel, pendingLabel = "Salvando…", className, submitClassName }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await action(formData);
        setState(result ?? {});
        if (result?.ok) {
          if (result.redirectTo) router.push(result.redirectTo);
          router.refresh();
        }
      } catch {
        setState({ error: "Não foi possível falar com o servidor. Verifique a conexão e tente novamente." });
      }
    });
  }

  return (
    <FormStateContext.Provider value={state}>
      <form onSubmit={onSubmit} className={className} noValidate>
        {state.error ? (
          <p className="alert alert-error mb-4" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.ok && state.message ? (
          <p className="alert alert-info mb-4" role="status">
            {state.message}
          </p>
        ) : null}
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
