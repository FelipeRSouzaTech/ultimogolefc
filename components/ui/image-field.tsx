"use client";

import { useRef, useState, useTransition } from "react";
import { uploadImageAction } from "@/modules/media/actions";
import { FieldError } from "./action-form";
import { SmartImage } from "./smart-image";

type Props = { name: string; label: string; defaultValue?: string | null; hint?: string };

/**
 * Campo de imagem do painel: envia um arquivo (PNG, JPG ou WebP, até 5 MB) e guarda o caminho resultante.
 * O caminho também pode ser digitado, para usar arquivos estáticos do projeto (ex.: /brand/escudo.png).
 */
export function ImageField({ name, label, defaultValue, hint }: Props) {
  const [path, setPath] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function onFileChange(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadImageAction(formData);
        if (result.ok) setPath(result.path);
        else setError(result.error);
      } catch {
        setError("Não foi possível enviar a imagem. Verifique o tamanho (até 5 MB) e tente novamente.");
      } finally {
        if (fileInput.current) fileInput.current.value = "";
      }
    });
  }

  const previewable = /^\/[A-Za-z0-9._\-/]+\.(png|jpg|jpeg|webp|svg)$/.test(path);

  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <div className="flex flex-wrap items-start gap-3">
        {previewable ? (
          <SmartImage src={path} alt="Pré-visualização" width={72} height={72} className="size-[72px] shrink-0 rounded-md border border-gray-100 bg-gray-50 object-contain" />
        ) : (
          <span aria-hidden="true" className="flex size-[72px] shrink-0 items-center justify-center rounded-md border border-dashed border-gray-400 text-xs text-gray-600">
            Sem imagem
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <input id={name} name={name} className="input" value={path} onChange={(event) => setPath(event.target.value)} maxLength={200} placeholder="Envie uma imagem ou informe o caminho" />
          <div className="flex flex-wrap gap-2">
            <label className={`btn btn-secondary btn-sm ${pending ? "pointer-events-none" : ""}`} aria-disabled={pending}>
              {pending ? "Enviando…" : "Enviar imagem"}
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={pending}
                onChange={(event) => onFileChange(event.target.files?.[0])}
              />
            </label>
            {path ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPath("")}>
                Remover
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <p className="hint">{hint ?? "PNG, JPG ou WebP, até 5 MB."}</p>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <FieldError name={name} />
    </div>
  );
}
