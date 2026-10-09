import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { ImageField } from "@/components/ui/image-field";
import type { FormAction } from "@/lib/action";
import { utcToSaoPauloLocal } from "@/lib/datetime";
import { NEWS_STATUSES, NEWS_STATUS_LABELS } from "@/modules/news/rules";

type Values = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  status: string;
  publishedAt: Date | null;
  categoryId: string | null;
  authorName: string | null;
  coverPath: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type Props = {
  action: FormAction;
  categories: { id: string; name: string }[];
  canPublish: boolean;
  values?: Values;
  defaultAuthor?: string;
};

export function NewsForm({ action, categories, canPublish, values, defaultAuthor }: Props) {
  const statuses = canPublish ? NEWS_STATUSES : NEWS_STATUSES.filter((status) => status === "DRAFT");
  return (
    <ActionForm action={action} submitLabel="Salvar notícia" className="space-y-5">
      <Field name="title" label="Título">
        <input id="title" name="title" className="input" defaultValue={values?.title} required maxLength={160} />
      </Field>
      <Field name="slug" label="Endereço (slug)" hint="Opcional. Se ficar vazio, é gerado a partir do título. Use letras minúsculas, números e hífens.">
        <input id="slug" name="slug" className="input" defaultValue={values?.slug} maxLength={96} />
      </Field>
      <Field name="summary" label="Resumo" hint="Aparece nas listagens e como descrição padrão em buscadores.">
        <textarea id="summary" name="summary" className="input" rows={3} defaultValue={values?.summary} required maxLength={300} />
      </Field>
      <ImageField name="coverPath" label="Imagem de capa" defaultValue={values?.coverPath} hint="Opcional. Imagem horizontal (ex.: 1600×900), PNG, JPG ou WebP, até 5 MB." />
      <Field name="content" label="Conteúdo" hint='Separe os parágrafos com uma linha em branco. Para subtítulos, comece a linha com "## ". HTML não é interpretado.'>
        <textarea id="content" name="content" className="input" rows={16} defaultValue={values?.content} required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="categoryId" label="Categoria">
          <select id="categoryId" name="categoryId" className="input" defaultValue={values?.categoryId ?? ""}>
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field name="authorName" label="Autor (assinatura)" hint="Nome exibido na notícia. Opcional.">
          <input id="authorName" name="authorName" className="input" defaultValue={values?.authorName ?? defaultAuthor ?? ""} maxLength={120} />
        </Field>
        <Field name="status" label="Estado" hint={canPublish ? undefined : "Seu perfil permite salvar apenas rascunhos."}>
          <select id="status" name="status" className="input" defaultValue={values?.status ?? "DRAFT"}>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {NEWS_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="publishedAt" label="Data de publicação" hint="Horário de Brasília. Vazio = publica agora. Data futura = agendamento.">
          <input
            id="publishedAt"
            name="publishedAt"
            type="datetime-local"
            className="input"
            defaultValue={values?.publishedAt ? utcToSaoPauloLocal(values.publishedAt) : ""}
            disabled={!canPublish}
          />
        </Field>
      </div>
      <fieldset className="space-y-5 rounded-lg border border-gray-100 p-4">
        <legend className="px-2 text-sm font-bold uppercase tracking-wider text-gray-600">SEO (opcional)</legend>
        <Field name="seoTitle" label="Título para buscadores" hint="Até 70 caracteres. Se vazio, usa o título.">
          <input id="seoTitle" name="seoTitle" className="input" defaultValue={values?.seoTitle ?? ""} maxLength={70} />
        </Field>
        <Field name="seoDescription" label="Descrição para buscadores" hint="Até 170 caracteres. Se vazia, usa o resumo.">
          <textarea id="seoDescription" name="seoDescription" className="input" rows={2} defaultValue={values?.seoDescription ?? ""} maxLength={170} />
        </Field>
      </fieldset>
    </ActionForm>
  );
}
