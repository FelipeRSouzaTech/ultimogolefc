import type { ReactNode } from "react";
import { FieldError } from "./action-form";

type Props = {
  name: string;
  /** Id do controle, quando difere de `name` (formulários repetidos na mesma página). */
  id?: string;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

/** Agrupa rótulo, controle, dica e erro. O controle filho deve usar o mesmo id (por padrão, `name`). */
export function Field({ name, id, label, hint, children, className }: Props) {
  return (
    <div className={className}>
      <label className="label" htmlFor={id ?? name}>
        {label}
      </label>
      {children}
      {hint ? <p className="hint">{hint}</p> : null}
      <FieldError name={name} />
    </div>
  );
}
