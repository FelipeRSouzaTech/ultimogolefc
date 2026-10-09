"use client";

import { ActionForm, FieldError } from "@/components/ui/action-form";
import type { FormAction } from "@/lib/action";

export function ContactForm({ action }: { action: FormAction }) {
  return (
    <ActionForm action={action} submitLabel="Enviar mensagem" pendingLabel="Enviando…" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Nome
          </label>
          <input id="name" name="name" className="input" autoComplete="name" required maxLength={120} />
          <FieldError name="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" required maxLength={254} />
          <FieldError name="email" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="subject">
          Assunto
        </label>
        <input id="subject" name="subject" className="input" required maxLength={150} />
        <FieldError name="subject" />
      </div>
      <div>
        <label className="label" htmlFor="message">
          Mensagem
        </label>
        <textarea id="message" name="message" className="input" rows={6} required maxLength={5000} />
        <FieldError name="message" />
      </div>
      {/* Campo-armadilha: fora da tela e da navegação por teclado; pessoas não o preenchem. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor="website">Não preencha este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
    </ActionForm>
  );
}
