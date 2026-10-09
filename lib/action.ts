import type { ZodError } from "zod";

/** Resultado padronizado das Server Actions do painel. */
export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  redirectTo?: string;
};

export type FormAction = (formData: FormData) => Promise<ActionState>;

/** Erro de regra de negócio cuja mensagem pode ser mostrada ao usuário. */
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

export function zodErrorState(error: ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { error: "Revise os campos destacados.", fieldErrors };
}

/** Lê um campo de texto do FormData; devolve string vazia quando ausente. */
export function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
