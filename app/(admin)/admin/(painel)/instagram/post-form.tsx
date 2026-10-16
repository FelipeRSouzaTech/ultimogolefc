"use client";

import { useState, type ReactNode } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { ImageField } from "@/components/ui/image-field";
import { SmartImage } from "@/components/ui/smart-image";
import type { FormAction } from "@/lib/action";
import {
  CAPTION_MAX_CHARS,
  countHashtags,
  INSTAGRAM_FORMAT_LABELS,
  INSTAGRAM_FORMAT_SIZES,
  INSTAGRAM_FORMATS,
  isJpegPath,
  type InstagramFormat,
  type InstagramWhen,
} from "@/modules/instagram/rules";

type Values = { format: InstagramFormat; imagePath: string; caption: string | null; scheduledAtLocal: string | null };

type Props = {
  action: FormAction;
  values?: Values;
  /** A integração está configurada neste ambiente (sem isso, "Publicar agora" fica desabilitado). */
  configured: boolean;
  accountLabel: string;
};

const WHEN_OPTIONS: { value: InstagramWhen; label: string }[] = [
  { value: "SCHEDULE", label: "Agendar" },
  { value: "NOW", label: "Publicar agora" },
  { value: "DRAFT", label: "Salvar rascunho" },
];

const SUBMIT_LABELS: Record<InstagramWhen, { label: string; pending: string }> = {
  SCHEDULE: { label: "Agendar publicação", pending: "Agendando…" },
  NOW: { label: "Publicar agora", pending: "Publicando… (pode levar alguns segundos)" },
  DRAFT: { label: "Salvar rascunho", pending: "Salvando…" },
};

function Choice({ name, value, checked, disabled, onSelect, children }: { name: string; value: string; checked: boolean; disabled?: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
        checked ? "border-primary bg-primary text-white" : "border-gray-400 bg-white text-primary hover:border-primary"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onSelect} className="sr-only" />
      {children}
    </label>
  );
}

function Preview({ format, imagePath, caption, accountLabel }: { format: InstagramFormat; imagePath: string; caption: string; accountLabel: string }) {
  const showImage = /^\/[A-Za-z0-9._\-/]+\.(png|jpg|jpeg|webp)$/.test(imagePath);
  const image = showImage ? (
    <SmartImage src={imagePath} alt="Imagem da publicação" width={1080} height={format === "FEED" ? 1350 : 1920} className="h-full w-full object-cover" />
  ) : (
    <span className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-white/80">A imagem escolhida aparece aqui</span>
  );
  const handle = accountLabel.replace(/^@/, "");

  if (format === "STORY") {
    return (
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[18rem] overflow-hidden rounded-xl bg-primary">
        {image}
        <div className="absolute inset-x-0 top-0 space-y-2 bg-black/40 p-3">
          <div className="h-0.5 rounded bg-white/90" />
          <p className="text-xs font-semibold text-white">{handle}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[20rem] overflow-hidden rounded-md border border-gray-100 bg-white">
      <p className="px-3 py-2 text-sm font-bold">{handle}</p>
      <div className="aspect-[4/5] w-full bg-primary">{image}</div>
      <p className="line-clamp-3 whitespace-pre-line px-3 py-3 text-sm">
        <strong>{handle}</strong> {caption || <span className="text-gray-600">Sem legenda</span>}
      </p>
    </div>
  );
}

export function InstagramPostForm({ action, values, configured, accountLabel }: Props) {
  const [format, setFormat] = useState<InstagramFormat>(values?.format ?? "FEED");
  const [imagePath, setImagePath] = useState(values?.imagePath ?? "");
  const [caption, setCaption] = useState(values?.caption ?? "");
  const [when, setWhen] = useState<InstagramWhen>(values && !values.scheduledAtLocal ? "DRAFT" : "SCHEDULE");
  const submit = SUBMIT_LABELS[when];
  const notJpeg = imagePath !== "" && !isJpegPath(imagePath);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <ActionForm action={action} submitLabel={submit.label} pendingLabel={submit.pending} className="space-y-6">
        <fieldset>
          <legend className="label">Formato</legend>
          <div className="flex flex-wrap gap-2">
            {INSTAGRAM_FORMATS.map((item) => (
              <Choice key={item} name="format" value={item} checked={format === item} onSelect={() => setFormat(item)}>
                {INSTAGRAM_FORMAT_LABELS[item]} · {item === "FEED" ? "4:5" : "9:16"}
              </Choice>
            ))}
          </div>
        </fieldset>

        <div>
          <ImageField
            name="imagePath"
            label="Imagem"
            defaultValue={values?.imagePath}
            onChange={setImagePath}
            hint={`JPG, até 5 MB. Tamanho recomendado: ${INSTAGRAM_FORMAT_SIZES[format]}.`}
          />
          {notJpeg ? <p className="field-error">O Instagram só aceita JPEG. Envie a imagem em .jpg.</p> : null}
        </div>

        {format === "FEED" ? (
          <Field name="caption" label="Legenda" hint={`${caption.length.toLocaleString("pt-BR")} / ${CAPTION_MAX_CHARS.toLocaleString("pt-BR")} caracteres · ${countHashtags(caption)} / 30 hashtags`}>
            <textarea id="caption" name="caption" className="input" rows={7} value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={CAPTION_MAX_CHARS} />
          </Field>
        ) : (
          <p className="alert alert-info">
            <strong>Story não leva legenda.</strong> Pela API do Instagram, stories são publicados só com a imagem. Coloque o texto na própria arte.
          </p>
        )}

        <fieldset className="space-y-3">
          <legend className="label">Quando publicar</legend>
          <div className="flex flex-wrap gap-2">
            {WHEN_OPTIONS.map((option) => (
              <Choice key={option.value} name="when" value={option.value} checked={when === option.value} disabled={option.value === "NOW" && !configured} onSelect={() => setWhen(option.value)}>
                {option.label}
              </Choice>
            ))}
          </div>
          {when === "SCHEDULE" ? (
            <Field name="scheduledAt" label="Data e horário" hint="Horário de Brasília. O agendador confere a fila a cada 5 minutos.">
              <input id="scheduledAt" name="scheduledAt" type="datetime-local" className="input max-w-xs" defaultValue={values?.scheduledAtLocal ?? ""} required />
            </Field>
          ) : null}
          {!configured ? <p className="hint">&quot;Publicar agora&quot; fica disponível quando a conta do Instagram estiver configurada neste ambiente.</p> : null}
        </fieldset>
      </ActionForm>

      <section aria-label="Prévia" className="space-y-3">
        <p className="text-sm font-semibold text-gray-600">Prévia no Instagram</p>
        <Preview format={format} imagePath={imagePath} caption={caption} accountLabel={accountLabel} />
      </section>
    </div>
  );
}
