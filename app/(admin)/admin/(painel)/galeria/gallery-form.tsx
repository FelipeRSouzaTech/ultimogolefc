import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import type { FormAction } from "@/lib/action";
import { utcToSaoPauloLocal } from "@/lib/datetime";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS } from "@/modules/gallery/rules";

type Values = { title: string; description: string | null; category: string; eventDate: Date | null; isPublished: boolean };

export function GalleryForm({ action, values }: { action: FormAction; values?: Values }) {
  return (
    <ActionForm action={action} submitLabel="Salvar álbum" className="space-y-4">
      <Field name="title" label="Título">
        <input id="title" name="title" className="input" defaultValue={values?.title} required maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="category" label="Categoria">
          <select id="category" name="category" className="input" defaultValue={values?.category ?? "MATCH"}>
            {GALLERY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {GALLERY_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="eventDate" label="Data do evento" hint="Opcional.">
          <input id="eventDate" name="eventDate" type="date" className="input" defaultValue={values?.eventDate ? utcToSaoPauloLocal(values.eventDate).slice(0, 10) : ""} />
        </Field>
      </div>
      <Field name="description" label="Descrição" hint="Opcional.">
        <textarea id="description" name="description" className="input" rows={3} defaultValue={values?.description ?? ""} />
      </Field>
      <label className="flex items-start gap-2 text-sm font-semibold">
        <input type="checkbox" name="isPublished" defaultChecked={values?.isPublished ?? false} className="mt-0.5 size-4 accent-primary" />
        <span>
          Publicado no portal
          <span className="block font-normal text-gray-600">Desmarque para arquivar o álbum sem apagar as fotos. Publique só imagens com autorização de uso.</span>
        </span>
      </label>
    </ActionForm>
  );
}
