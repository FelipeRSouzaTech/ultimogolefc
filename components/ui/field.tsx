import type { ReactNode } from "react";
import { FieldError } from "./action-form";

type Props = {
  name: string;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

/** Agrupa rótulo, controle, dica e erro. O controle filho deve usar id={name}. */
export function Field({ name, label, hint, children, className }: Props) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      {children}
      {hint ? <p className="hint">{hint}</p> : null}
      <FieldError name={name} />
    </div>
  );
}
